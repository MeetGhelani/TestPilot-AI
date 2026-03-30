import { _electron as electron, ElectronApplication, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import type { Driver, TestStep, StepResult } from '../types/index';
import { resolveElement, withRetry } from '../engine/smartSelector';

export class DesktopDriver implements Driver {
  private app: ElectronApplication | null = null;
  private page: Page | null = null;
  private screenshotDir: string;

  constructor(options: { screenshotDir?: string } = {}) {
    this.screenshotDir = options.screenshotDir ?? path.join(process.cwd(), 'reports', 'screenshots');
    fs.mkdirSync(this.screenshotDir, { recursive: true });
  }

  async launch(target: string): Promise<void> {
    this.app = await electron.launch({ args: [target] });
    this.page = await this.app.firstWindow();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async executeStep(step: TestStep): Promise<StepResult> {
    if (!this.page) throw new Error('DesktopDriver not launched — call launch() first');
    const start = Date.now();

    try {
      const result = await withRetry(() => this._run(step), step.retries || 2, step.description);
      return { 
        step, 
        status: 'passed', 
        durationMs: Date.now() - start,
        screenshotPath: typeof result === 'string' ? result : undefined
      };
    } catch (err: any) {
      const screenshotPath = await this._captureErrorScreenshot(step.action);
      return {
        step,
        status: 'failed',
        durationMs: Date.now() - start,
        error: err.message || String(err),
        screenshotPath,
      };
    }
  }

  private async _run(step: TestStep): Promise<string | void> {
    const p = this.page!;

    switch (step.action) {
      case 'navigate': {
        const windows = this.app!.windows();
        // Simple window switching by title snippet
        for (const w of windows) {
          const title = await w.title();
          if (title.includes(step.value || '')) {
            this.page = w;
            return;
          }
        }
        throw new Error(`Window with title "${step.value}" not found`);
      }

      case 'click':
      case 'fill':
      case 'select':
      case 'hover': {
        const { locator } = await resolveElement(p, step.target!, { timeout: 10000 });
        if (step.action === 'click') await locator.click();
        else if (step.action === 'fill') await locator.fill(step.value || '');
        else if (step.action === 'select') await locator.selectOption(step.value || '');
        else if (step.action === 'hover') await locator.hover();
        break;
      }

      case 'scroll': {
        const { locator } = await resolveElement(p, step.target || 'body', { timeout: 5000 });
        await locator.scrollIntoViewIfNeeded();
        break;
      }

      case 'wait':
        await p.waitForTimeout(Number(step.value || 1000));
        break;

      case 'assert':
      case 'assert_visible': {
        const { locator } = await resolveElement(p, step.target!, { timeout: 10000, waitForVisible: true });
        if (!(await locator.isVisible())) throw new Error('Element not visible');
        break;
      }

      case 'assert_text': {
        const { locator } = await resolveElement(p, step.target!, { timeout: 10000 });
        const text = await locator.innerText();
        if (!text.includes(step.value || '')) {
          throw new Error(`Expected text "${step.value}" but found "${text}"`);
        }
        break;
      }

      case 'screenshot':
        return await this._captureScreenshot(step.description);

      default:
        // Desktop doesn't support URL assertions usually
        if (step.action.startsWith('assert_')) return;
        throw new Error(`Unknown action: ${step.action}`);
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
