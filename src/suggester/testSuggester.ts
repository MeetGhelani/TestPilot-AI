import { chromium } from 'playwright';
import type { TestStep } from '../types/index';

export interface TestSuggestion {
  id: string;
  title: string;
  description: string;
  category: 'auth' | 'navigation' | 'form' | 'search' | 'ecommerce' | 'content' | 'ui';
  priority: 'high' | 'medium' | 'low';
  icon: string;
  steps: TestStep[];
  confidence: {
    detection: number;
    selector: number;
    outcome: number;
  };
  testDescription?: string; // Legacy support
  isNegative?: boolean;
  isExecutable: boolean;
  intent: string;
  expectedState?: string;
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

    // Helper: get best multi-strategy selector for an element
    const sel = (el: Element): { primary: string; fallback: string[] } => {
      const fallbacks: string[] = [];
      const tag = el.tagName.toLowerCase();
      
      // Preferred: ID
      if (el.id) {
        const idSel = `#${CSS.escape(el.id)}`;
        fallbacks.push(idSel);
      }

      // Aria labels
      const aria = attr(el, 'aria-label');
      if (aria) fallbacks.push(`[aria-label="${aria}"]`);

      // Name / Placeholder
      const name = attr(el, 'name');
      if (name) fallbacks.push(`[name="${name}"]`);
      const ph = attr(el, 'placeholder');
      if (ph) fallbacks.push(`[placeholder="${ph}"]`);

      // Role + Text (Playwright-like)
      const role = attr(el, 'role') || (tag === 'button' ? 'button' : tag === 'input' ? 'textbox' : undefined);
      const t = text(el).slice(0, 40);
      if (role && t) fallbacks.push(`${role}:has-text("${t}")`);
      else if (t && !['div','section','main','body','html','span'].includes(tag)) fallbacks.push(`${tag}:has-text("${t}")`);

      // Class-based (last resort)
      const cls = Array.from(el.classList).filter(c => !/^(active|open|hover|visible|hidden|js-)/.test(c)).slice(0, 2);
      if (cls.length) fallbacks.push(`.${cls.join('.')}`);

      return {
        primary: fallbacks[0] || tag,
        fallback: fallbacks.slice(1)
      };
    };

    // ── Success Indicators (Outcomes) ──
    const outcomes = Array.from(document.querySelectorAll('a, button, h1, h2, span'))
      .filter(el => {
        const t = text(el).toLowerCase();
        return /log.?out|sign.?out|welcome|dashboard|my.?account|profile|settings|success|confirmed/i.test(t);
      })
      .map(el => ({ label: text(el).slice(0, 30), sel: sel(el), context: text(el) }));

    const hasOutcome = (pattern: RegExp) => outcomes.some(o => pattern.test(o.context.toLowerCase()));

    // ── Login form ──
    const pwInput = document.querySelector('input[type="password"]');
    if (pwInput) {
      const emailInput = document.querySelector('input[type="email"], input[type="text"][name*="user" i], input[type="text"][name*="email" i], input[placeholder*="email" i], input[placeholder*="username" i]');
      const submitBtn = document.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
      if (submitBtn) {
        found.push({
          type: 'login',
          label: 'Login flow',
          emailSel: emailInput ? sel(emailInput) : sel(document.createElement('input')), // Placeholder if not found
          passSel: sel(pwInput),
          btnSel: sel(submitBtn),
          btnText: text(submitBtn).slice(0, 30),
          outcomes: outcomes.filter(o => /log.?out|dashboard|my.?account/i.test(o.context)),
          url,
        });
      }
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
      found.push({ 
        type: 'search', 
        label: attr(searchEl, 'placeholder') || 'Search flow', 
        searchSel: sel(searchEl), 
        btnSel: searchBtn ? sel(searchBtn) : { primary: '[type="submit"]', fallback: [] }, 
        url 
      });
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

    // ── Forms ──
    Array.from(document.querySelectorAll('form')).forEach(form => {
      if (form.querySelector('input[type="password"]')) return; // skip login
      const inputs = Array.from(form.querySelectorAll('input:not([type="hidden"]):not([type="submit"])'));
      const textareas = form.querySelectorAll('textarea');
      if (inputs.length < 1 && textareas.length < 1) return;
      const heading = form.closest('section, div, article')?.querySelector('h1,h2,h3')?.textContent?.trim().slice(0, 40) ?? 'Form';
      const submitBtn = form.querySelector('[type="submit"], button:not([type])');
      if (submitBtn) {
        found.push({
          type: 'form',
          label: heading,
          formSel: sel(form),
          inputCount: inputs.length,
          firstInputSel: sel(inputs[0]),
          btnSel: sel(submitBtn),
          url,
        });
      }
    });

    // ── CTA buttons ──
    const ctaBtns = Array.from(document.querySelectorAll('a[class*="btn" i], a[class*="button" i], button:not([type="submit"]):not([aria-label*="menu" i]):not([aria-label*="close" i])'))
      .filter(el => { const t = text(el); return t.length > 2 && t.length < 50; })
      .slice(0, 6);
    ctaBtns.forEach(btn => {
      found.push({ type: 'cta', label: text(btn).slice(0, 40), btnSel: sel(btn), url });
    });

    return found;
  }, pageUrl);
}

