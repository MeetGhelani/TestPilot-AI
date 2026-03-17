import type { Platform, TestPlan, TestStep } from '../types/index';
import { loadSelectors } from '../scanner/siteScanner';
import * as path from 'path';

// ─── Token helpers ────────────────────────────────────────────────────────────

function lower(s: string) { return s.toLowerCase(); }

function extractQuoted(s: string): string | undefined {
  const m = s.match(/["'`]([^"'`]+)["'`]/);
  return m ? m[1] : undefined;
}

function extractUrl(s: string): string | undefined {
  const m = s.match(/https?:\/\/[^\s"']+/);
  return m ? m[0] : undefined;
}

function nounAfter(s: string, keyword: string): string | undefined {
  const re = new RegExp(`${keyword}\\s+(?:the\\s+|a\\s+)?([\\w\\s-]+?)(?:\\s+(?:is|are|should|button|field|link|page|screen)|[,.!?]|$)`, 'i');
  const m = s.match(re);
  return m ? m[1].trim() : undefined;
}

// ─── Selector heuristics ──────────────────────────────────────────────────────

// Map common English words to real HTML/CSS selectors
const SEMANTIC_SELECTORS: Record<string, string> = {
  header:     'header, [role="banner"], #header, .header',
  footer:     'footer, [role="contentinfo"], #footer, .footer',
  navigation: 'nav, [role="navigation"], #nav, .nav, .navigation',
  nav:        'nav, [role="navigation"]',
  menu:       'nav, [role="navigation"], .menu, #menu',
  logo:       '.logo, #logo, [class*="logo"]',
  banner:     '[role="banner"], .banner, header',
  main:       'main, [role="main"], #main, .main',
  hero:       '[class*="hero"], [class*="banner"], .slider, .carousel',
  form:       'form',
  search:     '[role="search"], input[type="search"], .search',
  button:     'button:visible',
  title:      'h1, h2, [class*="title"]',
  heading:    'h1, h2, h3',
  image:      'img:visible',
  link:       'a:visible',
  cart:       '[class*="cart"], [aria-label*="cart" i]',
  login:      '[class*="login"], [href*="login"]',
};

function selectorFor(noun: string, type: 'button' | 'input' | 'link' | 'element'): string {
  const n = lower(noun);
  // Check semantic map first
  if (SEMANTIC_SELECTORS[n]) return SEMANTIC_SELECTORS[n];
  if (type === 'button') return `button:has-text("${noun}"), [role="button"]:has-text("${noun}"), input[value="${noun}"]`;
  if (type === 'input')  return `input[placeholder*="${noun}" i], input[name*="${n}"], label:has-text("${noun}") + input, textarea[placeholder*="${noun}" i]`;
  if (type === 'link')   return `a:has-text("${noun}")`;
  return `[aria-label*="${noun}" i], [class*="${n}"], #${n}`;
}

// ─── Intent recognisers ───────────────────────────────────────────────────────

interface Intent {
  type: string;
  subject?: string;
  value?: string;
  url?: string;
}

function recognise(sentence: string): Intent {
  const s = lower(sentence);
  const quoted = extractQuoted(sentence);
  const url = extractUrl(sentence);

  if (/\b(go to|navigate to|open|visit|load|navigate)\b/.test(s)) {
    const extracted = url ?? extractQuoted(sentence);
    const isRealUrl = extracted && /^https?:\/\//.test(extracted);
    return { type: 'navigate', url: isRealUrl ? extracted : undefined };
  }

  if (/\b(log ?in|sign ?in|login)\b/.test(s))
    return { type: 'login', value: quoted };

  if (/\bsearch\b/.test(s))
    return { type: 'search', value: quoted ?? nounAfter(sentence, 'for') };

  if (/\b(fill|type|enter|input|write)\b/.test(s)) {
    const field = nounAfter(sentence, '(?:in(?:to)?|the|field)');
    return { type: 'fill', subject: field, value: quoted };
  }

  if (/\b(click|tap|press|select|choose|hit)\b/.test(s)) {
    const target = quoted ?? nounAfter(sentence, '(?:click|tap|press|on|the)');
    return { type: 'click', subject: target };
  }

  if (/\bscroll\b/.test(s))
    return { type: 'scroll', subject: nounAfter(sentence, '(?:to|down to|up to)') };

  if (/\b(wait|pause)\b/.test(s))
    return { type: 'wait', value: sentence.match(/(\d+)/)?.[1] };

  if (/\b(verify|check|assert|ensure|confirm|see|should|expect)\b/.test(s)) {
    if (/\b(url|address|path)\b/.test(s))  return { type: 'assert_url',   value: url ?? quoted };
    if (/\b(title|heading|tab)\b/.test(s)) return { type: 'assert_title', value: quoted };
    if (/\b(visible|present|exist|appear|show|is there)\b/.test(s))
      return { type: 'assert_visible', subject: quoted ?? nounAfter(sentence, '(?:the|that|for)') };
    return { type: 'assert_text', subject: nounAfter(sentence, '(?:the|that)'), value: quoted };
  }

  if (/\b(screenshot|capture|snapshot)\b/.test(s))
    return { type: 'screenshot' };

  // Fallback for compound "and verify" sentences
  if (s.startsWith('verify ') || s.startsWith('check ')) {
     return { type: 'assert_text', value: quoted ?? sentence.replace(/^(verify|check)\s+/, '') };
  }

  return { type: 'assert_text', value: quoted ?? sentence };
}

// ─── Intent → TestStep(s) ─────────────────────────────────────────────────────

function intentToSteps(intent: Intent, platform: Platform, target: string): TestStep[] {
  switch (intent.type) {

    case 'navigate':
      return [{ action: 'navigate', value: intent.url ?? target, description: `Navigate to ${intent.url ?? target}` }];

    case 'login':
      if (platform === 'web') return [
        { action: 'assert_visible', target: selectorFor('Email', 'input'),    description: 'Verify email field is visible' },
        { action: 'fill',  target: selectorFor('Email', 'input'),    value: intent.value ?? 'user@example.com', description: 'Fill email field' },
        { action: 'fill',  target: selectorFor('Password', 'input'), value: 'password',                         description: 'Fill password field' },
        { action: 'click', target: selectorFor('Sign in', 'button'),                                             description: 'Click sign in button' },
        { action: 'wait',  value: '3000',                                                                        description: 'Wait for login to process' },
        { action: 'screenshot', description: 'Screenshot after login attempt' },
        { action: 'assert_text', target: 'body', value: 'Log out', description: 'Confirm login success (Log out visible)' },
      ];
      return [
        { action: 'fill',  target: '~emailInput',    value: intent.value ?? 'user@example.com', description: 'Fill email' },
        { action: 'fill',  target: '~passwordInput', value: 'password',                         description: 'Fill password' },
        { action: 'click', target: '~loginButton',                                               description: 'Tap login button' },
        { action: 'wait',  value: '2000',                                                        description: 'Wait for login' },
      ];

    case 'search':
      return [
        { action: 'click', target: selectorFor('Search', 'input'), description: 'Focus the search field' },
        { action: 'fill',  target: selectorFor('Search', 'input'), value: intent.value ?? '', description: `Type "${intent.value ?? ''}" in search` },
        { action: 'click', target: `button[type="submit"], [aria-label="Search"]`,             description: 'Submit search' },
        { action: 'screenshot', description: 'Screenshot of search results' },
      ];

    case 'fill':
      return [{ action: 'fill', target: intent.subject ? selectorFor(intent.subject, 'input') : 'input:visible', value: intent.value ?? '', description: `Fill "${intent.subject ?? 'field'}" with "${intent.value ?? ''}"` }];

    case 'click':
      return [{ action: 'click', target: intent.subject ? selectorFor(intent.subject, 'button') : 'button:visible', description: `Click "${intent.subject ?? 'element'}"` }];

    case 'scroll':
      return [{ action: 'scroll', target: intent.subject ? selectorFor(intent.subject, 'element') : undefined, description: `Scroll to ${intent.subject ?? 'bottom of page'}` }];

    case 'wait':
      return [{ action: 'wait', value: intent.value ?? '1000', description: `Wait ${intent.value ?? 1000}ms` }];

    case 'assert_url':
      return [{ action: 'assert_url', value: intent.value, description: `Assert URL contains "${intent.value ?? ''}"` }];

    case 'assert_title':
      return [{ action: 'assert_title', value: intent.value, description: `Assert page title contains "${intent.value ?? ''}"` }];

    case 'assert_visible': {
      const sel = intent.subject ? selectorFor(intent.subject, 'element') : 'body';
      return [{ action: 'assert_visible', target: sel, description: `Assert "${intent.subject ?? 'page'}" is visible` }];
    }

    case 'assert_text':
      return [{ action: 'assert_text', target: intent.subject ? selectorFor(intent.subject, 'element') : 'body', value: intent.value, description: `Assert text "${intent.value ?? ''}" is present` }];

    case 'screenshot':
      return [{ action: 'screenshot', description: 'Take a screenshot' }];

    default:
      return [];
  }
}

// ─── Split compound sentences ─────────────────────────────────────────────────

function splitSentences(text: string): string[] {
  return text
    .split(/[.,]|\band then\b|\bthen\b|\bafter that\b|\bnext\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateTestPlan(
  naturalLanguage: string,
  platform: Platform,
  target: string
): Promise<TestPlan> {
  // Merge saved site-specific selectors into the semantic map
  const saved = loadSelectors(path.join(process.cwd(), 'reports'));
  Object.entries(saved).forEach(([key, sel]) => {
    SEMANTIC_SELECTORS[key.replace(/_/g, ' ')] = sel;
    SEMANTIC_SELECTORS[key] = sel;
  });

  const sentences = splitSentences(naturalLanguage);
  const steps: TestStep[] = [];

  const hasNavigate = sentences.some((s) => /\b(go to|navigate|open|visit|load)\b/i.test(s));
  if (!hasNavigate && platform === 'web') {
    steps.push({ action: 'navigate', value: target, description: `Navigate to ${target}` });
  }

  for (const sentence of sentences) {
    const intent = recognise(sentence);
    steps.push(...intentToSteps(intent, platform, target));
  }

  steps.push({ action: 'screenshot', description: 'Final screenshot' });

  const title = naturalLanguage.length > 60 ? naturalLanguage.slice(0, 57) + '...' : naturalLanguage;
  return { title, platform, naturalLanguageInput: naturalLanguage, steps };
}