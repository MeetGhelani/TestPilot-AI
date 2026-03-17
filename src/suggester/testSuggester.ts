import { chromium } from 'playwright';

export interface TestSuggestion {
  id: string;
  title: string;
  description: string;
  category: 'auth' | 'navigation' | 'form' | 'search' | 'ecommerce' | 'content' | 'ui';
  priority: 'high' | 'medium' | 'low';
  icon: string;
  testDescription: string;
  url: string;
  why: string;
}

export interface ScanSummary {
  url: string;
  scannedAt: string;
  pagesVisited: number;
  elementsFound: any[];
  suggestions: TestSuggestion[];
  siteName?: string;
}

function parseCredentials(url: string): { cleanUrl: string; httpCredentials?: { username: string; password: string } } {
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) {
      const creds = { username: decodeURIComponent(parsed.username), password: decodeURIComponent(parsed.password) };
      parsed.username = ''; parsed.password = '';
      return { cleanUrl: parsed.toString(), httpCredentials: creds };
    }
  } catch {}
  return { cleanUrl: url };
}

// Deep DOM scan — runs inside the browser, returns rich element data
async function deepScanPage(page: any, pageUrl: string): Promise<any[]> {
  return page.evaluate((url: string) => {
    const found: any[] = [];
    const text = (el: Element) => (el as HTMLElement).innerText?.trim() ?? '';
    const attr = (el: Element, a: string) => el.getAttribute(a) ?? '';

    // Helper: get best selector for an element
    const sel = (el: Element): string => {
      if (el.id) return `#${CSS.escape(el.id)}`;
      const aria = attr(el, 'aria-label');
      if (aria) return `[aria-label="${aria}"]`;
      const name = attr(el, 'name');
      if (name) return `[name="${name}"]`;
      const ph = attr(el, 'placeholder');
      if (ph) return `[placeholder="${ph}"]`;
      const t = text(el).slice(0, 40);
      const tag = el.tagName.toLowerCase();
      if (t && !['div','section','main','body','html','span'].includes(tag)) return `${tag}:has-text("${t}")`;
      const cls = Array.from(el.classList).filter(c => !/^(active|open|hover|visible|hidden|js-)/.test(c)).slice(0, 2);
      if (cls.length) return `.${cls.join('.')}`;
      return tag;
    };

    // ── Login form ──
    const pwInput = document.querySelector('input[type="password"]');
    if (pwInput) {
      const emailInput = document.querySelector('input[type="email"], input[type="text"][name*="user" i], input[type="text"][name*="email" i], input[placeholder*="email" i], input[placeholder*="username" i]');
      const submitBtn = document.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
      const btnText = submitBtn ? text(submitBtn).slice(0, 30) : 'Sign in';
      found.push({
        type: 'login',
        label: 'Login form',
        emailSel: emailInput ? sel(emailInput) : 'input[type="email"]',
        passSel: sel(pwInput),
        btnSel: submitBtn ? sel(submitBtn) : 'button[type="submit"]',
        btnText,
        url,
      });
    }

    // ── Signup / register ──
    const signupEl = Array.from(document.querySelectorAll('a, button')).find(el =>
      /sign.?up|register|create.?account|join|konto|registrieren/i.test(text(el))
    );
    if (signupEl) found.push({ type: 'signup', label: text(signupEl).slice(0, 30), btnSel: sel(signupEl), url });

    // ── Search ──
    const searchEl = document.querySelector('input[type="search"], input[name="q"], input[name="search"], [role="search"] input, input[placeholder*="search" i], input[placeholder*="suche" i], input[placeholder*="zoek" i]');
    if (searchEl) {
      const searchBtn = searchEl.closest('form')?.querySelector('button, input[type="submit"]');
      found.push({ type: 'search', label: attr(searchEl, 'placeholder') || 'Search', searchSel: sel(searchEl), btnSel: searchBtn ? sel(searchBtn) : '[type="submit"]', url });
    }

    // ── Navigation links ──
    const nav = document.querySelector('nav, [role="navigation"], header nav, .navbar, .navigation, .main-nav');
    if (nav) {
      const links = Array.from(nav.querySelectorAll('a')).filter(a => text(a).length > 1).slice(0, 8);
      if (links.length > 0) {
        found.push({
          type: 'navigation',
          label: 'Main navigation',
          navSel: sel(nav),
          links: links.map(a => ({ text: text(a).slice(0, 30), href: (a as HTMLAnchorElement).href, sel: sel(a) })),
          url,
        });
      }
    }

    // ── Cart ──
    const cartEl = document.querySelector('[class*="cart" i], [class*="basket" i], [aria-label*="cart" i], [aria-label*="basket" i], [href*="cart"], [href*="basket"], [href*="warenkorb"]');
    if (cartEl) found.push({ type: 'cart', label: 'Shopping cart', cartSel: sel(cartEl), url });

    // ── Product listing ──
    const productGrid = document.querySelector('[class*="product-list" i], [class*="product-grid" i], [class*="catalog" i], [class*="item-list" i], ul.products, .products');
    if (productGrid) {
      const items = productGrid.querySelectorAll('li, [class*="item" i], [class*="product" i]');
      found.push({ type: 'products', label: `Product grid (${items.length} items)`, gridSel: sel(productGrid), itemCount: items.length, url });
    }

    // ── Contact / generic forms ──
    Array.from(document.querySelectorAll('form')).forEach(form => {
      if (form.querySelector('input[type="password"]')) return; // skip login
      const inputs = Array.from(form.querySelectorAll('input:not([type="hidden"]):not([type="submit"])'));
      const textareas = form.querySelectorAll('textarea');
      if (inputs.length < 1 && textareas.length < 1) return;
      const heading = form.closest('section, div, article')?.querySelector('h1,h2,h3')?.textContent?.trim().slice(0, 40) ?? 'Form';
      const submitBtn = form.querySelector('[type="submit"], button:not([type])');
      found.push({
        type: 'form',
        label: heading,
        formSel: form.id ? `#${form.id}` : 'form',
        inputCount: inputs.length,
        hasTextarea: textareas.length > 0,
        firstInputSel: inputs[0] ? sel(inputs[0]) : 'input:visible',
        btnSel: submitBtn ? sel(submitBtn) : 'button[type="submit"]',
        url,
      });
    });

    // ── CTA buttons ──
    const ctaBtns = Array.from(document.querySelectorAll('a[class*="btn" i], a[class*="button" i], button:not([type="submit"]):not([aria-label*="menu" i]):not([aria-label*="close" i])'))
      .filter(el => { const t = text(el); return t.length > 2 && t.length < 50; })
      .slice(0, 6);
    ctaBtns.forEach(btn => {
      const btnText = text(btn).slice(0, 40);
      const href = (btn as HTMLAnchorElement).href;
      found.push({ type: 'cta', label: btnText, btnSel: sel(btn), href, url });
    });

    // ── Images / hero ──
    const hero = document.querySelector('[class*="hero" i], [class*="banner" i], [class*="slider" i], [class*="carousel" i], .slideshow');
    if (hero) found.push({ type: 'hero', label: 'Hero / banner section', heroSel: sel(hero), url });

    // ── Page heading ──
    const h1 = document.querySelector('h1');
    if (h1) found.push({ type: 'heading', label: text(h1).slice(0, 60), h1Sel: 'h1', url });

    // ── Footer ──
    const footer = document.querySelector('footer, [role="contentinfo"], .footer, #footer');
    if (footer) found.push({ type: 'footer', label: 'Footer', footerSel: sel(footer), url });

    // ── Header ──
    const header = document.querySelector('header, [role="banner"], .header, #header');
    if (header) found.push({ type: 'header', label: 'Header', headerSel: sel(header), url });

    return found;
  }, pageUrl);
}

