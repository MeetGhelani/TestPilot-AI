import * as path from 'path';
import * as fs from 'fs';
import type { Driver, TestStep, StepResult } from '../types/index';

// Mobile driver — requires Appium + webdriverio to be installed separately
// Install when needed: npm install webdriverio appium --legacy-peer-deps

export class MobileDriver implements Driver {
  private screenshotDir: string;

  constructor(options: { screenshotDir?: string } = {}) {
    this.screenshotDir = options.screenshotDir ?? path.join(process.cwd(), 'reports', 'screenshots');
    fs.mkdirSync(this.screenshotDir, { recursive: true });
  }

  async launch(_target: string): Promise<void> {
    throw new Error(
      'Mobile testing requires webdriverio and Appium.\n' +
      'Run: npm install webdriverio appium --legacy-peer-deps\n' +
      'Then start Appium: npx appium'
    );
  }

  async executeStep(step: TestStep): Promise<StepResult> {
    return {
      step,
      status: 'failed',
      durationMs: 0,
      error: 'Mobile driver not configured. See setup instructions.',
    };
  }

  async close(): Promise<void> {}
}