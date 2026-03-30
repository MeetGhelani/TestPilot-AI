import { Page, Locator, FrameLocator } from 'playwright';

// ── Multi-strategy selector resolution ────────────────────────────────────────

export interface SelectorStrategy {
  value: string;
  type: 'css' | 'text' | 'role' | 'xpath' | 'label' | 'placeholder' | 'testid';
}

/**
 * Build multiple selector strategies from a single selector string (Legacy support).
 */
export function buildStrategies(selector: string): SelectorStrategy[] {
  const strategies: SelectorStrategy[] = [];

  if (!selector) return strategies;

  // Original selector always first
  strategies.push({ value: selector, type: 'css' });

  // data-testid
  const testIdMatch = selector.match(/\[data-testid=['"]?([^'"]+)['"]?\]/);
  if (testIdMatch) {
    strategies.push({ value: `[data-testid="${testIdMatch[1]}"]`, type: 'testid' });
  }

  // id selector → also try as attribute
  const idMatch = selector.match(/^#([\w-]+)$/);
  if (idMatch) {
    strategies.push({ value: `[id="${idMatch[1]}"]`, type: 'css' });
    strategies.push({ value: `xpath=//*[@id='${idMatch[1]}']`, type: 'xpath' });
  }

  // has-text
  const hasTextMatch = selector.match(/:has-text\(['"]([^'"]+)['"]\)/);
  if (hasTextMatch) {
    const txt = hasTextMatch[1];
    const tag = selector.split(':')[0];
    strategies.push({ value: `${tag || '*'}:has-text("${txt}")`, type: 'text' });
    strategies.push({ value: `xpath=//${tag || '*'}[contains(normalize-space(text()),'${txt}')]`, type: 'xpath' });
  }

  return strategies;
}

// ── Smart element resolver with strictness & actionability ────────────────────

export interface ResolveOptions {
  timeout?: number;
  retries?: number;
  waitForVisible?: boolean;
  frame?: string;
}

export async function resolveElement(
  page: Page,
  target: string | { primary: string; fallback: string[] },
  options: ResolveOptions = {}
): Promise<{ locator: Locator; usedStrategy: string; selectionTrace: string }> {
  const { timeout = 10000, retries = 3, waitForVisible = true, frame } = options;
  
  // 1. Prepare strategies
  let strategies: string[] = [];
  if (typeof target === 'string') {
    strategies = buildStrategies(target).map(s => s.value);
  } else {
    strategies = [target.primary, ...target.fallback];
  }

  const selectionTrace: string[] = [];
  const root: Page | FrameLocator = frame ? page.frameLocator(frame) : page;

  for (let attempt = 0; attempt < retries; attempt++) {
    // A. Wait for DOM stability first
    await waitForStability(page);

    for (const strategy of strategies) {
      try {
        const locator = root.locator(strategy);
        const count = await locator.count();
        
        if (count === 0) {
          selectionTrace.push(`${strategy}: not found`);
          continue;
        }

        // B. Strict Resolution: Pick the best one if multiple matches
        let bestMatch = locator.first();
        if (count > 1) {
          selectionTrace.push(`${strategy}: ${count} matches found, disambiguating...`);
          // Prioritize visible element
          for (let i = 0; i < count; i++) {
            const candidate = locator.nth(i);
            if (await candidate.isVisible()) {
              bestMatch = candidate;
              selectionTrace.push(`${strategy}: picked match #${i} (visible)`);
              break;
            }
          }
        }

        // C. Actionability Checks
        await bestMatch.waitFor({ 
          state: waitForVisible ? 'visible' : 'attached', 
          timeout: 2000 
        });

        return { 
          locator: bestMatch, 
          usedStrategy: strategy, 
          selectionTrace: selectionTrace.join('; ') 
        };
      } catch (e) {
        selectionTrace.push(`${strategy}: failed actionability`);
      }
    }

    // D. Weighted Auto-Heal (on last attempt)
    if (attempt === retries - 1 && typeof target !== 'string') {
      const healed = await autoHealScored(page, target.primary);
      if (healed && healed.score > 0.5) {
        selectionTrace.push(`Auto-Heal triggered: ${healed.selector} (score: ${healed.score})`);
        try {
          const loc = root.locator(healed.selector).first();
          await loc.waitFor({ state: 'visible', timeout: 3000 });
          return { locator: loc, usedStrategy: healed.selector, selectionTrace: selectionTrace.join('; ') };
        } catch {}
      } else if (healed) {
        selectionTrace.push(`Auto-Heal candidate too low confidence: ${healed.score}`);
      }
    }

    if (attempt < retries - 1) {
      await page.waitForTimeout(1000 * (attempt + 1));
    }
  }

  throw new Error(
    `Failed to resolve element.\n` +
    `Target: ${JSON.stringify(target)}\n` +
    `Trace: ${selectionTrace.slice(-5).join(' -> ')}`
  );
}

// ── DOM Stability Helper ──────────────────────────────────────────────────────

async function waitForStability(page: Page, timeout = 2000): Promise<void> {
  try {
    await page.evaluate((to) => {
      return new Promise<void>((resolve) => {
        let timeoutId = setTimeout(resolve, to);
        const observer = new MutationObserver(() => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            observer.disconnect();
            resolve();
          }, 300); // 300ms of quietude
        });
        observer.observe(document.body, { attributes: true, childList: true, subtree: true });
        // Max wait if it never stops mutating
        setTimeout(() => {
          observer.disconnect();
          resolve();
        }, to);
      });
    }, timeout);
  } catch {}
}