function buildSuggestions(elements: any[], baseUrl: string): TestSuggestion[] {
  const suggestions: TestSuggestion[] = [];
  let id = 1;

  const has = (type: string) => elements.some(e => e.type === type);
  const get = (type: string) => elements.find(e => e.type === type);
  const getAll = (type: string) => elements.filter(e => e.type === type);

  // ── Homepage load ──
  suggestions.push({
    id: `sug-${id++}`, title: 'Homepage loads correctly',
    description: 'Verify the page loads with header, content and footer visible',
    category: 'ui', priority: 'high', icon: '🏠',
    testDescription: `verify header is visible, verify footer is visible, scroll to bottom, take screenshot`,
    url: baseUrl,
    why: 'Basic page load test catches server errors, broken layouts and missing elements instantly.',
  });

  // ── Header ──
  if (has('header')) {
    const h = get('header');
    suggestions.push({
      id: `sug-${id++}`, title: 'Header is always visible',
      description: 'Verify the header renders correctly at the top of the page',
      category: 'ui', priority: 'high', icon: '📌',
      testDescription: `verify header is visible, take screenshot`,
      url: h.url,
      why: 'Header contains navigation and branding — broken header affects every page.',
    });
  }

  // ── Navigation ──
  if (has('navigation')) {
    const nav = get('navigation');
    const linkTests = nav.links.slice(0, 3).map((l: any) =>
      `click ${l.sel}, verify page is visible, take screenshot`
    ).join(', then navigate back and ');

    suggestions.push({
      id: `sug-${id++}`, title: 'Navigation menu works',
      description: `Verify ${nav.links.length} nav links are visible and clickable`,
      category: 'navigation', priority: 'high', icon: '🧭',
      testDescription: `verify navigation is visible, take screenshot`,
      url: nav.url,
      why: 'Navigation is present on every page — broken links confuse and lose users.',
    });

    // Individual nav link tests
    nav.links.slice(0, 4).forEach((link: any) => {
      if (!link.href || link.href === '#' || link.href.startsWith('javascript')) return;
      suggestions.push({
        id: `sug-${id++}`, title: `"${link.text}" page loads`,
        description: `Click "${link.text}" in the navigation and verify page loads`,
        category: 'navigation', priority: 'medium', icon: '🔗',
        testDescription: `click ${link.sel}, verify header is visible, take screenshot`,
        url: nav.url,
        why: `"${link.text}" is a key page in your navigation — users expect it to work.`,
      });
    });
  }

  // ── Login ──
  if (has('login')) {
    const login = get('login');
    suggestions.push({
      id: `sug-${id++}`, title: 'Login form fields render correctly',
      description: 'Verify email/username and password fields are visible before interacting',
      category: 'auth', priority: 'high', icon: '👁️',
      testDescription: `verify ${login.emailSel} is visible, verify ${login.passSel} is visible, take screenshot`,
      url: login.url,
      why: 'If input fields fail to render, users cannot log in at all.',
    });
    suggestions.push({
      id: `sug-${id++}`, title: 'Login with valid credentials',
      description: 'Fill login form with real credentials — replace the placeholder values with actual ones, then verify redirect',
      category: 'auth', priority: 'high', icon: '🔐',
      testDescription: `fill ${login.emailSel} with 'your@email.com', fill ${login.passSel} with 'yourpassword', click ${login.btnSel}, wait 2000, verify url contains 'dashboard', take screenshot`,
      url: login.url,
      why: 'Login is the most critical flow — always verify the URL changed after submit, not just that the button was clicked.',
    });
    suggestions.push({
      id: `sug-${id++}`, title: 'Login shows error for wrong password',
      description: 'Verify an error message appears with wrong credentials',
      category: 'auth', priority: 'high', icon: '🔒',
      testDescription: `fill ${login.emailSel} with 'wrong@email.com', fill ${login.passSel} with 'wrongpass123', click ${login.btnSel}, wait 1000, take screenshot`,
      url: login.url,
      why: 'Error handling in login is critical — screenshot will reveal whether an error message appears.',
    });
  }

  // ── Signup ──
  if (has('signup')) {
    const s = get('signup');
    suggestions.push({
      id: `sug-${id++}`, title: 'Sign up button is visible and clickable',
      description: `Verify the "${s.label}" button works`,
      category: 'auth', priority: 'medium', icon: '✍️',
      testDescription: `verify ${s.btnSel} is visible, click ${s.btnSel}, take screenshot`,
      url: s.url,
      why: 'Registration is the entry point for new users — a broken signup loses customers.',
    });
  }

  // ── Search ──
  if (has('search')) {
    const s = get('search');
    suggestions.push({
      id: `sug-${id++}`, title: 'Search bar is visible and functional',
      description: `Type a query in the search field and verify results load`,
      category: 'search', priority: 'high', icon: '🔍',
      testDescription: `verify ${s.searchSel} is visible, fill ${s.searchSel} with 'test', click ${s.btnSel}, take screenshot`,
      url: s.url,
      why: 'Search is a primary discovery tool — broken search means users cannot find products or content.',
    });
    suggestions.push({
      id: `sug-${id++}`, title: 'Empty search is handled gracefully',
      description: 'Submit empty search and verify no errors appear',
      category: 'search', priority: 'low', icon: '🔎',
      testDescription: `click ${s.searchSel}, click ${s.btnSel}, take screenshot`,
      url: s.url,
      why: 'Empty search queries often trigger server errors that are easy to prevent.',
    });
  }

  // ── Cart ──
  if (has('cart')) {
    const c = get('cart');
    suggestions.push({
      id: `sug-${id++}`, title: 'Cart icon is visible and accessible',
      description: 'Verify the shopping cart button renders and is clickable',
      category: 'ecommerce', priority: 'high', icon: '🛒',
      testDescription: `verify ${c.cartSel} is visible, click ${c.cartSel}, take screenshot`,
      url: c.url,
      why: 'Cart access is essential for any ecommerce site — a broken cart means no purchases.',
    });
  }

  // ── Product grid ──
  if (has('products')) {
    const p = get('products');
    suggestions.push({
      id: `sug-${id++}`, title: `Product grid loads (${p.itemCount} items)`,
      description: 'Verify products are displayed correctly in the listing',
      category: 'ecommerce', priority: 'high', icon: '📦',
      testDescription: `verify ${p.gridSel} is visible, scroll to bottom, take screenshot`,
      url: p.url,
      why: 'Product display is the core of an ecommerce site — if products don\'t show, revenue stops.',
    });
  }

  // ── Forms ──
  getAll('form').forEach(form => {
    suggestions.push({
      id: `sug-${id++}`, title: `"${form.label}" form is visible`,
      description: `Verify the form with ${form.inputCount} fields renders correctly`,
      category: 'form', priority: 'medium', icon: '📋',
      testDescription: `verify ${form.formSel} is visible, verify ${form.firstInputSel} is visible, take screenshot`,
      url: form.url,
      why: `Forms are conversion points — a broken "${form.label}" form loses leads or orders.`,
    });
    if (form.inputCount >= 2) {
      suggestions.push({
        id: `sug-${id++}`, title: `"${form.label}" form submits correctly`,
        description: 'Fill required fields and submit',
        category: 'form', priority: 'medium', icon: '📤',
        testDescription: `fill ${form.firstInputSel} with 'test input', click ${form.btnSel}, take screenshot`,
        url: form.url,
        why: 'Form submission is the action that drives conversions — test it end-to-end.',
      });
    }
  });

  // ── CTA buttons ──
  getAll('cta').slice(0, 4).forEach(cta => {
    suggestions.push({
      id: `sug-${id++}`, title: `"${cta.label}" button works`,
      description: `Click the "${cta.label}" button and verify response`,
      category: 'ui', priority: 'medium', icon: '🖱️',
      testDescription: `verify ${cta.btnSel} is visible, click ${cta.btnSel}, take screenshot`,
      url: cta.url,
      why: `"${cta.label}" is a call-to-action — it drives user engagement and should always work.`,
    });
  });

  // ── Hero ──
  if (has('hero')) {
    const h = get('hero');
    suggestions.push({
      id: `sug-${id++}`, title: 'Hero banner displays correctly',
      description: 'Verify the main banner or hero image loads without breaking layout',
      category: 'ui', priority: 'medium', icon: '🖼️',
      testDescription: `verify ${h.heroSel} is visible, take screenshot`,
      url: h.url,
      why: 'The hero is the first thing users see — a broken hero damages first impressions.',
    });
  }

  // ── Page heading ──
  if (has('heading')) {
    const h = get('heading');
    suggestions.push({
      id: `sug-${id++}`, title: `Page title "${h.label.slice(0, 30)}" is correct`,
      description: 'Verify the main heading renders with the right text',
      category: 'content', priority: 'low', icon: '📝',
      testDescription: `verify ${h.h1Sel} is visible, take screenshot`,
      url: h.url,
      why: 'Headings affect SEO and user orientation — missing or wrong headings are easy to catch.',
    });
  }

  // ── Footer ──
  if (has('footer')) {
    const f = get('footer');
    suggestions.push({
      id: `sug-${id++}`, title: 'Footer is visible at bottom',
      description: 'Scroll to bottom and verify footer loads correctly',
      category: 'ui', priority: 'low', icon: '⬇️',
      testDescription: `scroll to bottom, verify ${f.footerSel} is visible, take screenshot`,
      url: f.url,
      why: 'Footer contains legal links and contact info — missing footer can cause compliance issues.',
    });
  }

  // Sort: high → medium → low
  const order = { high: 0, medium: 1, low: 2 };
  return suggestions.sort((a, b) => order[a.priority] - order[b.priority]);
}

