#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { generateTestPlan } from './ai/testGenerator';
import { runTest } from './runner/testRunner';
import type { CLIOptions, Platform, StepResult } from './types/index';

const program = new Command();

program
  .name('ai-test')
  .description('AI-powered functional testing for web, mobile, and desktop apps')
  .version('1.0.0')
  .requiredOption('-p, --platform <platform>', 'Target platform: web | mobile | desktop')
  .requiredOption('-u, --url <target>', 'URL (web), app bundle ID (mobile), or exe path (desktop)')
  .requiredOption('-t, --test <description>', 'Natural language test description')
  .option('-o, --output <dir>', 'Output directory for reports', './reports')
  .option('--headless', 'Run browser in headless mode (web only)', true)
  .option('--no-headless', 'Run browser with visible UI')
  .action(async (opts: CLIOptions & { headless: boolean }) => {
    const platform = opts.platform as Platform;
    if (!['web', 'mobile', 'desktop'].includes(platform)) {
      console.error(chalk.red(`Invalid platform "${platform}". Use: web | mobile | desktop`));
      process.exit(1);
    }

    console.log('');
    console.log(chalk.bold('  AI Functional Test Tool'));
    console.log(chalk.dim(`  Platform: ${platform}  Target: ${opts.url}`));
    console.log('');

    // Step 1: Generate test plan
    const spinner = ora('Generating test plan with Claude...').start();
    let plan;
    try {
      plan = await generateTestPlan(opts.test, platform, opts.url);
      spinner.succeed(chalk.green(`Test plan ready: "${plan.title}" (${plan.steps.length} steps)`));
    } catch (err) {
      spinner.fail(chalk.red('Failed to generate test plan'));
      console.error(chalk.dim(err instanceof Error ? err.message : String(err)));
      process.exit(1);
    }

    // Print the plan
    console.log('');
    plan.steps.forEach((step, i) => {
      console.log(chalk.dim(`  ${i + 1}.`) + ` ${step.description}`);
    });
    console.log('');

    // Step 2: Execute
    const runSpinner = ora(`Running on ${platform}...`).start();

    const result = await runTest(plan, opts.url, {
      outputDir: opts.output,
      headless: opts.headless,
      onStepComplete: (r: StepResult, i: number, total: number) => {
        const icon = r.status === 'passed' ? chalk.green('✓') : r.status === 'failed' ? chalk.red('✗') : chalk.dim('–');
        runSpinner.text = `[${i + 1}/${total}] ${icon} ${r.step.description}`;
      },
    });

    runSpinner.stop();

    // Step 3: Print summary
    console.log('');
    const passed = result.stepResults.filter((r) => r.status === 'passed').length;
    const failed = result.stepResults.filter((r) => r.status === 'failed').length;
    const skipped = result.stepResults.filter((r) => r.status === 'skipped').length;

    result.stepResults.forEach((r, i) => {
      const icon = r.status === 'passed' ? chalk.green('✓') : r.status === 'failed' ? chalk.red('✗') : chalk.dim('–');
      console.log(`  ${icon} ${chalk.dim(`${i + 1}.`)} ${r.step.description} ${chalk.dim(`${r.durationMs}ms`)}`);
      if (r.error) console.log(`       ${chalk.red(r.error)}`);
    });

    console.log('');
    console.log(
      `  ${chalk.green(`${passed} passed`)}  ${failed ? chalk.red(`${failed} failed`) : chalk.dim('0 failed')}  ${chalk.dim(`${skipped} skipped`)}  ${chalk.dim(`${(result.totalDurationMs / 1000).toFixed(2)}s`)}`
    );

    if (result.reportPath) {
      console.log('');
      console.log(chalk.dim(`  Report: ${result.reportPath}`));
    }

    console.log('');
    process.exit(result.status === 'passed' ? 0 : 1);
  });

program.parse();
