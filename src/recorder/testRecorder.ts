import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import type { TestStep } from '../types/index';

export interface RecordedTest {
  id: string;
  title: string;
  url: string;
  recordedAt: string;
  steps: TestStep[];
  authUser?: string;
  authPass?: string;
  version?: number;
}

// ── In-memory live state ──────────────────────────────────────────────────────
let activeBrowser: Browser | null = null;
let activeContext: BrowserContext | null = null;
let activePage: Page | null = null;
let liveSteps: TestStep[] = [];
let isRecording = false;
let lastFillTarget: string | { primary: string; fallback: string[] } = '';
let lastFillValue = '';
let fillDebounce: ReturnType<typeof setTimeout> | null = null;
let savedAuthUser: string | undefined;
let savedAuthPass: string | undefined;

// ── Helpers ───────────────────────────────────────────────────────────────────

function pushStep(step: TestStep) {
  liveSteps.push(step);
  console.log(`[REC] ${step.description}`);
}

function flushFill() {
  if (lastFillTarget && lastFillValue) {
    const primary = typeof lastFillTarget === 'string' ? lastFillTarget : lastFillTarget.primary;
    pushStep({
      action: 'fill',
      target: lastFillTarget,
      value: lastFillValue,
      description: `Type "${lastFillValue}" into ${primary}`,
      frame: (global as any)._pendingFrame
    });
    lastFillTarget = '';
    lastFillValue = '';
    (global as any)._pendingFrame = undefined;
  }
}



// ── Start recording ───────────────────────────────────────────────────────────

