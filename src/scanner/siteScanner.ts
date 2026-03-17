import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

export interface SelectorMap {
  [element: string]: string;
}

export interface ScanResult {
  url: string;
  scannedAt: string;
  selectors: SelectorMap;
}

const ELEMENT_STRATEGIES: Record<string, string[]> = {
  header: [
    'header',
    '[role="banner"]',
    '#header',
    '.header',
    '.site-header',
    '.page-header',
    '#masthead',
    '.masthead',
  ],
  footer: [
    'footer',
    '[role="contentinfo"]',
    '#footer',
    '.footer',
    '.site-footer',
    '.page-footer',
  ],
  navigation: [
    'nav',
    '[role="navigation"]',
    '.navigation',
    '.nav',
    '.navbar',
    '.main-nav',
    '.site-nav',
    '#nav',
    '.menu',
    '.main-menu',
  ],
  logo: [
    '.logo',
    '#logo',
    '[class*="logo"]',
    '.site-logo',
    'a.logo',
    '.brand',
    '[class*="brand"]',
    'header img',
  ],
  login_button: [
    'a[href*="login"]',
    'a[href*="signin"]',
    'a[href*="account"]',
    '[class*="login"]',
    '[class*="signin"]',
    'button:has-text("Login")',
    'button:has-text("Sign in")',
    'a:has-text("Login")',
    'a:has-text("Sign in")',
    'a:has-text("Anmelden")',
  ],
  search_bar: [
    'input[type="search"]',
    '[role="search"] input',
    '.search input',
    '#search',
    'input[name="q"]',
    'input[placeholder*="search" i]',
    'input[placeholder*="suche" i]',
    '[class*="search"] input',
  ],
  cart_icon: [
    '[class*="cart"]',
    '[class*="basket"]',
    '[href*="cart"]',
    '[href*="basket"]',
    '[aria-label*="cart" i]',
    '[aria-label*="basket" i]',
    '[aria-label*="warenkorb" i]',
    '.minicart',
  ],
  product_grid: [
    '[class*="product-list"]',
    '[class*="product-grid"]',
    '[class*="products"]',
    '.catalog-grid',
    '.items',
    '[class*="item-list"]',
    'ul.products',
    '.product-items',
  ],
  hero_banner: [
    '[class*="hero"]',
    '[class*="banner"]',
    '[class*="slider"]',
    '[class*="carousel"]',
    '.slideshow',
    '[class*="jumbotron"]',
    'section:first-of-type',
    '[class*="intro"]',
  ],
};

export async function scanSite(url: string, outputDir: string): Promise<ScanResult> {
  const browser = await chromium.launch({ headless: true });

  let cleanUrl = url;
  let httpCredentials: { username: string; password: string } | undefined;

  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) {
      httpCredentials = {
        username: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
      };
      parsed.username = '';
      parsed.password = '';
      cleanUrl = parsed.toString();
    }
  } catch {}

  const context = await browser.newContext({ httpCredentials });
  const page = await context.newPage();

  await page.goto(cleanUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  const selectors: SelectorMap = {};

  for (const [element, strategies] of Object.entries(ELEMENT_STRATEGIES)) {
    for (const selector of strategies) {
      try {
        const count = await page.locator(selector).count();
        if (count > 0) {
          const visible = await page.locator(selector).first().isVisible();
          if (visible) {
            selectors[element] = selector;
            break;
          }
        }
      } catch {}
    }
  }

  await browser.close();

  const result: ScanResult = {
    url: cleanUrl,
    scannedAt: new Date().toISOString(),
    selectors,
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, 'selectors.json'),
    JSON.stringify(result, null, 2)
  );

  return result;
}

export function loadSelectors(outputDir: string): SelectorMap {
  const file = path.join(outputDir, 'selectors.json');
  if (!fs.existsSync(file)) return {};
  try {
    const data: ScanResult = JSON.parse(fs.readFileSync(file, 'utf8'));
    return data.selectors;
  } catch {
    return {};
  }
}
