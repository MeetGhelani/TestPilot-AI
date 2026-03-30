import { chromium, Browser, BrowserContext, Page, Locator } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import type { Driver, TestStep, StepResult } from '../types/index';
import { resolveElement, smartWait, withRetry, detectFramework } from '../engine/smartSelector';

export class WebDriver implements Driver {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private screenshotDir: string;
  private headless: boolean;
  private authUser: string | undefined;
  private authPass: string | undefined;
  private framework: string[] = [];
  private networkErrors: Array<{ url: string; status: number; statusText: string }> = [];

  private readonly FAILURE_INDICATORS = [
    're-captcha', 'recaptcha', 'captcha', 'bot detection', 'verify you are human',
    'invalid credentials', 'incorrect username', 'incorrect password',
    'error has occurred', '404 not found', 'access denied'
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

    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 800 },
      httpCredentials: this.authUser ? { username: this.authUser, password: this.authPass || '' } : undefined,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    });

    this.page = await this.context.newPage();

    // Network Monitoring
    this.page.on('response', (response) => {
      if (response.status() >= 400) {
        this.networkErrors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
        });
      }
    });

    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await smartWait(this.page);
    this.framework = await detectFramework(this.page);

    if (!this.headless) await this.injectOverlay('Initialising test...');
  }

  async executeStep(step: TestStep): Promise<StepResult> {
    if (!this.page) throw new Error('WebDriver not launched');
    const start = Date.now();
    this.networkErrors = []; // Clear for this specific step

    if (!this.headless) await this.updateOverlay(`▶ ${step.description}`, 'running');

    try {
      const runResult = await withRetry(() => this._run(step), step.retries || 2, step.description);

      if (!this.headless) {
        await this.updateOverlay(`✓ ${step.description}`, 'passed');
        await this.page.waitForTimeout(200);
      }

      return {
        step,
        status: 'passed',
        durationMs: Date.now() - start,
        screenshotPath: typeof runResult === 'string' ? runResult : undefined,
        networkErrors: [...this.networkErrors],
        selectionTrace: (runResult as any)?.trace,
      };
    } catch (err: any) {
      const errMsg = err.message || String(err);
      const screenshotPath = await this._captureErrorScreenshot(step.action);
      
      if (!this.headless) await this.updateOverlay(`✗ ${step.description}`, 'failed');
      
      return { 
        step, 
        status: 'failed', 
        durationMs: Date.now() - start, 
        error: errMsg, 
        screenshotPath,
        networkErrors: [...this.networkErrors]
      };
    }
  }

  private async _run(step: TestStep): Promise<any> {
    const p = this.page!;
    const timeout = step.timeout || 10000;

    switch (step.action) {
      case 'navigate':
        await p.goto(step.value!, { waitUntil: 'networkidle', timeout: 30000 });
        await smartWait(p);
        await this.checkForFailures(`navigation to ${step.value}`);
        break;

      case 'click':
      case 'fill':
      case 'press':
      case 'select':
      case 'hover': {
        const { locator, selectionTrace } = await resolveElement(p, step.target!, { 
          timeout, 
          frame: step.frame 
        });
        
        await this.highlight(locator, 'target');
        
        if (step.action === 'click') {
          await locator.click({ timeout: 5000 });
        } else if (step.action === 'fill') {
          await locator.fill(step.value || '');
        } else if (step.action === 'press') {
          await locator.press(step.value || 'Enter');
        } else if (step.action === 'select') {
          await locator.selectOption(step.value || '');
        } else if (step.action === 'hover') {
          await locator.hover();
        }

        await this.highlight(locator, 'success');
        await smartWait(p);
        await this.checkForFailures(step.description);
        return { trace: selectionTrace };
      }

      case 'assert':
      case 'assert_visible':
      case 'assert_text':
      case 'assert_url':
        return await this._handleAssertion(step);

      case 'wait':
        await p.waitForTimeout(Number(step.value || 1000));
        break;

      case 'screenshot':
        return await this._captureScreenshot(step.description);

      default:
        throw new Error(`Unknown action: ${step.action}`);
    }
  }

  private async _handleAssertion(step: TestStep): Promise<void> {
    const p = this.page!;
    const type = step.assertType || (step.action.replace('assert_', '') as any);

    if (type === 'url') {
      const current = p.url();
      if (!current.includes(step.value || '')) {
        throw new Error(`URL assertion failed: expected "${step.value}" in "${current}"`);
      }
    } else if (type === 'visible' || type === 'text') {
      const { locator } = await resolveElement(p, step.target!, { timeout: 5000, frame: step.frame });
      await this.highlight(locator, 'info');
      
      if (type === 'visible') {
        const isVisible = await locator.isVisible();
        if (!isVisible) throw new Error(`Assertion failed: element is not visible`);
      } else {
        const text = await locator.innerText();
        if (!text.toLowerCase().includes((step.value || '').toLowerCase())) {
          throw new Error(`Assertion failed: expected "${step.value}" found "${text}"`);
        }
      }
    }
  }

  private async highlight(locator: Locator, type: 'target' | 'success' | 'info' | 'error') {
    if (this.headless) return;
    const colors = { target: '#c8f069', success: '#4ade80', info: '#60a5fa', error: '#f87171' };
    try {
      await locator.evaluate((el, color) => {
        const original = el.style.outline;
        el.style.outline = `3px solid ${color}`;
        el.style.outlineOffset = '2px';
        setTimeout(() => el.style.outline = original, 1000);
      }, colors[type]);
    } catch {}
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

  private async updateOverlay(message: string, status: 'running' | 'passed' | 'failed' | 'warning'): Promise<void> {
    try {
      await this.page!.evaluate(({ msg, st }: { msg: string; st: string }) => {
        const el = document.getElementById('__tp_msg');
        if (el) el.textContent = msg;
        const colors: Record<string, string> = { running: '#c8f069', passed: '#4ade80', failed: '#f87171', warning: '#fbbf24' };
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
    const text = (await this.page!.innerText('body')).toLowerCase();
    for (const indicator of this.FAILURE_INDICATORS) {
      if (text.includes(indicator)) {
        throw new Error(`Failure detected: "${indicator}" during ${context}`);
      }
    }
  }

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
    this.context = null;
  }
}