function buildSuggestions(elements: any[], baseUrl: string): TestSuggestion[] {
  const suggestions: TestSuggestion[] = [];
  let idIdx = 1;

  const has = (type: string) => elements.some(e => e.type === type);
  const get = (type: string) => elements.find(e => e.type === type);
  const getAll = (type: string) => elements.filter(e => e.type === type);

  // Helper to create a suggestion with defaults
  const createSug = (base: Partial<TestSuggestion>): TestSuggestion => ({
    id: `sug-${idIdx++}`,
    title: '',
    description: '',
    category: 'ui',
    priority: 'medium',
    icon: '📝',
    steps: [],
    confidence: { detection: 0.8, selector: 0.8, outcome: 0.5 },
    isExecutable: false,
    intent: 'generic',
    url: baseUrl,
    why: '',
    ...base
  } as TestSuggestion);

  // ── 1. Auth Flows (Highest Priority) ──
  if (has('login')) {
    const login = get('login');
    
    // Positive Login Flow
    suggestions.push(createSug({
      title: 'Login with valid credentials',
      description: 'Verify a user can successfully authenticate and reach the dashboard',
      category: 'auth',
      priority: 'high',
      icon: '🔐',
      intent: 'login_success',
      isExecutable: true,
      confidence: { detection: 1.0, selector: 0.9, outcome: 0.8 },
      expectedState: 'Authenticated session, user redirected to dashboard or profile',
      steps: [
        { action: 'navigate', value: login.url, description: 'Navigate to login page' },
        { action: 'fill', target: login.emailSel, value: '{{user.email}}', description: 'Enter email address' },
        { action: 'fill', target: login.passSel, value: '{{user.password}}', description: 'Enter password' },
        { action: 'click', target: login.btnSel, description: `Click ${login.btnText}` },
        { action: 'wait', value: '2000', description: 'Wait for redirect' },
        { 
          action: 'assert', 
          target: { 
            primary: 'url', 
            fallback: login.outcomes?.map((o: any) => o.sel.primary) || ['text:has-text("Logout")', 'text:has-text("Welcome")'] 
          }, 
          value: 'dashboard', 
          assertType: 'url', 
          description: 'Verify redirected to dashboard AND logout button is visible' 
        }
      ],
      why: 'Login is the single most critical flow. Any breakage here blocks all users.'
    }));

    // Negative Login: Invalid Password
    suggestions.push(createSug({
      title: 'Login fails with invalid password',
      description: 'Verify system prevents access and shows error for wrong credentials',
      category: 'auth',
      priority: 'high',
      icon: '🔒',
      intent: 'login_failure',
      isNegative: true,
      isExecutable: true,
      confidence: { detection: 1.0, selector: 0.9, outcome: 0.7 },
      steps: [
        { action: 'navigate', value: login.url, description: 'Navigate to login page' },
        { action: 'fill', target: login.emailSel, value: '{{user.email}}', description: 'Enter valid email' },
        { action: 'fill', target: login.passSel, value: 'wrong_password_123', description: 'Enter incorrect password' },
        { action: 'click', target: login.btnSel, description: 'Submit form' },
        { 
          action: 'assert', 
          target: { primary: 'body', fallback: ['[class*="error" i]', '[id*="error" i]', 'text:has-text("invalid")', 'text:has-text("wrong")'] }, 
          assertType: 'text', 
          description: 'Verify an error message is displayed' 
        }
      ],
      why: 'Security and user feedback: ensure users are told why their login failed.'
    }));
  }

  // ── 2. Search Flows ──
  if (has('search')) {
    const s = get('search');
    
    // Positive Search
    suggestions.push(createSug({
      title: 'Search results load correctly',
      description: 'Verify that typing a query returns matching results',
      category: 'search',
      priority: 'high',
      icon: '🔍',
      intent: 'search_query',
      isExecutable: true,
      confidence: { detection: 0.9, selector: 0.8, outcome: 0.6 },
      steps: [
        { action: 'fill', target: s.searchSel, value: 'test', description: 'Type "test" into search' },
        { action: 'press', value: 'Enter', target: s.searchSel, description: 'Press Enter' },
        { action: 'wait', value: '1000', description: 'Wait for results' },
        { 
          action: 'assert', 
          target: { primary: 'body', fallback: ['[class*="result" i]', '[id*="results" i]', 'text:has-text("Results")'] }, 
          assertType: 'visible', 
          description: 'Verify results container or "Results" text is visible' 
        }
      ],
      why: 'Search is the primary discovery tool. Broken search means users can\'t find content.'
    }));

    // Negative: Empty Search
    suggestions.push(createSug({
      title: 'Empty search is handled gracefully',
      description: 'Verify system doesn\'t crash when submitting an empty query',
      category: 'search',
      priority: 'low',
      icon: '🔎',
      intent: 'search_empty',
      isNegative: true,
      isExecutable: true,
      steps: [
        { action: 'click', target: s.searchSel, description: 'Focus search' },
        { action: 'click', target: s.btnSel, description: 'Click search button without input' },
        { 
          action: 'assert', 
          target: { primary: 'url', fallback: ['body'] }, 
          assertType: 'visible', 
          description: 'Verify page remains stable and responsive' 
        }
      ],
      why: 'Prevents server-side errors (500s) on empty queries.'
    }));
  }

  // ── 3. Navigation Flows ──
  if (has('navigation')) {
    const nav = get('navigation');
    nav.links.slice(0, 2).forEach((link: any) => {
      if (!link.href || link.href.includes('#')) return;
      suggestions.push(createSug({
        title: `Navigate to ${link.text}`,
        description: `Verify clicking "${link.text}" leads to the correct page`,
        category: 'navigation',
        priority: 'medium',
        icon: '🧭',
        intent: 'navigation_link',
        isExecutable: true,
        steps: [
          { action: 'click', target: link.sel, description: `Click ${link.text}` },
          { action: 'assert', target: { primary: 'url', fallback: [] }, value: link.href, assertType: 'url', description: `Verify URL contains ${link.href}` }
        ],
        why: 'Core navigation path. Broken links lead to a poor user experience.'
      }));
    });
  }

  // ── 4. Form Flows ──
  getAll('form').slice(0, 2).forEach(form => {
    suggestions.push(createSug({
      title: `Submit "${form.label}" form`,
      description: `Verify that the ${form.label} form can be filled and submitted`,
      category: 'form',
      priority: 'high',
      icon: '📋',
      intent: 'form_submission',
      isExecutable: true,
      confidence: { detection: 0.8, selector: 0.7, outcome: 0.4 },
      steps: [
        { action: 'fill', target: form.firstInputSel, value: 'Test Input', description: 'Fill first field' },
        { action: 'click', target: form.btnSel, description: 'Submit form' },
        { action: 'wait', value: '1000', description: 'Wait for response' },
        { 
          action: 'assert', 
          target: { primary: 'body', fallback: ['text:has-text("Success")', 'text:has-text("Thank you")', '[class*="success" i]'] }, 
          assertType: 'visible', 
          description: 'Verify success message or redirect' 
        }
      ],
      why: 'Forms are lead generation points. A broken form is a lost conversion.'
    }));
  });

  // ── 5. Generic UI ──
  getAll('cta').slice(0, 2).forEach(cta => {
    suggestions.push(createSug({
      title: `Main CTA: "${cta.label}"`,
      description: `Verify the primary call-to-action is functional`,
      category: 'ui',
      priority: 'medium',
      icon: '🖱️',
      intent: 'cta_click',
      isExecutable: true,
      steps: [
        { action: 'click', target: cta.btnSel, description: `Click ${cta.label}` },
        { action: 'wait', value: '500', description: 'Wait for interaction' }
      ],
      why: 'High-visibility CTAs drive the main user journeys.'
    }));
  });

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