export async function startRecording(url: string, authUser?: string, authPass?: string): Promise<void> {
  if (isRecording) throw new Error('Already recording. Stop current session first.');

  liveSteps = [];
  isRecording = true;
  lastFillTarget = '';
  lastFillValue = '';
  savedAuthUser = authUser;
  savedAuthPass = authPass;

  // Collect credentials: from explicit params first, then from URL
  let username = authUser;
  let password = authPass;
  let cleanUrl = url;

  try {
    const parsed = new URL(url);
    if (parsed.username) {
      if (!username) username = decodeURIComponent(parsed.username);
      if (!password) password = decodeURIComponent(parsed.password);
      parsed.username = '';
      parsed.password = '';
      cleanUrl = parsed.toString();
    }
  } catch {}

  const httpCredentials = (username || password)
    ? { username: username ?? '', password: password ?? '' }
    : undefined;

  console.log(`[Recorder] launching ${cleanUrl} — auth: ${httpCredentials ? `YES (user: ${username})` : 'NO'}`);

  activeBrowser = await chromium.launch({
    headless: false,
    args: ['--start-maximized'],
  });

  activeContext = await activeBrowser.newContext({
    viewport: null,
    httpCredentials,
  });

  // ── Reset state if browser is closed manually ────────────────────────────
  activeBrowser.on('disconnected', () => {
    if (isRecording) {
      console.log('[Recorder] Browser disconnected, stopping recording.');
      isRecording = false;
      activeBrowser = null;
      activeContext = null;
      activePage = null;
      liveSteps = [];
    }
  });

  // ── Inject selector helper into every new page ────────────────────────────
  await activeContext.addInitScript(() => {
    // Hierarchical XPath generator
    const getXPath = (el: HTMLElement): string => {
      if (el.id) return `//*[@id="${el.id}"]`;
      const parts: string[] = [];
      let cur: HTMLElement | null = el;
      while (cur && cur.nodeType === Node.ELEMENT_NODE) {
        let index = 0;
        let sibling = cur.previousSibling;
        while (sibling) {
          if (sibling.nodeType === Node.ELEMENT_NODE && (sibling as Element).tagName === cur.tagName) {
            index++;
          }
          sibling = sibling.previousSibling;
        }
        const tagName = cur.tagName.toLowerCase();
        const pathIndex = index > 0 ? `[${index + 1}]` : '';
        parts.unshift(`${tagName}${pathIndex}`);
        cur = cur.parentElement;
      }
      return parts.length ? `/${parts.join('/')}` : '';
    };

    const getIframePath = (): string | undefined => {
      if (window.self === window.top) return undefined;
      try {
        // Try to find the iframe element in the parent document that matches this window
        const iframes = window.parent.document.querySelectorAll('iframe');
        for (let i = 0; i < iframes.length; i++) {
          if (iframes[i].contentWindow === window) {
            return iframes[i].id ? `#${iframes[i].id}` : `iframe >> nth=${i}`;
          }
        }
      } catch (e) {
        // Cross-origin iframe restricted access
        return 'cross-origin-iframe';
      }
      return 'iframe';
    };

    (window as any).__getSmartTarget = (el: HTMLElement): { primary: string; fallback: string[] } => {
      const strategies: string[] = [];
      const fallbacks: string[] = [];

      // 1. Role-based (Strongest)
      const role = el.getAttribute('role') || (el.tagName === 'BUTTON' ? 'button' : el.tagName === 'A' ? 'link' : undefined);
      const text = el.innerText?.trim().slice(0, 50);
      if (role && text) {
        strategies.push(`role=${role}[name="${text}"]`);
      }

      // 2. Text-based
      if (text && text.length > 2) {
        strategies.push(`text="${text}"`);
      }

      // 3. Label-based (for inputs)
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
        const id = el.id;
        if (id) {
          const label = document.querySelector(`label[for="${id}"]`);
          if (label && label.textContent) {
            strategies.push(`label="${label.textContent.trim()}"`);
          }
        }
      }

      // 4. Data-TestID
      const testId = el.getAttribute('data-testid') || el.getAttribute('data-test-id') || el.getAttribute('data-qa');
      if (testId) {
        strategies.push(`[data-testid="${testId}"]`);
      }

      // 5. CSS ID/Class (Legacy Fallback)
      if (el.id) strategies.push(`#${CSS.escape(el.id)}`);
      
      const classes = Array.from(el.classList)
        .filter(c => !/^(active|hover|focus|open|visible|hidden|selected|is-|js-)/.test(c))
        .slice(0, 2);
      if (classes.length) strategies.push(`${el.tagName.toLowerCase()}.${classes.join('.')}`);

      // 6. XPath (Deep Fallback)
      fallbacks.push(`xpath=${getXPath(el)}`);

      // Deduplicate and prioritize
      const unique = Array.from(new Set(strategies));
      return {
        primary: unique[0] || el.tagName.toLowerCase(),
        fallback: [...unique.slice(1), ...fallbacks]
      };
    };
  });

  activePage = await activeContext.newPage();

  // ── Page event: navigation ────────────────────────────────────────────────
  activeContext.on('page', (page) => {
    page.on('framenavigated', (frame) => {
      if (frame.parentFrame()) return; // skip iframes
      const navUrl = frame.url();
      if (!navUrl || navUrl === 'about:blank') return;
      
      const last = liveSteps[liveSteps.length - 1];
      if (last?.action === 'navigate' && last.value === navUrl) return;
      flushFill();
      pushStep({ action: 'navigate', value: navUrl, description: `Navigate to ${navUrl}` });
    });
  });

  activePage.on('framenavigated', (frame) => {
    if (frame.parentFrame()) return;
    const navUrl = frame.url();
    if (!navUrl || navUrl === 'about:blank') return;
    const last = liveSteps[liveSteps.length - 1];
    if (last?.action === 'navigate' && last.value === navUrl) return;
    flushFill();
    pushStep({ action: 'navigate', value: navUrl, description: `Navigate to ${navUrl}` });
  });

  // ── Page events: clicks and inputs via CDP ────────────────────────────────
  activePage.on('load', async () => {
    try {
      // Re-attach listeners after each page load
      await activePage!.exposeFunction('__recordClick', (target: any, text: string, frame?: string) => {
        flushFill();
        const primary = typeof target === 'string' ? target : target.primary;
        const desc = text ? `Click "${text}"` : `Click ${primary}`;
        const last = liveSteps[liveSteps.length - 1];
        if (last?.action === 'click' && JSON.stringify(last.target) === JSON.stringify(target)) return; 
        pushStep({ action: 'click', target, description: desc, frame });
      }).catch(() => {});

      await activePage!.exposeFunction('__recordFill', (target: any, value: string, frame?: string) => {
        lastFillTarget = target;
        lastFillValue = value;
        // Store frame context for the pending fill
        (global as any)._pendingFrame = frame;
        if (fillDebounce) clearTimeout(fillDebounce);
        fillDebounce = setTimeout(flushFill, 800);
      }).catch(() => {});

      await activePage!.exposeFunction('__recordSelect', (target: any, value: string, frame?: string) => {
        flushFill();
        pushStep({ action: 'select', target, value, description: `Select "${value}"`, frame });
      }).catch(() => {});

      // Attach DOM listeners to all frames via script injection
      await activePage!.evaluate(() => {
        const setupListeners = () => {
          const getIframePath = (): string | undefined => {
            if (window.self === window.top) return undefined;
            try {
              const iframes = window.parent.document.querySelectorAll('iframe');
              for (let i = 0; i < iframes.length; i++) {
                if (iframes[i].contentWindow === window) {
                  return iframes[i].id ? `#${iframes[i].id}` : `iframe >> nth=${i}`;
                }
              }
            } catch { return 'iframe'; }
            return 'iframe';
          };

          document.addEventListener('click', (e) => {
            const el = e.target as HTMLElement;
            if (!el || el === document.body) return;
            const target = (window as any).__getSmartTarget(el);
            const text = el.innerText?.trim().slice(0, 60) ?? '';
            (window as any).__recordClick(target, text, getIframePath());
          }, true);

          document.addEventListener('input', (e) => {
            const el = e.target as HTMLInputElement;
            if (!el || !['INPUT', 'TEXTAREA'].includes(el.tagName)) return;
            const target = (window as any).__getSmartTarget(el);
            (window as any).__recordFill(target, el.value, getIframePath());
          }, true);

          document.addEventListener('change', (e) => {
            const el = e.target as HTMLSelectElement;
            if (el.tagName !== 'SELECT') return;
            const target = (window as any).__getSmartTarget(el);
            (window as any).__recordSelect(target, el.value, getIframePath());
          }, true);
        };

        setupListeners();
      }).catch(() => {});
    } catch {}
  });

  // Go to URL — this will trigger framenavigated
  await activePage.goto(cleanUrl, { waitUntil: 'domcontentloaded' });
}

