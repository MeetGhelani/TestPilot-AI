import { _electron as electron, ElectronApplication, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import type { Driver, TestStep, StepResult } from '../types/index';

export class DesktopDriver implements Driver {
  private app: ElectronApplication | null = null;
  private page: Page | null = null;
  private screenshotDir: string;

  constructor(options: { screenshotDir?: string } = {}) {
    this.screenshotDir = options.screenshotDir ?? path.join(process.cwd(), 'reports', 'screenshots');
    fs.mkdirSync(this.screenshotDir, { recursive: true });
  }

  /**
   * target: path to the Electron app executable or main.js
   * e.g. "/Applications/MyApp.app/Contents/MacOS/MyApp"
   *      or "./dist/main.js" (Electron main entry)
   */
  async launch(target: string): Promise<void> {
    this.app = await electron.launch({ args: [target] });
    // Wait for the first BrowserWindow to appear
    this.page = await this.app.firstWindow();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async executeStep(step: TestStep): Promise<StepResult> {
    if (!this.page) throw new Error('DesktopDriver not launched — call launch() first');
    const start = Date.now();

    try {
      const result = await this._run(step);
      return { 
        step, 
        status: 'passed', 
        durationMs: Date.now() - start,
        screenshotPath: typeof result === 'string' ? result : undefined
      };
    } catch (err: unknown) {
      const screenshotPath = await this._captureErrorScreenshot(step.action);
      return {
        step,
        status: 'failed',
        durationMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
        screenshotPath,
      };
    }
  }

  private async _run(step: TestStep): Promise<string | void> {
    const p = this.page!;

    switch (step.action) {
      // In desktop apps "navigate" means switching to a window/view by title
      case 'navigate': {
        const windows = this.app!.windows();
        const target = windows.find(async (w) => (await w.title()).includes(step.value ?? ''));
        if (target) this.page = await target;
        break;
      }

      case 'click':
        await p.locator(step.target!).first().click();
        break;

      case 'fill':
        await p.locator(step.target!).first().fill(step.value ?? '');
        break;

      case 'select':
        await p.locator(step.target!).first().selectOption(step.value ?? '');
        break;

      case 'hover':
        await p.locator(step.target!).first().hover();
        break;

      case 'scroll':
        await p.locator(step.target ?? 'body').first().scrollIntoViewIfNeeded();
        break;

      case 'wait':
        await p.waitForTimeout(Number(step.value ?? 1000));
        break;

      case 'assert_visible':
        await p.locator(step.target!).first().waitFor({ state: 'visible', timeout: 10000 });
        break;

      case 'assert_text': {
        const text = await p.locator(step.target!).first().innerText();
        if (!text.includes(step.value ?? '')) {
          throw new Error(`Expected text "${step.value}" but found "${text}"`);
        }
        break;
      }

      case 'assert_title': {
        const title = await p.title();
        if (!title.includes(step.value ?? '')) {
          throw new Error(`Expected title to contain "${step.value}" but got "${title}"`);
        }
        break;
      }

      case 'screenshot':
        return await this._captureScreenshot(step.description);

      case 'assert_url':
        // Not meaningful for desktop — skip silently
        break;

      default:
        throw new Error(`Unknown action: ${(step as TestStep).action}`);
    }
  }

  private async _captureScreenshot(label = 'screenshot'): Promise<string> {
    const name = `${Date.now()}-${label.replace(/\s+/g, '-').slice(0, 40)}.png`;
    const filePath = path.join(this.screenshotDir, name);
    await this.page!.screenshot({ path: filePath });
    return filePath;
  }

  private async _captureErrorScreenshot(action: string): Promise<string | undefined> {
    try { return await this._captureScreenshot(`error-${action}`); } catch { return undefined; }
  }

  async close(): Promise<void> {
    await this.app?.close();
    this.app = null;
    this.page = null;
  }
}
