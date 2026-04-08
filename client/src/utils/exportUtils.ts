  interface Step { 
  action: string; 
  target?: string | { primary: string; fallback: string[] }; 
  value?: string; 
  description: string;
  frame?: string;
  intent?: string;
}

interface RecordedTest { 
  id: string; 
  title: string; 
  url: string; 
  recordedAt: string; 
  steps?: Step[]; 
  authUser?: string; 
  authPass?: string;
}

export function generatePlaywrightCode(recording: RecordedTest, language: 'typescript' | 'python'): string {
  if (language === 'typescript') {
    return generateTypeScript(recording);
  } else {
    return generatePython(recording);
  }
}

function generateTypeScript(rec: RecordedTest): string {
  const steps = rec.steps || [];
  const authPart = rec.authUser ? `
      httpCredentials: {
        username: '${rec.authUser}',
        password: '${rec.authPass || ''}',
      },` : '';

  let code = `const { chromium } = require('playwright');

(async () => {
  // Launch the browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },${authPart}
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  try {
    console.log('Starting test: ${rec.title}');
    
    // Navigate to initial URL
    await page.goto('${rec.url}', { waitUntil: 'domcontentloaded' });
`;

  steps.forEach((step, index) => {
    code += `\n    // Step ${index + 1}: ${step.description}\n`;
    code += generateTSStep(step);
  });

  code += `
    console.log('Test completed successfully!');
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    // Keep browser open for a bit to see results, then close
    await new Promise(resolve => setTimeout(resolve, 3000));
    await browser.close();
  }
})();
`;
  return code;
}

function generateTSStep(step: Step): string {
  const selector = typeof step.target === 'string' ? step.target : step.target?.primary;
  const value = step.value || '';
  const escapedValue = value.replace(/'/g, "\\'");

  switch (step.action) {
    case 'navigate':
      return `    await page.goto('${value}', { waitUntil: 'networkidle' });`;
    case 'click':
      return `    await page.click('${selector}');`;
    case 'fill':
      return `    await page.fill('${selector}', '${escapedValue}');`;
    case 'press':
      return `    await page.press('${selector}', '${escapedValue || 'Enter'}');`;
    case 'select':
      return `    await page.selectOption('${selector}', '${escapedValue}');`;
    case 'hover':
      return `    await page.hover('${selector}');`;
    case 'wait':
      return `    await page.waitForTimeout(${parseInt(value) || 1000});`;
    case 'screenshot':
      return `    await page.screenshot({ path: 'screenshot-${Date.now()}.png', fullPage: true });`;
    default:
      return `    // Unknown action: ${step.action}`;
  }
}

function generatePython(rec: RecordedTest): string {
  const steps = rec.steps || [];
  const authPart = rec.authUser ? `,
        http_credentials={
            "username": "${rec.authUser}",
            "password": "${rec.authPass || ''}"
        }` : '';

  let code = `from playwright.sync_api import sync_playwright
import time

def run_test():
    with sync_playwright() as p:
        # Launch the browser
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            viewport={"width": 1280, "height": 800}${authPart},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )
        
        page = context.new_page()
        
        try:
            print("Starting test: ${rec.title}")
            
            # Navigate to initial URL
            page.goto("${rec.url}", wait_until="domcontentloaded")
`;

  steps.forEach((step, index) => {
    code += `\n            # Step ${index + 1}: ${step.description}\n`;
    code += generatePythonStep(step);
  });

  code += `
            print("Test completed successfully!")
            
        except Exception as e:
            print(f"Test failed: {e}")
            
        finally:
            # Keep browser open for a bit to see results, then close
            time.sleep(3)
            browser.close()

if __name__ == "__main__":
    run_test()
`;
  return code;
}

function generatePythonStep(step: Step): string {
  const selector = typeof step.target === 'string' ? step.target : step.target?.primary;
  const value = step.value || '';
  const escapedValue = value.replace(/"/g, '\\"');

  switch (step.action) {
    case 'navigate':
      return `            page.goto("${value}", wait_until="networkidle")`;
    case 'click':
      return `            page.click("${selector}")`;
    case 'fill':
      return `            page.fill("${selector}", "${escapedValue}")`;
    case 'press':
      return `            page.press("${selector}", "${escapedValue || 'Enter'}")`;
    case 'select':
      return `            page.select_option("${selector}", "${escapedValue}")`;
    case 'hover':
      return `            page.hover("${selector}")`;
    case 'wait':
      return `            page.wait_for_timeout(${parseInt(value) || 1000})`;
    case 'screenshot':
      return `            page.screenshot(path=f"screenshot-{int(time.time())}.png", full_page=True)`;
    default:
      return `            # Unknown action: ${step.action}`;
  }
}