// ── Stop recording ────────────────────────────────────────────────────────────

export async function stopRecording(title: string, outputDir: string): Promise<RecordedTest> {
  if (!isRecording) throw new Error('No active recording');

  // Flush any pending fill
  if (fillDebounce) clearTimeout(fillDebounce);
  flushFill();

  // Add final screenshot
  liveSteps.push({ action: 'screenshot', description: 'Final screenshot' });

  const finalSteps = [...liveSteps];

  try { await activeBrowser?.close(); } catch {}
  activeBrowser = null;
  activeContext = null;
  activePage = null;
  isRecording = false;
  liveSteps = [];

  const test: RecordedTest = {
    id: `rec-${Date.now()}`,
    title: title || `Recording ${new Date().toLocaleString()}`,
    url: finalSteps.find(s => s.action === 'navigate')?.value ?? '',
    recordedAt: new Date().toISOString(),
    steps: finalSteps,
    authUser: savedAuthUser,
    authPass: savedAuthPass,
    version: 1, // New version field
  };

  fs.mkdirSync(outputDir, { recursive: true });
  const all = loadRecordings(outputDir);
  all.push(test);
  fs.writeFileSync(path.join(outputDir, 'recordings.json'), JSON.stringify(all, null, 2));

  return test;
}

// ── Status (polled by UI every second) ───────────────────────────────────────

export function getRecordingStatus(): { isRecording: boolean; stepCount: number; steps: TestStep[] } {
  return { isRecording, stepCount: liveSteps.length, steps: [...liveSteps] };
}

// ── Cancel ────────────────────────────────────────────────────────────────────

export async function cancelRecording(): Promise<void> {
  if (fillDebounce) clearTimeout(fillDebounce);
  try { await activeBrowser?.close(); } catch {}
  activeBrowser = null;
  activeContext = null;
  activePage = null;
  isRecording = false;
  liveSteps = [];
  savedAuthUser = undefined;
  savedAuthPass = undefined;
}

// ── Persistence ───────────────────────────────────────────────────────────────

export function loadRecordings(outputDir: string): RecordedTest[] {
  const file = path.join(outputDir, 'recordings.json');
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
}

export function deleteRecording(id: string, outputDir: string): void {
  const all = loadRecordings(outputDir).filter(r => r.id !== id);
  fs.writeFileSync(path.join(outputDir, 'recordings.json'), JSON.stringify(all, null, 2));
}