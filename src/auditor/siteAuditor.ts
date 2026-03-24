import { chromium, Page, Browser } from 'playwright';
import type { AuditResult, AuditIssue, AuditCategory, AuditPersona } from '../types/index';
import { deviceProfiles } from './deviceProfiles';

export interface AuditAuth {
  username?: string;
  password?: string;
}


export interface AuditOptions {
  auth?: AuditAuth;
  persona?: AuditPersona;
  includeSeo?: boolean;
  includeAccessibility?: boolean;
  profile?: string;
}

export async function runFullAudit(url: string, options: AuditOptions = {}): Promise<AuditResult> {
  const { auth, persona = 'all', includeSeo = true, includeAccessibility = true, profile: profileName = 'desktop' } = options;
  const profile = deviceProfiles[profileName] || deviceProfiles.desktop;

  let cleanUrl = url;
  let username = auth?.username;
  let password = auth?.password;

  try {
    const parsed = new URL(url);
    if (parsed.username) {
      if (!username) username = decodeURIComponent(parsed.username);
      if (!password) password = decodeURIComponent(parsed.password);
      parsed.username = ''; parsed.password = '';
      cleanUrl = parsed.toString();
    }
  } catch { }

  const httpCredentials = (username || password)
    ? { username: username ?? '', password: password ?? '' }
    : undefined;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: profile.viewport,
    userAgent: profile.userAgent,
    httpCredentials
  });
  const page = await context.newPage();
  const client = await page.context().newCDPSession(page);

  // Apply CPU Throttling
  if (profile.cpuSlowdown > 1) {
    await client.send('Emulation.setCPUThrottlingRate', {
      rate: profile.cpuSlowdown
    });
  }

  // Apply Network Throttling
  if (profile.network === '3g') {
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (500 * 1024) / 8, // 500kbps
      uploadThroughput: (500 * 1024) / 8,   // 500kbps
      latency: 400
    });
  } else if (profile.network === '4g') {
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (4 * 1024 * 1024) / 8, // 4Mbps
      uploadThroughput: (3 * 1024 * 1024) / 8,   // 3Mbps
      latency: 50
    });
  }

  const issues: { [key: string]: AuditIssue[] } = {
    functional: [],
    ui: [],
    links: [],
    console: [],
    performance: [],
    accessibility: [],
    seo: []
  };

  const categoryMetrics: { [key: string]: Record<string, string | number> } = {
    performance: {},
    links: {},
    accessibility: {},
    ui: {},
    console: {},
    functional: {},
    seo: {}
  };

  let siteAccessible = false;
  const apiFailures: { url: string; status: number }[] = [];

  // Monitor API failures
  page.on('response', response => {
    const rUrl = response.url();
    const status = response.status();
    const isApi = rUrl.includes('/api/') || rUrl.includes('/graphql') || rUrl.includes('v1/') || rUrl.includes('v2/');
    const isTracking = rUrl.includes('analytics') || rUrl.includes('google-analytics') || rUrl.includes('segment') || rUrl.includes('facebook.com') || rUrl.includes('hotjar');

    if (isApi && !isTracking && status >= 400) {
      apiFailures.push({ url: rUrl, status });
    }
  });

  // Monitor Console
  page.on('console', msg => {
    if (msg.type() === 'error') {
      issues.console.push({
        type: 'error',
        message: `Console Error: ${msg.text()}`,
        severity: 'moderate',
        impact: 'May break interactivity or cause hidden bugs.',
        recommendation: 'Check the browser console and fix JS errors.'
      });
    }
  });

  page.on('pageerror', err => {
    issues.console.push({
      type: 'error',
      message: `Uncaught Exception: ${err.message}`,
      severity: 'critical',
      impact: 'Often prevents the entire page or feature from working.',
      recommendation: 'Fix the crash in the source code.'
    });
  });

  try {
    // Inject script to track CLS
    await page.addInitScript(() => {
      (window as any).clsValue = 0;
      (window as any).layoutShiftEntries = [];
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            (window as any).clsValue += (entry as any).value;
            (window as any).layoutShiftEntries.push({
              value: (entry as any).value,
              sources: (entry as any).sources?.map((s: any) => ({
                node: s.node,
                selector: s.node ? (() => {
                  const el = s.node;
                  if (el.id) return `#${el.id}`;
                  let path = [];
                  let current: Element | null = el;
                  while (current && current !== document.body) {
                    let index = Array.from(current.parentElement?.children || []).indexOf(current) + 1;
                    path.unshift(`${current.tagName.toLowerCase()}:nth-child(${index})`);
                    current = current.parentElement;
                  }
                  return path.join(' > ');
                })() : null
              }))
            });
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });

    try {
      const response = await page.goto(cleanUrl, { waitUntil: 'load', timeout: 60000 });

      // Handle Authentication if requested
      if (auth?.username || auth?.password) {
        try {
          // Use locators to ensure visibility and avoid timeouts on hidden fields
          const userLocator = page.locator('input[type="text"], input[type="email"], input[name*="user"], input[name*="login"]').filter({ visible: true }).first();
          const passLocator = page.locator('input[type="password"]').filter({ visible: true }).first();

          if (await userLocator.count() > 0 && await passLocator.count() > 0) {
            if (auth.username) await userLocator.fill(auth.username, { timeout: 5000 });
            if (auth.password) await passLocator.fill(auth.password, { timeout: 5000 });

            // Try to find a submit button (visible only)
            const submitBtn = page.locator('button[type="submit"], input[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').filter({ visible: true }).first();
            if (await submitBtn.count() > 0) {
              await submitBtn.click({ timeout: 5000 });
              // Shorter navigation timeout for auth
              await page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }).catch(() => { });
            }
          }
        } catch (authErr) {
          issues.functional.push({
            type: 'warning',
            message: `Auth Attempt Failed: ${authErr instanceof Error ? authErr.message : String(authErr)}`,
            severity: 'moderate',
            impact: 'Audit might continue on a login page instead of the target content.',
            recommendation: 'Verify provided credentials and login field selectors.'
          });
        }
      }

      if (response) {
        siteAccessible = true;

        if (response.status() >= 400) {
          issues.functional.push({
            type: response.status() === 404 ? 'warning' : 'error',
            message: `Site returned HTTP status ${response.status()}`,
            severity: response.status() === 404 ? 'moderate' : 'high',
            confidence: 'high',
            impact: 'The server indicated an error, although the tool will attempt to audit any rendered content.',
            recommendation: 'Verify the URL routing and server configuration.',
            deduction: 15
          });
        }

        // 1. Blank Page Detection
        const pageContent = await page.evaluate(() => {
          const text = document.body.innerText || '';
          const hasVisibleElements = !!document.querySelector('img, button, a, svg, canvas');
          return { length: text.trim().length, hasVisibleElements };
        });

        if (pageContent.length < 50) {
          const isExtreme = pageContent.length < 5 && !pageContent.hasVisibleElements;
          issues.functional.push({
            type: 'error',
            message: "Page may not be rendered properly",
            severity: isExtreme ? 'critical' : 'high',
            confidence: 'medium',
            impact: 'Users see a nearly blank page, which usually indicates a JS crash or failed data fetch.',
            recommendation: 'Check for client-side errors or failed critical API requests.',
            deduction: isExtreme ? 20 : 10
          });
        }

        // 2. Redirect / Domain Validation
        const initialDomain = new URL(url).hostname;
        const finalUrl = page.url();
        const finalDomain = new URL(finalUrl).hostname;
        const errorPaths = ['/404', '/error', '/maintenance', '/oops', '/broken'];
        const isErrorRedirect = errorPaths.some(p => finalUrl.toLowerCase().includes(p));

        if (isErrorRedirect || (initialDomain !== finalDomain && !finalDomain.includes(initialDomain))) {
          issues.functional.push({
            type: 'error',
            message: isErrorRedirect ? "Unexpected redirect to error page" : "Unexpected domain change detected",
            url: finalUrl,
            severity: 'high',
            confidence: 'high',
            impact: 'Users are redirected away from the intended content, causing confusion and drop-offs.',
            recommendation: isErrorRedirect ? 'Check server-side routing and URL patterns.' : 'Verify if cross-domain redirects are intentional.',
            deduction: isErrorRedirect ? 25 : 15
          });
        }

        // 3. API Failures
        if (apiFailures.length > 0) {
          const deductionPerFailure = 8; // Avg of 5-10
          const totalApiDeduction = Math.min(30, apiFailures.length * deductionPerFailure);
          issues.functional.push({
            type: 'error',
            message: `${apiFailures.length} critical API request${apiFailures.length > 1 ? 's' : ''} failed`,
            severity: 'high',
            confidence: 'high',
            impact: 'Missing data or broken features due to failed backend communication.',
            recommendation: 'Inspect network tab and ensure backend services are healthy.',
            deduction: totalApiDeduction
          });
        }

      } else {
        throw new Error('No response received from server.');
      }
    } catch (err: any) {
      issues.functional.push({
        type: 'error',
        message: `Site Unreachable: ${err.message}`,
        severity: 'critical',
        impact: 'The tool cannot audit a site it cannot access.',
        recommendation: 'Verify the URL is correct and the server is online.'
      });
      siteAccessible = false;
    }

    if (siteAccessible) {
      // 1. Performance - Deep Dive + CDP Metrics
      const perfData = await page.evaluate(() => {
        const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0;
        const longTasks = performance.getEntriesByType('longtask') as any[];
        const tbt = longTasks.reduce((acc, task) => acc + (task.duration - 50), 0);

        return {
          loadTime: timing.loadEventEnd - timing.startTime,
          fcp,
          cls: (window as any).clsValue || 0,
          tbt,
          resourceCount: performance.getEntriesByType('resource').length,
          pageSize: performance.getEntriesByType('resource').reduce((acc, res: any) => {
            // transferSize is often 0 for CORS or cache, try encodedBodySize
            const size = (res.transferSize || res.encodedBodySize || res.decodedBodySize || 0);
            return acc + size;
          }, 0)
        };
      });

      // Extract Advanced CDP Metrics
      try {
        await client.send('Performance.enable');
        const cdpMetrics = await client.send('Performance.getMetrics');
        const getM = (name: string) => cdpMetrics.metrics.find(m => m.name === name)?.value || 0;

        categoryMetrics.performance = {
          'FCP': `${Math.round(perfData.fcp)}ms`,
          'TBT': `${Math.round(perfData.tbt)}ms`,
          'CLS': perfData.cls.toFixed(3),
          'Memory Usage': `${(getM('JSHeapUsedSize') / (1024 * 1024)).toFixed(1)} MB`,
          'DOM Nodes': Math.round(getM('Nodes')),
          'Page Size': `${(perfData.pageSize / (1024 * 1024)).toFixed(2)} MB`,
          'JS Heap Used': getM('JSHeapUsedSize') // raw value for scoring
        };
      } catch (cdpErr) {
        categoryMetrics.performance = {
          'FCP': `${Math.round(perfData.fcp)}ms`,
          'TBT': `${Math.round(perfData.tbt)}ms`,
          'CLS': perfData.cls.toFixed(3),
          'Page Size': `${(perfData.pageSize / (1024 * 1024)).toFixed(2)} MB`,
        };
      }

      // --- Performance Benchmarking & Scoring Fix (Enhanced) ---
      const m = categoryMetrics.performance;
      const fcp = perfData.fcp;
      const tbt = perfData.tbt;
      const cls = perfData.cls;
      const nodes = Number(m['DOM Nodes']) || 0;
      const sizeBytes = perfData.pageSize;

      // --- Collect Detailed Performance Data ---
      const advancedData = await page.evaluate(() => {
        const getSelector = (el: Element): string => {
          if (el.id) return `#${el.id}`;
          let path = [];
          let current: Element | null = el;
          while (current && current !== document.body) {
            let index = Array.from(current.parentElement?.children || []).indexOf(current) + 1;
            path.unshift(`${current.tagName.toLowerCase()}:nth-child(${index})`);
            current = current.parentElement;
          }
          return path.join(' > ');
        };

        const vh = window.innerHeight;
        const vw = window.innerWidth;

        const imgElements = Array.from(document.querySelectorAll('img'));
        const aboveTheFoldImages = imgElements
          .filter(img => {
            const rect = img.getBoundingClientRect();
            return rect.top < vh && rect.bottom > 0 && rect.left < vw && rect.right > 0 && rect.width > 20 && rect.height > 20;
          })
          .map(img => ({ url: img.src, selector: getSelector(img) }));

        const renderBlockingScripts = Array.from(document.querySelectorAll('head script[src]:not([async]):not([defer])'))
          .map(s => ({ url: (s as HTMLScriptElement).src, selector: getSelector(s) }));

        const renderBlockingStyles = Array.from(document.querySelectorAll('head link[rel="stylesheet"]'))
          .map(s => ({ url: (s as HTMLLinkElement).href, selector: getSelector(s) }));

        const topContainers = Array.from(document.body.querySelectorAll('div, section, main, article, nav, header, footer'))
          .map(el => ({ selector: getSelector(el), count: el.querySelectorAll('*').length }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);

        const layoutShifts = (window as any).layoutShiftEntries || [];
        const shiftSelectors = layoutShifts.flatMap((s: any) => s.sources?.map((src: any) => src.selector)).filter(Boolean);

        return { aboveTheFoldImages, renderBlockingScripts, renderBlockingStyles, topContainers, shiftSelectors };
      });

      // Helper to find resource size
      const resources = await page.evaluate(() => performance.getEntriesByType('resource').map(r => ({
        name: r.name,
        size: (r as any).transferSize || (r as any).encodedBodySize || 0
      })));

      const getResSize = (url: string) => resources.find(r => r.name === url)?.size || 0;

      // FCP Check (Enhanced)
      if (fcp > 3000) {
        const largestImg = advancedData.aboveTheFoldImages.sort((a, b) => getResSize(b.url) - getResSize(a.url))[0];
        issues.performance.push({
          type: 'error',
          message: `FCP is very poor: ${Math.round(fcp)}ms`,
          severity: 'critical',
          impact: 'Users perceive the page as slow or broken.',
          recommendation: largestImg ? `Optimize above-the-fold image: ${largestImg.url.split('/').pop()} and remove render-blocking resources.` : 'Optimize server response and remove render-blocking resources.',
          selector: largestImg?.selector || 'head'
        });
      } else if (fcp > 1800) {
        const firstStyle = advancedData.renderBlockingStyles[0];
        issues.performance.push({
          type: 'warning',
          message: `FCP needs improvement: ${Math.round(fcp)}ms`,
          severity: 'moderate',
          impact: 'Slow start can lead to user bounce.',
          recommendation: 'Reduce CSS/JS size and use font-display: swap.',
          selector: firstStyle?.selector || 'head'
        });
      }

      // TBT Check (Enhanced)
      if (tbt > 600) {
        const heavyScript = advancedData.renderBlockingScripts[0];
        issues.performance.push({
          type: 'error',
          message: `High Total Blocking Time: ${Math.round(tbt)}ms`,
          severity: 'critical',
          impact: 'Page is unresponsive during load.',
          recommendation: 'Split large JS bundles and use Web Workers.',
          selector: heavyScript?.selector || 'body'
        });
      } else if (tbt > 200) {
        issues.performance.push({
          type: 'warning',
          message: `TBT needs improvement: ${Math.round(tbt)}ms`,
          severity: 'moderate',
          impact: 'Input delay frustrates users.',
          recommendation: 'Optimize long JS tasks.',
          selector: 'body'
        });
      }

      // DOM Nodes Check (Enhanced)
      if (nodes > 3000) {
        issues.performance.push({
          type: 'error',
          message: `Excessive DOM size: ${nodes} nodes`,
          severity: 'critical',
          impact: 'Slows down style calculations and interactions.',
          recommendation: `Reduce elements in large containers like ${advancedData.topContainers[0]?.selector}.`,
          selector: advancedData.topContainers[0]?.selector || 'body'
        });
      } else if (nodes > 1500) {
        issues.performance.push({
          type: 'warning',
          message: `Large DOM size: ${nodes} nodes`,
          severity: 'moderate',
          impact: 'Can impact memory usage.',
          recommendation: 'Avoid deep nesting and flatten structure.',
          selector: advancedData.topContainers[0]?.selector || 'body'
        });
      }

      // Page Size Check (Enhanced)
      if (sizeBytes > 5 * 1024 * 1024) {
        issues.performance.push({
          type: 'error',
          message: `Very Large Page: ${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`,
          severity: 'critical',
          impact: 'High data usage and slow load times.',
          recommendation: 'Compress images and use modern formats (WebP).',
          selector: 'body'
        });
      } else if (sizeBytes > 2 * 1024 * 1024) {
        issues.performance.push({
          type: 'warning',
          message: `Large Page: ${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`,
          severity: 'moderate',
          impact: 'Slower experience on mobile.',
          recommendation: 'Optimize resources and use Gzip/Brotli.',
          selector: 'body'
        });
      }

      // CLS Check (Enhanced)
      if (cls > 0.1) {
        const targetSelector = advancedData.shiftSelectors[0] || 'body';
        issues.performance.push({
          type: cls > 0.25 ? 'error' : 'warning',
          message: `${cls > 0.25 ? 'Poor' : 'Improve'} CLS: ${cls.toFixed(3)}`,
          severity: cls > 0.25 ? 'critical' : 'moderate',
          impact: 'Layout shifts cause user frustration and misclicks.',
          recommendation: 'Set explicit dimensions for images and containers.',
          selector: targetSelector
        });
      }

      // 2. Broken Links
      const links = await page.evaluate(() => {
        const getSelector = (el: Element): string => {
          if (el.id) return `#${el.id}`;
          let path = [];
          let current: Element | null = el;
          while (current && current !== document.body) {
            let index = Array.from(current.parentElement?.children || []).indexOf(current) + 1;
            path.unshift(`${current.tagName.toLowerCase()}:nth-child(${index})`);
            current = current.parentElement;
          }
          return path.join(' > ');
        };

        return Array.from(document.querySelectorAll('a'))
          .map(a => ({ href: a.href, text: a.innerText.trim(), selector: getSelector(a) }))
          .filter(l => l.href.startsWith('http'));
      });

      const uniqueLinks = links.slice(0, 15);
      let brokenCount = 0;
      for (const link of uniqueLinks) {
        try {
          const response = await page.request.get(link.href, {
            timeout: 7000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9'
            }
          });

          const status = response.status();

          if (status >= 400) {
            brokenCount++;

            if (status === 403) {
              // Restricted Access
              issues.links.push({
                type: 'warning',
                message: `Restricted Access: Status 403 for "${link.text || 'Untitled Link'}"`,
                url: link.href,
                severity: 'low',
                impact: 'This link blocks automated requests (bots) but may still work for real users in a browser.',
                recommendation: 'Verify this link manually. Some sites like Udemy block automated validation.',
                selector: link.selector
              });
            } else {
              // Truly Broken
              issues.links.push({
                type: 'error',
                message: `Broken Link: Status ${status} for "${link.text || 'Untitled Link'}"`,
                url: link.href,
                severity: status === 404 ? 'moderate' : 'low',
                impact: status === 404 ? 'Users hit dead ends, hurting trust and SEO ranking.' : 'The server returned an error, which may be temporary.',
                recommendation: status === 404 ? 'Check if the URL has moved or been deleted.' : 'Verify if the destination server is experiencing issues.',
                selector: link.selector
              });
            }
          }
        } catch (err: any) {
          brokenCount++;
          issues.links.push({
            type: 'error',
            message: `Network Error: Could not reach "${link.text || 'Link'}"`,
            url: link.href,
            severity: 'low',
            impact: 'The destination server might be down or blocked.',
            recommendation: 'Verify the link URI is typed correctly.',
            selector: link.selector
          });
        }
      }

      categoryMetrics.links = {
        'Links Scanned': uniqueLinks.length,
        'Broken Links': brokenCount
      };

      if (includeAccessibility) {
        // 3. Accessibility - Tailored per Persona
        const a11yChecks = await page.evaluate((p) => {
          const results: { msg: string, impact: string, rec: string, sev: string, selector?: string }[] = [];
          const totalElements = document.querySelectorAll('*').length;

          const getSelector = (el: Element): string => {
            if (el.id) return `#${el.id}`;
            if (el === document.body) return 'body';

            let path = [];
            while (el.parentElement) {
              let index = Array.from(el.parentElement.children).filter(c => c.tagName === el.tagName).indexOf(el) + 1;
              path.unshift(`${el.tagName.toLowerCase()}:nth-of-type(${index})`);
              el = el.parentElement;
            }
            return path.join(' > ');
          };

          // 1. Image Check (Critical for Screen Readers)
          document.querySelectorAll('img:not([alt])').forEach(img => {
            results.push({
              msg: `Image missing alt text: ${img.getAttribute('src')?.split('/').pop()}`,
              impact: p === 'screen-reader' ? 'CRITICAL: Screen reader users have no idea what this image represents.' : 'Vision-impaired users using screen readers will have no idea what this image is.',
              rec: 'Add an alt="..." attribute describing the image content.',
              sev: p === 'screen-reader' ? 'critical' : 'moderate',
              selector: getSelector(img)
            });
          });

          // 2. Input Labels (Critical for Screen Readers & Keyboard users)
          document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])').forEach(input => {
            const id = input.id;
            if (!id || !document.querySelector(`label[for="${id}"]`)) {
              results.push({
                msg: `Form input missing label: "${(input as any).name || input.className}"`,
                impact: 'Screen readers and keyboard users cannot easily identify what this input is for.',
                rec: 'Add a <label> linked via the "for" attribute, or an aria-label.',
                sev: (p === 'screen-reader' || p === 'keyboard-only') ? 'critical' : 'moderate',
                selector: getSelector(input)
              });
            }
          });

          // 3. Headings (Important for Screen Reader navigation)
          const h1s = document.querySelectorAll('h1').length;
          if (h1s === 0) {
            results.push({
              msg: 'No H1 heading found',
              impact: 'Search engines and screen reader users cannot identify the main topic of the page.',
              rec: 'Add a single <h1> that summarizes the page content.',
              sev: p === 'screen-reader' ? 'moderate' : 'low'
            });
          }

          return { issues: results, totalChecked: totalElements };
        }, persona);

        a11yChecks.issues.forEach(check => {
          issues.accessibility.push({
            type: 'error',
            message: check.msg,
            severity: (check.sev as any) || 'moderate',
            impact: check.impact,
            recommendation: check.rec,
            selector: check.selector
          });
        });

        categoryMetrics.accessibility = {
          'Elements Checked': a11yChecks.totalChecked,
          'Accessibility Issues': a11yChecks.issues.length
        };
      }

      // 4. SEO - New Audit Category (Optional)
      if (includeSeo) {
        const seoData = await page.evaluate(() => {
          const title = document.title;
          const description = (document.querySelector('meta[name="description"]') as HTMLMetaElement)?.content || '';
          const canonical = (document.querySelector('link[rel="canonical"]') as HTMLLinkElement)?.href || '';
          const h1s = Array.from(document.querySelectorAll('h1'));
          const h2s = Array.from(document.querySelectorAll('h2')).length;
          const ogTitle = (document.querySelector('meta[property="og:title"]') as HTMLMetaElement)?.content || '';
          const ogDesc = (document.querySelector('meta[property="og:description"]') as HTMLMetaElement)?.content || '';

          return {
            title,
            description,
            canonical,
            h1Count: h1s.length,
            h1Text: h1s[0]?.innerText || '',
            h2Count: h2s,
            hasOG: !!(ogTitle || ogDesc)
          };
        });

        // Title Check
        if (!seoData.title) {
          issues.seo.push({
            type: 'error',
            message: 'Missing <title> tag',
            severity: 'critical',
            impact: 'Your site won\'t have a name in search results, severely hurting ranking and clicks.',
            recommendation: 'Add a descriptive <title> (50-60 characters) to your <head>.'
          });
        } else if (seoData.title.length < 10) {
          issues.seo.push({
            type: 'warning',
            message: `Title too short: "${seoData.title}"`,
            severity: 'low',
            impact: 'Vague titles are less likely to be clicked in search results.',
            recommendation: 'Expand the title to be more descriptive.'
          });
        }

        // Meta Description Check
        if (!seoData.description) {
          issues.seo.push({
            type: 'error',
            message: 'Missing Meta Description',
            severity: 'moderate',
            impact: 'Search engines will auto-generate a snippet, which might not be compelling to users.',
            recommendation: 'Add a <meta name="description"> (150-160 characters) to summarize your page.'
          });
        }

        // Heading Structure Check
        if (seoData.h1Count === 0) {
          issues.seo.push({
            type: 'error',
            message: 'No H1 Heading found',
            severity: 'moderate',
            impact: 'The H1 tag is a primary signal to search engines about what the page is about.',
            recommendation: 'Ensure your page has one primary <h1> containing your main keyword.'
          });
        } else if (seoData.h1Count > 1) {
          issues.seo.push({
            type: 'warning',
            message: `Multiple H1 tags (${seoData.h1Count}) found`,
            severity: 'low',
            impact: 'Using multiple H1s can dilute the focus of the page for search engines.',
            recommendation: 'Use only one <h1> and use <h2>-<h6> for sub-headings.'
          });
        }

        // Canonical Tag Check
        if (!seoData.canonical) {
          issues.seo.push({
            type: 'warning',
            message: 'No Canonical tag found',
            severity: 'moderate',
            impact: 'Prevents search engines from identifying the original source if your content is duplicated.',
            recommendation: 'Add <link rel="canonical" href="..."> to specify the preferred page URL.'
          });
        }

        // Open Graph Check
        if (!seoData.hasOG) {
          issues.seo.push({
            type: 'warning',
            message: 'Missing Open Graph tags',
            severity: 'low',
            impact: 'Your site won\'t look professional when shared on social media (no preview image/text).',
            recommendation: 'Add og:title and og:description tags for better social sharing.'
          });
        }

        // Check robots.txt and sitemap (Advanced)
        try {
          const baseUrl = new URL(url).origin;
          const robotsRes = await page.request.get(`${baseUrl}/robots.txt`).catch(() => null);
          const hasRobots = robotsRes && robotsRes.status() === 200;

          categoryMetrics.seo = {
            'Title Length': seoData.title.length,
            'H1 Count': seoData.h1Count,
            'H2 Count': seoData.h2Count,
            'Robots.txt': hasRobots ? 'Found' : 'Not Found',
            'OG Tags': seoData.hasOG ? 'Present' : 'Missing'
          };

          if (!hasRobots) {
            issues.seo.push({
              type: 'warning',
              message: 'Robots.txt missing at root',
              severity: 'low',
              impact: 'Search crawlers don\'t have explicit instructions on which parts of your site to ignore.',
              recommendation: 'Create a robots.txt file at your site root.'
            });
          }
        } catch (e) {
          categoryMetrics.seo['Robots.txt'] = 'Error';
        }
      }

      // 5. UI Checks
      const uiAudit = await page.evaluate(({ isMobile }) => {
        const results: { msg: string, imp: string, rec: string, sev: string, selector?: string, type: string }[] = [];
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const getSelector = (el: HTMLElement): string => {
          if (el.id) return `#${el.id}`;
          if (el === document.body) return 'body';
          let path = '';
          while (el && el.nodeType === Node.ELEMENT_NODE) {
            let selector = el.nodeName.toLowerCase();
            if (el.className) {
              const classes = Array.from(el.classList).join('.');
              if (classes) selector += `.${classes}`;
            }
            const sibs = Array.from(el.parentNode?.children || []);
            const index = sibs.indexOf(el) + 1;
            if (sibs.length > 1) selector += `:nth-child(${index})`;
            path = selector + (path ? '>' + path : '');
            el = el.parentNode as HTMLElement;
          }
          return path;
        };

        const interactive = document.querySelectorAll(`
          button, 
          [role="button"], 
          input[type="button"], 
          input[type="submit"], 
          a[href]
        `);

        // 1. Horizontal Overflow
        if (document.documentElement.scrollWidth > vw + 2) {
          results.push({
            type: 'layout',
            msg: 'Horizontal scroll detected',
            imp: 'Users have to scroll sideways, which is disruptive on mobile.',
            rec: 'Use responsive CSS like max-width: 100% on large containers.',
            sev: 'moderate'
          });
        }

        // 2. Small Tap Targets (Refined Logic - Mobile Only)
        if (isMobile) {
          interactive.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            // Process links (ignore inline text links)
            if (el.tagName === 'A') {
              const style = window.getComputedStyle(el);
              const isInline = style.display === 'inline';
              const hasParentText = el.closest('p, span, div');

              // Check if it's a "Clickable UI" (nav, header, footer, or styled as btn)
              const isClickableUI =
                style.display === 'inline-block' ||
                style.display === 'block' ||
                style.display === 'flex' ||
                style.display === 'grid' ||
                el.closest('nav') ||
                el.closest('header') ||
                el.closest('footer') ||
                el.className.toLowerCase().includes('btn') ||
                el.className.toLowerCase().includes('cta');

              // Skip normal inline paragraph links
              if (isInline && hasParentText && !isClickableUI) return;
            }

            if (rect.width < 44 || rect.height < 44) {
              results.push({
                type: 'interaction',
                msg: `Tap target may be small for touch devices ⚠️ (${Math.round(rect.width)}x${Math.round(rect.height)}px)`,
                imp: 'Difficult for users to tap accurately, especially on mobile devices.',
                rec: 'Increase size to at least 44x44px or add padding.',
                sev: 'moderate',
                selector: getSelector(el as HTMLElement)
              });
            }
          });
        }

        return {
          issues: results,
          metrics: {
            'Tap Targets Checked': interactive.length,
            'Horizontal Overflow': document.documentElement.scrollWidth > vw ? 'Yes' : 'No'
          }
        };
      }, { isMobile: profile.isMobile });

      uiAudit.issues.forEach(i => {
        issues.ui.push({
          type: 'warning',
          message: i.msg,
          severity: i.sev as any,
          impact: i.imp,
          recommendation: i.rec,
          selector: i.selector
        });
      });

      categoryMetrics.ui = uiAudit.metrics;
    }

  } catch (err: any) {
    issues.functional.push({
      type: 'error',
      message: `Critical Audit Error: ${err.message}`,
      severity: 'critical',
      impact: 'The auditor encountered a fatal error while scanning.',
      recommendation: 'Please try again or contact support if this persists.'
    });
  } finally {
    await browser.close();
  }

  const calculateScore = (categoryIssues: AuditIssue[], categoryName: string) => {
    if (!siteAccessible && categoryName !== 'functional') return 0;

    let score = 100;

    categoryIssues.forEach(i => {
      let deduction = 0;

      if (categoryName === 'functional') {
        const baseDeduction = i.deduction || (i.severity === 'critical' ? 30 : i.severity === 'high' ? 20 : i.severity === 'moderate' ? 10 : 5);
        const multiplier = i.confidence === 'high' ? 1 : i.confidence === 'medium' ? 0.7 : i.confidence === 'low' ? 0.4 : 1;
        deduction = baseDeduction * multiplier;
      } else {
        if (i.severity === 'critical') deduction = 30;
        else if (i.severity === 'high') deduction = 20;
        else if (i.severity === 'moderate') deduction = 15;
        else deduction = 5;
      }

      score -= deduction;
    });

    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const getStatus = (score: number) => {
    if (!siteAccessible) return 'failed';
    if (score >= 90) return 'passed';
    if (score >= 50) return 'warning';
    return 'failed';
  };

  const result: AuditResult = {
    url,
    timestamp: new Date().toISOString(),
    categories: {
      functional: { score: calculateScore(issues.functional, 'functional'), status: getStatus(calculateScore(issues.functional, 'functional')), issues: issues.functional, metrics: categoryMetrics.functional },
      ui: { score: calculateScore(issues.ui, 'ui'), status: getStatus(calculateScore(issues.ui, 'ui')), issues: issues.ui, metrics: categoryMetrics.ui },
      links: { score: calculateScore(issues.links, 'links'), status: getStatus(calculateScore(issues.links, 'links')), issues: issues.links, metrics: categoryMetrics.links },
      console: { score: calculateScore(issues.console, 'console'), status: getStatus(calculateScore(issues.console, 'console')), issues: issues.console, metrics: categoryMetrics.console },
      performance: { score: calculateScore(issues.performance, 'performance'), status: getStatus(calculateScore(issues.performance, 'performance')), issues: issues.performance, metrics: categoryMetrics.performance },
      ...(includeAccessibility ? { accessibility: { score: calculateScore(issues.accessibility, 'accessibility'), status: getStatus(calculateScore(issues.accessibility, 'accessibility')), issues: issues.accessibility, metrics: categoryMetrics.accessibility } } : {}),
      ...(includeSeo ? { seo: { score: calculateScore(issues.seo, 'seo'), status: getStatus(calculateScore(issues.seo, 'seo')), issues: issues.seo, metrics: categoryMetrics.seo } } : {}),
    },
    totalScore: 0
  };

  result.totalScore = Math.round(
    Object.entries(result.categories)
      .filter(([key]) => includeSeo || key !== 'seo')
      .reduce((acc, [_, cat]) => acc + cat.score, 0) / (includeSeo ? 7 : 6)
  );

  return {
    ...result,
    profile: profileName
  };
}
