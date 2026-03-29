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
}

// ── In-memory live state ──────────────────────────────────────────────────────
let activeBrowser: Browser | null = null;
let activeContext: BrowserContext | null = null;
let activePage: Page | null = null;
let liveSteps: TestStep[] = [];
let isRecording = false;
let lastFillTarget = '';
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
    pushStep({
      action: 'fill',
      target: lastFillTarget,
      value: lastFillValue,
      description: `Type "${lastFillValue}" into ${lastFillTarget}`,
    });
    lastFillTarget = '';
    lastFillValue = '';
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
    (window as any).__getBestSelector = (el: HTMLElement): string => {
      // Walk up from SVG/path to real clickable parent
      let target: HTMLElement = el;
      const svgTags = ['svg', 'path', 'circle', 'rect', 'g', 'use', 'polygon', 'polyline', 'line', 'ellipse'];
      while (svgTags.includes(target.tagName.toLowerCase()) && target.parentElement) {
        target = target.parentElement;
      }

      let current: HTMLElement | null = target;
      for (let i = 0; i < 5; i++) {
        if (!current) break;
        // Priority: id > data-testid > aria-label > name > placeholder > text
        if (current.id) return `#${CSS.escape(current.id)}`;
        const testId = current.getAttribute('data-testid');
        if (testId) return `[data-testid="${testId}"]`;
        const ariaLabel = current.getAttribute('aria-label');
        if (ariaLabel) return `[aria-label="${ariaLabel}"]`;
        const name = (current as HTMLInputElement).name;
        if (name) return `[name="${name}"]`;
        const placeholder = (current as HTMLInputElement).placeholder;
        if (placeholder) return `[placeholder="${placeholder}"]`;
        const tag = current.tagName.toLowerCase();
        const text = current.innerText?.trim().slice(0, 50);
        const role = current.getAttribute('role');
        if ((role === 'button' || tag === 'button' || tag === 'a') && text) {
          return `${tag}:has-text("${text}")`;
        }
        current = current.parentElement;
      }
      const classes = Array.from(target.classList)
        .filter(c => !/^(active|hover|focus|open|visible|hidden|selected|is-|js-)/.test(c))
        .slice(0, 2);
      if (classes.length) return `.${classes.join('.')}`;
      return target.tagName.toLowerCase();
    };
  });

  activePage = await activeContext.newPage();

  // ── Page event: navigation ────────────────────────────────────────────────
  activeContext.on('page', (page) => {
    page.on('framenavigated', (frame) => {
      if (frame.parentFrame()) return; // skip iframes
      const navUrl = frame.url();
      if (!navUrl || navUrl === 'about:blank') return;
      // Avoid duplicate consecutive navigate steps
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
      await activePage!.exposeFunction('__recordClick', (selector: string, text: string) => {
        flushFill();
        const desc = text ? `Click "${text}"` : `Click ${selector}`;
        const last = liveSteps[liveSteps.length - 1];
        if (last?.action === 'click' && last.target === selector) return; // skip double-click noise
        pushStep({ action: 'click', target: selector, description: desc });
      }).catch(() => {}); // already exposed

      await activePage!.exposeFunction('__recordFill', (selector: string, value: string) => {
        // Debounce: only flush after user stops typing
        lastFillTarget = selector;
        lastFillValue = value;
        if (fillDebounce) clearTimeout(fillDebounce);
        fillDebounce = setTimeout(flushFill, 800);
      }).catch(() => {});

      await activePage!.exposeFunction('__recordSelect', (selector: string, value: string) => {
        flushFill();
        pushStep({ action: 'select', target: selector, value, description: `Select "${value}" from ${selector}` });
      }).catch(() => {});

      // Attach DOM listeners
      await activePage!.evaluate(() => {
        document.addEventListener('click', (e) => {
          const el = e.target as HTMLElement;
          if (!el || el === document.body) return;
          const selector = (window as any).__getBestSelector(el);
          const text = el.innerText?.trim().slice(0, 60) ?? '';
          (window as any).__recordClick(selector, text);
        }, true);

        document.addEventListener('input', (e) => {
          const el = e.target as HTMLInputElement;
          if (!el || !['INPUT', 'TEXTAREA'].includes(el.tagName)) return;
          const selector = (window as any).__getBestSelector(el);
          (window as any).__recordFill(selector, el.value);
        }, true);

        document.addEventListener('change', (e) => {
          const el = e.target as HTMLSelectElement;
          if (el.tagName !== 'SELECT') return;
          const selector = (window as any).__getBestSelector(el);
          (window as any).__recordSelect(selector, el.value);
        }, true);
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