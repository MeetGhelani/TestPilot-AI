import * as path from 'path';
import * as fs from 'fs';
import type { TestPlan, TestResult, StepResult, Driver } from '../types/index';
import { WebDriver } from '../drivers/webDriver';
import { MobileDriver } from '../drivers/mobileDriver';
import { DesktopDriver } from '../drivers/desktopDriver';

interface RunnerOptions {
  outputDir?: string;
  headless?: boolean;
  authUser?: string;
  authPass?: string;
  onStepComplete?: (result: StepResult, index: number, total: number) => void;
  abortSignal?: { aborted: boolean };
}

// Live replay state — polled by UI
let liveReplayState: {
  running: boolean;
  currentStep: number;
  totalSteps: number;
  stepResults: StepResult[];
  aborted: boolean;
} = { running: false, currentStep: 0, totalSteps: 0, stepResults: [], aborted: false };

export function getLiveReplayState() { return { ...liveReplayState }; }
export function abortReplay() { liveReplayState.aborted = true; }

export async function runTest(plan: TestPlan, target: string, options: RunnerOptions = {}): Promise<TestResult> {
  const outputDir = options.outputDir ?? path.join(process.cwd(), 'reports');
  const screenshotDir = path.join(outputDir, 'screenshots');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(screenshotDir, { recursive: true });

  const driver: Driver = createDriver(plan.platform, {
    screenshotDir,
    headless: options.headless,
    authUser: options.authUser,
    authPass: options.authPass,
  });

  const startedAt = new Date().toISOString();
  const start = Date.now();
  const stepResults: StepResult[] = [];

  // Reset live state
  liveReplayState = { running: true, currentStep: 0, totalSteps: plan.steps.length, stepResults: [], aborted: false };

  try {
    await driver.launch(target);

    for (let i = 0; i < plan.steps.length; i++) {
      // Check abort signal
      if (liveReplayState.aborted) {
        const remaining = plan.steps.slice(i).map((s) => ({
          step: s, status: 'skipped' as const, durationMs: 0,
        }));
        stepResults.push(...remaining);
        break;
      }

      liveReplayState.currentStep = i + 1;
      const step = plan.steps[i];
      const result = await driver.executeStep(step);
      stepResults.push(result);
      liveReplayState.stepResults = [...stepResults];
      options.onStepComplete?.(result, i, plan.steps.length);

      if (result.status === 'failed' && !step.optional) {
        const remaining = plan.steps.slice(i + 1).map((s) => ({
          step: s, status: 'skipped' as const, durationMs: 0,
        }));
        stepResults.push(...remaining);
        liveReplayState.stepResults = [...stepResults];
        break;
      }
    }
  } catch (err: unknown) {
    liveReplayState.running = false;
    const totalDurationMs = Date.now() - start;
    return {
      plan, status: 'error', stepResults, totalDurationMs, startedAt,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await driver.close();
    liveReplayState.running = false;
  }

  const failed = stepResults.some((r) => r.status === 'failed');
  const result: TestResult = {
    plan,
    status: failed ? 'failed' : 'passed',
    stepResults,
    totalDurationMs: Date.now() - start,
    startedAt,
  };

  result.reportPath = generateHTMLReport(result, outputDir);
  return result;
}

// ─── Driver factory ───────────────────────────────────────────────────────────

function createDriver(
  platform: TestPlan['platform'],
  options: { screenshotDir: string; headless?: boolean; authUser?: string; authPass?: string }
): Driver {
  switch (platform) {
    case 'web':
      return new WebDriver(options);
    case 'mobile':
      return new MobileDriver(options);
    case 'desktop':
      return new DesktopDriver(options);
  }
}

// ─── HTML Report generator ────────────────────────────────────────────────────

function generateHTMLReport(result: TestResult, outputDir: string): string {
  const { plan, status, stepResults, totalDurationMs, startedAt } = result;
  const passed = stepResults.filter((r) => r.status === 'passed').length;
  const failed = stepResults.filter((r) => r.status === 'failed').length;
  const skipped = stepResults.filter((r) => r.status === 'skipped').length;

  const statusColor = status === 'passed' ? '#1D9E75' : '#D85A30';
  const statusLabel = status.toUpperCase();

  const stepsHTML = stepResults
    .map((r, i) => {
      const color = r.status === 'passed' ? '#1D9E75' : r.status === 'failed' ? '#D85A30' : '#888780';
      const icon = r.status === 'passed' ? '✓' : r.status === 'failed' ? '✗' : '–';
      const screenshot = r.screenshotPath
        ? `<div style="margin-top:8px"><img src="${path.relative(outputDir, r.screenshotPath)}" style="max-width:100%;border-radius:6px;border:1px solid #e0e0e0" /></div>`
        : '';
      const error = r.error
        ? `<div style="margin-top:6px;padding:8px;background:#fff5f5;border-left:3px solid #D85A30;font-family:monospace;font-size:12px;color:#712B13">${r.error}</div>`
        : '';

      return `
      <div style="display:flex;gap:12px;padding:14px 16px;border-radius:8px;background:#fafaf8;border:1px solid #e8e6de;margin-bottom:8px">
        <div style="font-size:16px;color:${color};font-weight:500;min-width:20px">${icon}</div>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;align-items:baseline">
            <span style="font-size:13px;font-weight:500;color:#2c2c2a">${i + 1}. ${r.step.description}</span>
            <span style="font-size:11px;color:#888780">${r.durationMs}ms</span>
          </div>
          <div style="margin-top:4px;font-size:12px;color:#5f5e5a;font-family:monospace">
            ${r.step.action}${r.step.target ? ` › ${r.step.target}` : ''}${r.step.value ? ` = "${r.step.value}"` : ''}
          </div>
          ${error}${screenshot}
        </div>
      </div>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${plan.title} — AI Test Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f4ef; color: #2c2c2a; padding: 32px; }
    .card { background: #fff; border-radius: 12px; border: 1px solid #e8e6de; padding: 24px; margin-bottom: 20px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
  </style>
</head>
<body>
  <div style="max-width:800px;margin:0 auto">
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <h1 style="font-size:20px;font-weight:500;color:#2c2c2a">${plan.title}</h1>
          <p style="margin-top:6px;font-size:13px;color:#5f5e5a">${plan.naturalLanguageInput}</p>
        </div>
        <span class="badge" style="background:${statusColor}22;color:${statusColor}">${statusLabel}</span>
      </div>
      <div style="display:flex;gap:24px;margin-top:16px;font-size:12px;color:#888780">
        <span>Platform: <strong style="color:#2c2c2a">${plan.platform}</strong></span>
        <span>Duration: <strong style="color:#2c2c2a">${(totalDurationMs / 1000).toFixed(2)}s</strong></span>
        <span>Started: <strong style="color:#2c2c2a">${new Date(startedAt).toLocaleString()}</strong></span>
      </div>
    </div>

    <div class="card">
      <div style="display:flex;gap:20px;margin-bottom:16px">
        <div style="text-align:center">
          <div style="font-size:24px;font-weight:500;color:#1D9E75">${passed}</div>
          <div style="font-size:12px;color:#888780">passed</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:24px;font-weight:500;color:#D85A30">${failed}</div>
          <div style="font-size:12px;color:#888780">failed</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:24px;font-weight:500;color:#888780">${skipped}</div>
          <div style="font-size:12px;color:#888780">skipped</div>
        </div>
      </div>
      ${stepsHTML}
    </div>
  </div>
</body>
</html>`;

  const filename = `report-${Date.now()}.html`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, html, 'utf8');
  return filepath;
}