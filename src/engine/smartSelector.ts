import { Page, Locator } from 'playwright';

// ── Multi-strategy selector resolution ────────────────────────────────────────

export interface SelectorStrategy {
  value: string;
  type: 'css' | 'text' | 'role' | 'xpath' | 'label' | 'placeholder' | 'testid';
  priority: number;
}

export interface SmartSelector {
  strategies: SelectorStrategy[];
  originalText?: string;
  tagHint?: string;
}

/**
 * Build multiple selector strategies from a single selector string.
 * This gives the runtime 5–8 ways to find the element.
 */
export function buildStrategies(selector: string, context?: { text?: string; tag?: string }): SelectorStrategy[] {
  const strategies: SelectorStrategy[] = [];
  let priority = 1;

  if (!selector) return strategies;

  // Original selector always first
  strategies.push({ value: selector, type: 'css', priority: priority++ });

  // data-testid
  const testIdMatch = selector.match(/\[data-testid=['"]?([^'"]+)['"]?\]/);
  if (testIdMatch) {
    strategies.push({ value: `[data-testid="${testIdMatch[1]}"]`, type: 'testid', priority: priority++ });
  }

  // id selector → also try as attribute
  const idMatch = selector.match(/^#([\w-]+)$/);
  if (idMatch) {
    strategies.push({ value: `[id="${idMatch[1]}"]`, type: 'css', priority: priority++ });
    strategies.push({ value: `xpath=//*[@id='${idMatch[1]}']`, type: 'xpath', priority: priority++ });
  }

  // name attribute
  const nameMatch = selector.match(/\[name=['"]?([^'"]+)['"]?\]/);
  if (nameMatch) {
    strategies.push({ value: `[name="${nameMatch[1]}"]`, type: 'css', priority: priority++ });
    strategies.push({ value: `xpath=//*[@name='${nameMatch[1]}']`, type: 'xpath', priority: priority++ });
  }

  // aria-label
  const ariaMatch = selector.match(/\[aria-label=['"]([^'"]+)['"]\]/);
  if (ariaMatch) {
    strategies.push({ value: `[aria-label="${ariaMatch[1]}"]`, type: 'css', priority: priority++ });
    strategies.push({ value: `xpath=//*[@aria-label='${ariaMatch[1]}']`, type: 'xpath', priority: priority++ });
  }

  // placeholder
  const phMatch = selector.match(/\[placeholder=['"]?([^'"]+)['"]?\]/);
  if (phMatch) {
    strategies.push({ value: `[placeholder="${phMatch[1]}"]`, type: 'placeholder', priority: priority++ });
    strategies.push({ value: `xpath=//*[@placeholder='${phMatch[1]}']`, type: 'xpath', priority: priority++ });
  }

  // has-text → also try role-based and xpath
  const hasTextMatch = selector.match(/:has-text\(['"]([^'"]+)['"]\)/);
  if (hasTextMatch) {
    const txt = hasTextMatch[1];
    const tag = selector.split(':')[0];
    strategies.push({ value: `${tag}:has-text("${txt}")`, type: 'text', priority: priority++ });
    strategies.push({ value: `xpath=//${tag || '*'}[contains(normalize-space(text()),'${txt}')]`, type: 'xpath', priority: priority++ });
    strategies.push({ value: `xpath=//${tag || '*'}[contains(@value,'${txt}')]`, type: 'xpath', priority: priority++ });
  }

  // From context text
  if (context?.text) {
    const t = context.text;
    const tag = context.tag ?? '*';
    strategies.push({ value: `${tag}:has-text("${t}")`, type: 'text', priority: priority++ });
    strategies.push({ value: `xpath=//${tag}[contains(normalize-space(.),'${t}')]`, type: 'xpath', priority: priority++ });
  }

  return strategies;
}

// ── Smart element resolver with retry + auto-heal ─────────────────────────────

export interface ResolveOptions {
  timeout?: number;
  retries?: number;
  waitForVisible?: boolean;
  scrollIntoView?: boolean;
}

export async function resolveElement(
  page: Page,
  selector: string,
  options: ResolveOptions = {}
): Promise<{ locator: Locator; usedStrategy: string }> {
  const { timeout = 8000, retries = 3, waitForVisible = true } = options;
  const strategies = buildStrategies(selector);
  const errors: string[] = [];

  for (let attempt = 0; attempt < retries; attempt++) {
    for (const strategy of strategies) {
      try {
        const locator = page.locator(strategy.value).first();
        await locator.waitFor({ state: waitForVisible ? 'visible' : 'attached', timeout: Math.floor(timeout / strategies.length) });
        return { locator, usedStrategy: strategy.value };
      } catch {
        errors.push(`${strategy.value}: not found`);
      }
    }

    // Auto-heal: try fuzzy DOM scan on last attempt
    if (attempt === retries - 2) {
      const healed = await autoHeal(page, selector);
      if (healed) {
        try {
          const locator = page.locator(healed).first();
          await locator.waitFor({ state: 'visible', timeout: 3000 });
          console.log(`[AutoHeal] "${selector}" → "${healed}"`);
          return { locator, usedStrategy: healed };
        } catch {}
      }
    }

    if (attempt < retries - 1) {
      await page.waitForTimeout(500 * (attempt + 1));
    }
  }

  throw new Error(
    `Element not found after ${retries} attempts.\n` +
    `Selector: "${selector}"\n` +
    `Tried strategies: ${strategies.map(s => s.value).join(', ')}\n` +
    `Possible causes: selector changed, element hidden behind modal, page not fully loaded`
  );
}

// ── Auto-heal: fuzzy DOM matching ─────────────────────────────────────────────

async function autoHeal(page: Page, selector: string): Promise<string | null> {
  try {
    // Extract meaningful tokens from selector
    const tokens = extractTokens(selector);
    if (tokens.length === 0) return null;

    const candidates = await page.evaluate((toks: string[]) => {
      const results: string[] = [];
      const all = Array.from(document.querySelectorAll('button, a, input, select, textarea, [role="button"], [tabindex]'));

      for (const el of all) {
        const text = (el as HTMLElement).innerText?.trim() ?? '';
        const id = el.id ?? '';
        const name = (el as HTMLInputElement).name ?? '';
        const ph = (el as HTMLInputElement).placeholder ?? '';
        const aria = el.getAttribute('aria-label') ?? '';
        const val = (el as HTMLInputElement).value ?? '';

        for (const tok of toks) {
          const tokLower = tok.toLowerCase();
          if (
            text.toLowerCase().includes(tokLower) ||
            id.toLowerCase().includes(tokLower) ||
            name.toLowerCase().includes(tokLower) ||
            ph.toLowerCase().includes(tokLower) ||
            aria.toLowerCase().includes(tokLower) ||
            val.toLowerCase().includes(tokLower)
          ) {
            // Build best selector for this element
            if (el.id) results.push(`#${CSS.escape(el.id)}`);
            else if (aria) results.push(`[aria-label="${aria}"]`);
            else if (name) results.push(`[name="${name}"]`);
            else if (text) results.push(`${el.tagName.toLowerCase()}:has-text("${text.slice(0, 40)}")`);
            break;
          }
        }
      }
      return [...new Set(results)].slice(0, 3);
    }, tokens);

    return candidates[0] ?? null;
  } catch {
    return null;
  }
}

function extractTokens(selector: string): string[] {
  const tokens: string[] = [];
  // Text from has-text
  const t = selector.match(/:has-text\(['"]([^'"]+)['"]\)/);
  if (t) tokens.push(t[1]);
  // id
  const id = selector.match(/^#([\w-]+)/);
  if (id) tokens.push(id[1].replace(/-/g, ' '));
  // aria-label
  const aria = selector.match(/aria-label=['"]([^'"]+)['"]/);
  if (aria) tokens.push(aria[1]);
  // placeholder
  const ph = selector.match(/placeholder=['"]([^'"]+)['"]/);
  if (ph) tokens.push(ph[1]);
  // name
  const name = selector.match(/\[name=['"]?([^'"]+)['"]?\]/);
  if (name) tokens.push(name[1]);
  return tokens.filter(t => t.length > 1);
}

// ── Smart wait utilities ──────────────────────────────────────────────────────

export async function smartWait(page: Page, hint?: string): Promise<void> {
  try {
    // Wait for network to settle (max 5s)
    await Promise.race([
      page.waitForLoadState('networkidle', { timeout: 5000 }),
      page.waitForLoadState('domcontentloaded', { timeout: 5000 }),
    ]);
  } catch {}

  // If hint mentions a text, wait for it
  if (hint) {
    const textMatch = hint.match(/['"]([^'"]{3,})['"]/);
    if (textMatch) {
      try {
        await page.waitForSelector(`text=${textMatch[1]}`, { timeout: 3000 });
      } catch {}
    }
  }
}

// ── Retry wrapper ─────────────────────────────────────────────────────────────

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  label = 'step'
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (i < retries - 1) {
        console.log(`[Retry ${i + 1}/${retries}] ${label}: ${lastError.message.slice(0, 80)}`);
        await new Promise(r => setTimeout(r, 600 * (i + 1)));
      }
    }
  }

  throw lastError!;
}

// ── Framework detector ────────────────────────────────────────────────────────

export async function detectFramework(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const frameworks: string[] = [];
    if ((window as any).React || document.querySelector('[data-reactroot], [data-react-helmet]')) frameworks.push('React');
    if ((window as any).angular || document.querySelector('[ng-version], [ng-app]')) frameworks.push('Angular');
    if ((window as any).__vue__ || (window as any).Vue || document.querySelector('[data-v-]')) frameworks.push('Vue');
    if ((window as any).next || document.querySelector('#__NEXT_DATA__')) frameworks.push('Next.js');
    if ((window as any).Nuxt) frameworks.push('Nuxt');
    if ((window as any).Ember) frameworks.push('Ember');
    return frameworks;
  });
}