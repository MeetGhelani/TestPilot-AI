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
  await activeContext.addInitScript(`
    (function() {
      var getXPath = function(el) {
        if (el.id) return '//*[@id="' + el.id + '"]';
        var parts = [];
        var cur = el;
        while (cur && cur.nodeType === 1) { // Node.ELEMENT_NODE === 1
          var index = 0;
          var sibling = cur.previousSibling;
          while (sibling) {
            if (sibling.nodeType === 1 && sibling.tagName === cur.tagName) {
              index++;
            }
            sibling = sibling.previousSibling;
          }
          var tagName = cur.tagName.toLowerCase();
          var pathIndex = index > 0 ? '[' + (index + 1) + ']' : '';
          parts.unshift(tagName + pathIndex);
          cur = cur.parentElement;
        }
        return parts.length ? '/' + parts.join('/') : '';
      };

      var getIframePath = function() {
        if (window.self === window.top) return undefined;
        try {
          var iframes = window.parent.document.querySelectorAll('iframe');
          for (var i = 0; i < iframes.length; i++) {
            if (iframes[i].contentWindow === window) {
              return iframes[i].id ? '#' + iframes[i].id : 'iframe >> nth=' + i;
            }
          }
        } catch (e) {
          return 'cross-origin-iframe';
        }
        return 'iframe';
      };

      window.__getSmartTarget = function(el) {
        var strategies = [];
        var fallbacks = [];

        var role = el.getAttribute('role') || (el.tagName === 'BUTTON' ? 'button' : el.tagName === 'A' ? 'link' : undefined);
        var text = (el.innerText || '').trim().slice(0, 50);
        if (role && text) strategies.push('role=' + role + '[name="' + text + '"]');
        if (text && text.length > 2) strategies.push('text="' + text + '"');

        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
          var id = el.id;
          if (id) {
            try {
              var label = document.querySelector('label[for="' + CSS.escape(id) + '"]');
              if (label && label.textContent) {
                strategies.push('label="' + label.textContent.trim() + '"');
              }
            } catch(e) {}
          }
        }

        var testId = el.getAttribute('data-testid') || el.getAttribute('data-test-id') || el.getAttribute('data-qa');
        if (testId) strategies.push('[data-testid="' + testId + '"]');
        if (el.id) strategies.push('#' + CSS.escape(el.id));
        
        var classString = el.getAttribute('class') || '';
        var classes = classString.split(' ')
          .filter(function(c) { return c && !/^(active|hover|focus|open|visible|hidden|selected|is-|js-)/.test(c); })
          .slice(0, 2);
        if (classes.length) strategies.push(el.tagName.toLowerCase() + '.' + classes.join('.'));

        fallbacks.push('xpath=' + getXPath(el));

        var unique = strategies.filter(function(v, i, a) { return a.indexOf(v) === i; });
        return {
          primary: unique[0] || el.tagName.toLowerCase(),
          fallback: unique.slice(1).concat(fallbacks)
        };
      };

      var setupListeners = function() {
        window.addEventListener('click', function(e) {
          var el = e.target;
          if (!el || el === document.body || el === document.documentElement) return;
          var target = window.__getSmartTarget(el);
          var text = (el.innerText || '').trim().slice(0, 60);
          if (window.__recordClick) {
             window.__recordClick(target, text, getIframePath());
             var spin = performance.now(); while(performance.now() - spin < 60) {}
          }
        }, true);

        window.addEventListener('input', function(e) {
          var el = e.target;
          if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) return;
          var target = window.__getSmartTarget(el);
          if (window.__recordFill) window.__recordFill(target, el.value, getIframePath());
        }, true);
        
        window.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            var el = e.target;
            if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
              var target = window.__getSmartTarget(el);
              if (window.__recordPress) {
                 window.__recordPress(target, 'Enter', getIframePath());
                 var spin = performance.now(); while(performance.now() - spin < 60) {}
              }
            }
          }
        }, true);

        window.addEventListener('change', function(e) {
          var el = e.target;
          if (el.tagName !== 'SELECT') return;
          var target = window.__getSmartTarget(el);
          if (window.__recordSelect) window.__recordSelect(target, el.value, getIframePath());
        }, true);
      };

      setupListeners();
    })();
  `);

  // ── Bind explicit IPC recorders precisely per page to defeat Context Flakiness 
  const bindRecordersToPage = async (p: Page) => {
    await p.exposeFunction('__recordClick', (target: any, text: string, frame?: string) => {
      flushFill();
      const primary = typeof target === 'string' ? target : target.primary;
      const desc = text ? `Click "${text}"` : `Click ${primary}`;
      const last = liveSteps[liveSteps.length - 1];
      if (last?.action === 'click' && JSON.stringify(last.target) === JSON.stringify(target)) return; 
      pushStep({ action: 'click', target, description: desc, frame });
    }).catch(() => {});

    await p.exposeFunction('__recordFill', (target: any, value: string, frame?: string) => {
      lastFillTarget = target;
      lastFillValue = value;
      (global as any)._pendingFrame = frame;
      if (fillDebounce) clearTimeout(fillDebounce);
      fillDebounce = setTimeout(flushFill, 800);
    }).catch(() => {});

    await p.exposeFunction('__recordSelect', (target: any, value: string, frame?: string) => {
      flushFill();
      pushStep({ action: 'select', target, value, description: `Select "${value}"`, frame });
    }).catch(() => {});

    await p.exposeFunction('__recordPress', (target: any, key: string, frame?: string) => {
      flushFill(); // Force flush the fill before pressing enter
      pushStep({ action: 'press', target, value: key, description: `Press ${key}`, frame });
    }).catch(() => {});

    p.on('framenavigated', (frame) => {
      if (frame.parentFrame()) return; // skip iframes
      const navUrl = frame.url();
      if (!navUrl || navUrl === 'about:blank') return;
      const last = liveSteps[liveSteps.length - 1];
      if (last?.action === 'navigate' && last.value === navUrl) return;
      flushFill();
      pushStep({ action: 'navigate', value: navUrl, description: `Navigate to ${navUrl}` });
    });
  };

  // Auto-bind any newly opened popups/tabs
  activeContext.on('page', async (page) => {
    await bindRecordersToPage(page);
  });

  // Explicitly spawn and bind the master page
  activePage = await activeContext.newPage();
  await bindRecordersToPage(activePage);

  // Listeners are now perfectly injected globally via activeContext.addInitScript

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