export async function scanAndSuggest(url: string, authUser?: string, authPass?: string): Promise<ScanSummary> {
  const browser = await chromium.launch({ headless: true });
  const { cleanUrl, httpCredentials: urlCreds } = parseCredentials(url);
  const httpCredentials = (authUser || authPass)
    ? { username: authUser ?? '', password: authPass ?? '' }
    : urlCreds;

  const context = await browser.newContext({ httpCredentials });
  const page = await context.newPage();
  const allElements: any[] = [];
  const visited = new Set<string>();

  try {
    await page.goto(cleanUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const baseOrigin = new URL(cleanUrl).origin;
    allElements.push(...await deepScanPage(page, cleanUrl));
    visited.add(cleanUrl);

    // Crawl up to 4 more pages
    const links: string[] = await page.evaluate((origin: string) =>
      Array.from(document.querySelectorAll('a[href]'))
        .map(a => (a as HTMLAnchorElement).href)
        .filter(h => h.startsWith(origin) && !h.includes('#') && !h.match(/\.(jpg|png|pdf|zip|css|js)$/i))
        .slice(0, 10),
      baseOrigin
    );

    for (const link of links) {
      if (visited.size >= 5) break;
      if (visited.has(link)) continue;
      try {
        await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 12000 });
        await page.waitForTimeout(600);
        allElements.push(...await deepScanPage(page, link));
        visited.add(link);
      } catch {}
    }
  } finally {
    await browser.close();
  }

  // Deduplicate elements by type+label
  const seen = new Set<string>();
  const unique = allElements.filter(e => {
    const key = `${e.type}:${e.label}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });

  return {
    url: cleanUrl,
    scannedAt: new Date().toISOString(),
    pagesVisited: visited.size,
    elementsFound: unique,
    suggestions: buildSuggestions(unique, cleanUrl),
  };
}