// ── Weighted Auto-Heal Analytics ──────────────────────────────────────────────

async function autoHealScored(page: Page, primarySelector: string): Promise<{ selector: string; score: number } | null> {
  try {
    const tokens = extractTokens(primarySelector);
    if (tokens.length === 0) return null;

    const candidates = await page.evaluate((toks: string[]) => {
      const all = Array.from(document.querySelectorAll('button, a, input, select, textarea, [role="button"]'));
      const scores = all.map(el => {
        let score = 0;
        const text = el.textContent?.trim() || '';
        const id = el.id || '';
        const name = el.getAttribute('name') || '';
        const aria = el.getAttribute('aria-label') || '';

        for (const tok of toks) {
          const t = tok.toLowerCase();
          if (text.toLowerCase() === t) score += 0.8;
          else if (text.toLowerCase().includes(t)) score += 0.4;
          
          if (id.toLowerCase().includes(t)) score += 0.5;
          if (name.toLowerCase().includes(t)) score += 0.5;
          if (aria.toLowerCase().includes(t)) score += 0.6;
        }

        // Penalty for hidden elements
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') score *= 0.1;

        // Build a good selector for it
        let selector = el.tagName.toLowerCase();
        if (el.id) selector = `#${CSS.escape(el.id)}`;
        else if (aria) selector = `[aria-label="${aria}"]`;
        else if (text) selector = `${el.tagName.toLowerCase()}:has-text("${text.slice(0, 30)}")`;

        return { selector, score };
      });

      return scores.sort((a, b) => b.score - a.score)[0];
    }, tokens);

    return candidates || null;
  } catch {
    return null;
  }
}

function extractTokens(selector: string): string[] {
  const tokens: string[] = [];
  const textMatch = selector.match(/["']([^"']{3,})["']/);
  if (textMatch) tokens.push(textMatch[1]);
  
  const idMatch = selector.match(/#([\w-]+)/);
  if (idMatch) tokens.push(idMatch[1].replace(/-/g, ' '));
  
  const attrMatch = selector.match(/\[.*=['"]?([^'"]+)['"]?\]/);
  if (attrMatch) tokens.push(attrMatch[1]);

  return tokens.filter(t => t.length > 2);
}

// ── Smart wait & retry utilities ──────────────────────────────────────────────

export async function smartWait(page: Page): Promise<void> {
  try {
    await Promise.race([
      page.waitForLoadState('networkidle', { timeout: 4000 }),
      page.waitForLoadState('domcontentloaded', { timeout: 4000 }),
    ]).catch(() => {});
    await waitForStability(page, 1000);
  } catch {}
}

export async function withRetry<T>(fn: () => Promise<T>, retries = 3, label = 'step'): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i < retries - 1) {
        console.log(`[Retry ${i+1}/${retries}] ${label}`);
        await new Promise(r => setTimeout(r, 800 * (i + 1)));
      }
    }
  }
  throw lastError;
}

export async function detectFramework(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const frameworks: string[] = [];
    if ((window as any).React || document.querySelector('[data-reactroot]')) frameworks.push('React');
    if ((window as any).angular || document.querySelector('[ng-version]')) frameworks.push('Angular');
    if ((window as any).__vue__ || (window as any).Vue) frameworks.push('Vue');
    if ((window as any).next || document.querySelector('#__NEXT_DATA__')) frameworks.push('Next.js');
    if ((window as any).Nuxt) frameworks.push('Nuxt');
    return frameworks;
  });
}