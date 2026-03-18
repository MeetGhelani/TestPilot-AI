import { chromium, Page, Browser } from 'playwright';
import type { AuditResult, AuditIssue, AuditCategory } from '../types/index';
import { deviceProfiles } from './deviceProfiles';

export interface AuditAuth {
  username?: string;
  password?: string;
}

export type AuditPersona = 'screen-reader' | 'low-vision' | 'keyboard-only' | 'all';

export interface AuditOptions {
  auth?: AuditAuth;
  persona?: AuditPersona;
  includeSeo?: boolean;
  profile?: string;
}

export async function runFullAudit(url: string, options: AuditOptions = {}): Promise<AuditResult> {
  const { auth, persona = 'all', includeSeo = true, profile: profileName = 'desktop' } = options;
  const profile = deviceProfiles[profileName] || deviceProfiles.desktop;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: profile.viewport,
    userAgent: profile.userAgent
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
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            (window as any).clsValue += (entry as any).value;
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });

    try {
      const response = await page.goto(url, { waitUntil: 'load', timeout: 60000 });
      
      // Handle Authentication if requested
      if (auth?.username || auth?.password) {
        try {
          // Look for login fields
          const userFields = await page.$$('input[type="text"], input[type="email"], input[name*="user"], input[name*="login"]');
          const passFields = await page.$$('input[type="password"]');
          
          if (userFields.length > 0 && passFields.length > 0) {
            if (auth.username) await userFields[0].fill(auth.username);
            if (auth.password) await passFields[0].fill(auth.password);
            
            // Try to find a submit button
            const submitBtn = await page.$('button[type="submit"], input[type="submit"], button:has-text("Log in"), button:has-text("Sign in")');
            if (submitBtn) {
              await submitBtn.click();
              await page.waitForNavigation({ waitUntil: 'load', timeout: 30000 }).catch(() => {});
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

      if (response && response.status() < 400) {
        siteAccessible = true;
      } else {
        throw new Error(`Site returned status ${response?.status() || 'unknown'}`);
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

      // --- Performance Benchmarking & Scoring Fix ---
      const m = categoryMetrics.performance;
      const fcp = perfData.fcp;
      const tbt = perfData.tbt;
      const cls = perfData.cls;
      const nodes = Number(m['DOM Nodes']) || 0;
      const mem = Number(m['JS Heap Used']) || 0;
      const sizeBytes = perfData.pageSize;

      // FCP Check
      if (fcp > 3000) {
        issues.performance.push({ type: 'error', message: `FCP is very poor: ${Math.round(fcp)}ms`, severity: 'critical', impact: 'Users perceive the page as slow or broken when it takes this long to show content.', recommendation: 'Optimize server response times and remove render-blocking JS/CSS.' });
      } else if (fcp > 1800) {
        issues.performance.push({ type: 'warning', message: `FCP needs improvement: ${Math.round(fcp)}ms`, severity: 'moderate', impact: 'Slow start can lead to user bounce.', recommendation: 'Reduce CSS/JS size and use font-display: swap.' });
      }

      // TBT Check
      if (tbt > 600) {
        issues.performance.push({ type: 'error', message: `High Total Blocking Time: ${Math.round(tbt)}ms`, severity: 'critical', impact: 'The page is unresponsive to user input during loading.', recommendation: 'Split large JS bundles and use Web Workers for heavy tasks.' });
      } else if (tbt > 200) {
        issues.performance.push({ type: 'warning', message: `TBT needs improvement: ${Math.round(tbt)}ms`, severity: 'moderate', impact: 'Input delay can frustrate users.', recommendation: 'Optimize long JS tasks.' });
      }

      // DOM Nodes Check
      if (nodes > 3000) {
        issues.performance.push({ type: 'error', message: `Excessive DOM size: ${nodes} nodes`, severity: 'critical', impact: 'A large DOM tree slows down style calculations and interactions.', recommendation: 'Reduce the number of elements; use lazy-loading for off-screen content.' });
      } else if (nodes > 1500) {
        issues.performance.push({ type: 'warning', message: `Large DOM size: ${nodes} nodes`, severity: 'moderate', impact: 'Can impact memory usage and rendering speed.', recommendation: 'Avoid deep nesting and flatten your structure.' });
      }

      // Memory Check (JS Heap)
      if (mem > 150 * 1024 * 1024) {
        issues.performance.push({ type: 'error', message: `High Memory Usage: ${(mem / (1024 * 1024)).toFixed(1)} MB`, severity: 'critical', impact: 'May cause browser crashes or lag on lower-end devices.', recommendation: 'Check for memory leaks and optimize large data structures.' });
      }

      // Page Size Check
      if (sizeBytes > 5 * 1024 * 1024) {
        issues.performance.push({ type: 'error', message: `Very Large Page: ${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`, severity: 'critical', impact: 'High data usage and slow load times on mobile.', recommendation: 'Compress images, use modern formats (WebP), and minify assets.' });
      } else if (sizeBytes > 2 * 1024 * 1024) {
        issues.performance.push({ type: 'warning', message: `Large Page: ${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`, severity: 'moderate', impact: 'Slower experience for mobile users.', recommendation: 'Optimize resources and use Gzip/Brotli compression.' });
      }

      // CLS Check
      if (persona === 'low-vision' && cls > 0.05) {
        issues.performance.push({ type: 'warning', message: `Layout Shift (CLS) detected: ${cls.toFixed(3)}`, severity: 'critical', impact: 'Disorienting for users with low vision.', recommendation: 'Reserve space for containers.' });
      } else if (cls > 0.25) {
        issues.performance.push({ type: 'error', message: `Poor CLS: ${cls.toFixed(3)}`, severity: 'critical', impact: 'Unstable layout causes misclicks.', recommendation: 'Set explicit dimensions for images.' });
      } else if (cls > 0.1) {
        issues.performance.push({ type: 'warning', message: `CLS needs improvement: ${cls.toFixed(3)}`, severity: 'moderate', impact: 'Minor layout shifts during load.', recommendation: 'Add width/height to images.', selector: 'img:not([width]):not([height])' });
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
          const response = await page.request.get(link.href, { timeout: 7000 });
          if (response.status() >= 400) {
            brokenCount++;
            issues.links.push({ 
              type: 'error', 
              message: `Broken Link: Status ${response.status()} for "${link.text || 'Untitled Link'}"`, 
              url: link.href, 
              severity: 'moderate',
              impact: 'Users hit dead ends, hurting trust and SEO ranking.',
              recommendation: `Check if the URL ${link.href} has moved or been deleted.`,
              selector: link.selector
            });
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
      const uiAudit = await page.evaluate(() => {
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

        // 2. Small Tap Targets
        const interactive = document.querySelectorAll('button, a, input[type="submit"], input[type="button"]');
        interactive.forEach(el => {
          const rect = el.getBoundingClientRect();
          if ((rect.width > 0 && rect.width < 44) || (rect.height > 0 && rect.height < 44)) {
            results.push({
              type: 'interaction',
              msg: `Tap target too small (${Math.round(rect.width)}x${Math.round(rect.height)}px)`,
              imp: 'Difficult for users to tap accurately, especially on mobile devices.',
              rec: 'Increase size to at least 44x44px or add padding.',
              sev: 'moderate',
              selector: getSelector(el as HTMLElement)
            });
          }
        });

        // 3. Overflowing Text/Content
        const allElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
        allElements.forEach(el => {
          const style = window.getComputedStyle(el);
          if (style.overflow === 'hidden' || style.overflowX === 'hidden') return;
          if (el.scrollWidth > el.clientWidth + 5 && el.clientWidth > 0) {
            results.push({
              type: 'layout',
              msg: 'Text or content overflow detected',
              imp: 'Content is being cut off or forcing unnecessary scrolls.',
              rec: 'Use "overflow: hidden", "text-overflow: ellipsis", or responsive sizing.',
              sev: 'low',
              selector: getSelector(el as HTMLElement)
            });
          }
        });

        // 4. Images without Dimensions (CLS risk)
        const images = document.querySelectorAll('img');
        images.forEach(img => {
          if ((!img.getAttribute('width') || !img.getAttribute('height')) && !img.style.width && !img.style.height) {
            results.push({
              type: 'performance',
              msg: 'Image missing explicit dimensions',
              imp: 'Causes Cumulative Layout Shift (CLS) as images load, frustrating users.',
              rec: 'Add width and height attributes or CSS dimensions.',
              sev: 'moderate',
              selector: getSelector(img)
            });
          }
        });

        // 5. Large Fixed Overlays
        const fixed = document.querySelectorAll('*');
        fixed.forEach(el => {
          const style = window.getComputedStyle(el);
          if (style.position === 'fixed' || style.position === 'sticky') {
            const rect = el.getBoundingClientRect();
            if (rect.height > vh * 0.4 && rect.width > vw * 0.4) {
              results.push({
                type: 'layout',
                msg: 'Large fixed/sticky element detected',
                imp: 'May block significant portions of the viewport on small screens.',
                rec: 'Ensure fixed elements are reserved for essential navigation only.',
                sev: 'low',
                selector: getSelector(el as HTMLElement)
              });
            }
          }
        });

        return {
          issues: results,
          metrics: {
            'Tap Targets Checked': interactive.length,
            'Images Scanned': images.length,
            'Horizontal Overflow': document.documentElement.scrollWidth > vw ? 'Yes' : 'No'
          }
        };
      });

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
      if (i.severity === 'critical') score -= 30;
      else if (i.severity === 'moderate') score -= 15;
      else score -= 5;
    });
    return Math.max(0, score);
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
      accessibility: { score: calculateScore(issues.accessibility, 'accessibility'), status: getStatus(calculateScore(issues.accessibility, 'accessibility')), issues: issues.accessibility, metrics: categoryMetrics.accessibility },
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
