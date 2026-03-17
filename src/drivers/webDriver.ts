import { chromium, Browser, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import type { Driver, TestStep, StepResult } from '../types/index';
import { resolveElement, smartWait, withRetry, detectFramework } from '../engine/smartSelector';

export class WebDriver implements Driver {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private screenshotDir: string;
  private headless: boolean;
  private authUser: string | undefined;
  private authPass: string | undefined;
  private framework: string[] = [];
  private readonly FAILURE_INDICATORS = [
    're-captcha', 'recaptcha', 'captcha', 'bot detection', 'verify you are human', 'no soy un robot',
    'invalid credentials', 'login failed', 'incorrect username', 'incorrect password',
    'authentication failed', 'error has occurred', 'page not found', '404 not found',
    'access denied', 'forbidden', 'try again', 'inválido', 'incorrecto', 'reintente', 'falló'
  ];

  constructor(options: { screenshotDir?: string; headless?: boolean; authUser?: string; authPass?: string } = {}) {
    this.screenshotDir = options.screenshotDir ?? path.join(process.cwd(), 'reports', 'screenshots');
    this.headless = options.headless ?? true;
    this.authUser = options.authUser;
    this.authPass = options.authPass;
    fs.mkdirSync(this.screenshotDir, { recursive: true });
  }

  async launch(url: string): Promise<void> {
    this.browser = await chromium.launch({
      headless: this.headless,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    let cleanUrl = url;
    let username = this.authUser;
    let password = this.authPass;

    try {
      const parsed = new URL(url);
      if (parsed.username) {
        if (!username) username = decodeURIComponent(parsed.username);
        if (!password) password = decodeURIComponent(parsed.password);
        parsed.username = ''; parsed.password = '';
        cleanUrl = parsed.toString();
      }
    } catch {}

    const httpCredentials = (username || password)
      ? { username: username ?? '', password: password ?? '' }
      : undefined;

    console.log(`[WebDriver] launching ${cleanUrl} — auth: ${httpCredentials ? `YES (${username})` : 'NO'}`);

    const context = await this.browser.newContext({
      viewport: { width: 1280, height: 800 },
      httpCredentials,
      // Appear more like a real browser
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    this.page = await context.newPage();

    // Stealth: remove automation signals
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    await this.page.goto(cleanUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await smartWait(this.page);

    // Detect framework for smarter handling
    this.framework = await detectFramework(this.page);
    if (this.framework.length) console.log(`[WebDriver] detected: ${this.framework.join(', ')}`);

    if (!this.headless) await this.injectOverlay('Initialising test...');
  }

  async executeStep(step: TestStep): Promise<StepResult> {
    if (!this.page) throw new Error('WebDriver not launched');
    const start = Date.now();

    if (!this.headless) await this.updateOverlay(`▶ ${step.description}`, 'running');

    try {
      const result = await withRetry(() => this._run(step), 3, step.description);

      if (!this.headless) {
        await this.updateOverlay(`✓ ${step.description}`, 'passed');
        await this.page.waitForTimeout(250);
      }
      return { 
        step, 
        status: 'passed', 
        durationMs: Date.now() - start,
        screenshotPath: typeof result === 'string' ? result : undefined 
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const screenshotPath = await this._captureErrorScreenshot(step.action);
      if (!this.headless) {
        await this.updateOverlay(`✗ ${step.description}`, 'failed');
        await this.page.waitForTimeout(600);
      }
      console.error(`[WebDriver] Step FAILED: ${step.description} - ${errMsg}`);
      return { step, status: 'failed', durationMs: Date.now() - start, error: errMsg, screenshotPath };
    }
  }

  private async _run(step: TestStep): Promise<string | void> {
    const p = this.page!;

    switch (step.action) {

      case 'navigate': {
        let navUrl = step.value!;
        try {
          const parsed = new URL(navUrl);
          parsed.username = ''; parsed.password = '';
          navUrl = parsed.toString();
        } catch {}
        await p.goto(navUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await smartWait(p);
        await this.checkForFailures(`navigation to ${navUrl}`);
        break;
      }

      case 'click': {
        const { locator } = await resolveElement(p, step.target!, { timeout: 10000, retries: 3 });
        await locator.scrollIntoViewIfNeeded();
        // Small random delay to avoid anti-bot detection
        await p.waitForTimeout(100 + Math.random() * 200);
        await locator.click({ timeout: 8000 });
        await smartWait(p, step.description);
        await this.checkForFailures(step.description);
        break;
      }

      case 'fill': {
        const fillTarget = step.target!;
        const fillValue = step.value ?? '';
        try {
          const { locator } = await resolveElement(p, fillTarget, { timeout: 8000, retries: 3 });
          await locator.scrollIntoViewIfNeeded();
          await locator.click({ clickCount: 3 }); // select all first
          await locator.fill(fillValue);
        } catch {
          // Fallback: JS direct injection for React/Vue controlled inputs
          await p.evaluate(({ sel, val }: { sel: string; val: string }) => {
            const el = document.querySelector(sel) as HTMLInputElement;
            if (!el) throw new Error(`Fill: element not found: ${sel}`);
            const nativeInputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
            nativeInputSetter?.call(el, val);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }, { sel: fillTarget, val: fillValue });
        }
        break;
      }

      case 'select': {
        const { locator } = await resolveElement(p, step.target!, { timeout: 8000 });
        await locator.selectOption(step.value ?? '');
        break;
      }

      case 'hover': {
        const { locator } = await resolveElement(p, step.target!, { timeout: 8000 });
        await locator.hover();
        break;
      }

      case 'scroll':
        if (step.target) {
          try {
            const { locator } = await resolveElement(p, step.target, { timeout: 5000 });
            await locator.scrollIntoViewIfNeeded();
          } catch {
            await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          }
        } else {
          await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        }
        break;

      case 'wait': {
        const ms = Number(step.value ?? 1000);
        if (ms <= 500) {
          await p.waitForTimeout(ms);
        } else {
          // Smart wait: try network idle first, fall back to fixed timeout
          await Promise.race([
            p.waitForLoadState('networkidle', { timeout: ms }),
            p.waitForTimeout(ms),
          ]).catch(() => {});
        }
        break;
      }

      case 'assert_visible': {
        const { locator } = await resolveElement(p, step.target!, { timeout: 10000, retries: 3 });
        const visible = await locator.isVisible();
        if (!visible) throw new Error(`Element "${step.target}" is not visible`);
        break;
      }

      case 'assert_text': {
        const { locator } = await resolveElement(p, step.target!, { timeout: 10000, retries: 2 });
        const text = await locator.innerText();
        if (!text.toLowerCase().includes((step.value ?? '').toLowerCase())) {
          throw new Error(`Expected text "${step.value}" but found "${text.slice(0, 100)}"`);
        }
        break;
      }

      case 'assert_url': {
        // Wait for URL to change (up to 5s) before asserting
        try {
          await p.waitForURL(`**${step.value}**`, { timeout: 5000 });
        } catch {}
        const current = p.url();
        if (!current.includes(step.value ?? '')) {
          throw new Error(`Expected URL to contain "${step.value}" but got "${current}"`);
        }
        break;
      }

      case 'assert_title': {
        const title = await p.title();
        if (!title.toLowerCase().includes((step.value ?? '').toLowerCase())) {
          throw new Error(`Expected title to contain "${step.value}" but got "${title}"`);
        }
        break;
      }

      case 'screenshot':
        return await this._captureScreenshot(step.description);

      default:
        throw new Error(`Unknown action: ${step.action}`);
    }
  }

  // ── Overlay ──────────────────────────────────────────────────────────────────

  private async injectOverlay(message: string): Promise<void> {
    try {
      await this.page!.evaluate((msg: string) => {
        document.getElementById('__tp_overlay')?.remove();
        document.getElementById('__tp_dim')?.remove();
        const style = document.createElement('style');
        style.textContent = '@keyframes tppulse{0%,100%{opacity:1}50%{opacity:.2}}';
        const overlay = document.createElement('div');
        overlay.id = '__tp_overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;background:#0f0f0f;color:#c8f069;font-family:monospace;font-size:13px;padding:10px 20px;display:flex;align-items:center;gap:10px;border-bottom:2px solid #c8f069;pointer-events:none';
        const dot = document.createElement('span');
        dot.id = '__tp_dot';
        dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:#c8f069;animation:tppulse 1s ease-in-out infinite;flex-shrink:0';
        const label = document.createElement('span');
        label.style.cssText = 'color:#555;margin-right:4px';
        label.textContent = 'TestPilot AI';
        const text = document.createElement('span');
        text.id = '__tp_msg';
        text.textContent = msg;
        const dim = document.createElement('div');
        dim.id = '__tp_dim';
        dim.style.cssText = 'position:fixed;inset:0;z-index:999998;background:rgba(0,0,0,0.12);pointer-events:none';
        overlay.appendChild(style); overlay.appendChild(dot); overlay.appendChild(label); overlay.appendChild(text);
        document.body.appendChild(dim); document.body.appendChild(overlay);
      }, message);
    } catch {}
  }

  private async updateOverlay(message: string, status: 'running' | 'passed' | 'failed'): Promise<void> {
    try {
      await this.page!.evaluate(({ msg, st }: { msg: string; st: string }) => {
        const el = document.getElementById('__tp_msg');
        if (el) el.textContent = msg;
        const colors: Record<string, string> = { running: '#c8f069', passed: '#4ade80', failed: '#f87171' };
        const overlay = document.getElementById('__tp_overlay');
        const dot = document.getElementById('__tp_dot');
        if (overlay) overlay.style.color = colors[st] ?? '#c8f069';
        if (dot) dot.style.background = colors[st] ?? '#c8f069';
      }, { msg: message, st: status });
    } catch {}
  }

  private async removeOverlay(): Promise<void> {
    try {
      await this.page!.evaluate(() => {
        document.getElementById('__tp_overlay')?.remove();
        document.getElementById('__tp_dim')?.remove();
      });
    } catch {}
  }

  private async checkForFailures(context: string): Promise<void> {
    if (!this.page) return;
    const p = this.page;
    
    try {
      const frames = p.frames();
      console.log(`[WebDriver] Scanning ${frames.length} frames for failures during: ${context}`);

      for (const frame of frames) {
        try {
          const frameUrl = frame.url().trim().toLowerCase();
          if (!frameUrl || frameUrl === 'about:blank') continue;
          
          // Check for CAPTCHA iframes directly via URL
          if (frameUrl.includes('google.com/recaptcha') || frameUrl.includes('hcaptcha.com') || frameUrl.includes('geetest.com')) {
            console.warn(`[WebDriver] CAPTCHA IFRAME DETECTED: ${frameUrl}`);
            throw new Error(`Critical blocker detected: CAPTCHA/Bot protection iframe found during ${context}.`);
          }

          // Get text content of the frame with a SHORT timeout (1s) to avoid 30s hangs
          const text = (await frame.innerText('body', { timeout: 1000 }).catch(() => '')).toLowerCase();
          if (!text) continue;
          
          for (const indicator of this.FAILURE_INDICATORS) {
            if (text.includes(indicator)) {
              // For CAPTCHA/Robot checks, fail immediately if found anywhere
              if (indicator.includes('captcha') || indicator.includes('human') || indicator.includes('robot') || indicator.includes('bot')) {
                console.warn(`[WebDriver] BLOCKER DETECTED in frame text: "${indicator}"`);
                throw new Error(`Critical blocker detected: "${indicator}" during ${context}. Please check the page for CAPTCHAs or bot protection.`);
              }

              // For generic errors, check if they are actually visible
              const visible = await frame.evaluate((ind: string) => {
                const bodyText = document.body.innerText.toLowerCase();
                if (!bodyText.includes(ind)) return false;
                const errorEls = Array.from(document.querySelectorAll('.error, .alert, .message-error, .fail, #captcha, .g-recaptcha, [class*="error"], [class*="alert"]'));
                return errorEls.some(el => {
                  const style = window.getComputedStyle(el);
                  return style.display !== 'none' && style.visibility !== 'hidden' && (el as HTMLElement).offsetParent !== null;
                });
              }, indicator).catch(() => false);

              if (visible) {
                console.warn(`[WebDriver] FAILURE DETECTED: "${indicator}" visible in frame`);
                throw new Error(`Failure detected: "${indicator}" during ${context}. Please check for error messages.`);
              }
            }
          }
        } catch (frameErr) {
          // Re-throw our detected failure errors, ignore other frame access errors
          if (frameErr instanceof Error && (frameErr.message.includes('blocker detected') || frameErr.message.includes('Failure detected'))) {
             throw frameErr;
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && (err.message.includes('blocker detected') || err.message.includes('Failure detected'))) {
        throw err;
      }
      console.error(`[WebDriver] Error during failure check: ${err}`);
    }
  }

  // ── Screenshots ───────────────────────────────────────────────────────────────

  private async _captureScreenshot(label: string): Promise<string> {
    const name = `${Date.now()}-${label.replace(/\s+/g, '-').slice(0, 40)}.png`;
    const filePath = path.join(this.screenshotDir, name);
    await this.page!.screenshot({ path: filePath, fullPage: true });
    return filePath;
  }

  private async _captureErrorScreenshot(action: string): Promise<string | undefined> {
    try { return await this._captureScreenshot(`error-${action}`); } catch { return undefined; }
  }

  async close(): Promise<void> {
    if (!this.headless && this.page) {
      await this.updateOverlay('Test complete', 'passed');
      await this.page.waitForTimeout(1000);
      await this.removeOverlay();
    }
    await this.browser?.close();
    this.browser = null;
    this.page = null;
  }
}