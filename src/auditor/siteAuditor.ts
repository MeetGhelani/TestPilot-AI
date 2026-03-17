import { chromium, Page, Browser } from 'playwright';
import type { AuditResult, AuditIssue, AuditCategory } from '../types/index';

export interface AuditAuth {
  username?: string;
  password?: string;
}

export type AuditPersona = 'screen-reader' | 'low-vision' | 'keyboard-only' | 'all';

export interface AuditOptions {
  auth?: AuditAuth;
  persona?: AuditPersona;
  includeSeo?: boolean;
}

export async function runFullAudit(url: string, options: AuditOptions = {}): Promise<AuditResult> {
  const { auth, persona = 'all', includeSeo = true } = options;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const client = await page.context().newCDPSession(page);

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
          pageSize: performance.getEntriesByType('resource').reduce((acc, res: any) => acc + ((res as any).transferSize || 0), 0)
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
        };
      } catch (cdpErr) {
        categoryMetrics.performance = {
          'FCP': `${Math.round(perfData.fcp)}ms`,
          'TBT': `${Math.round(perfData.tbt)}ms`,
          'CLS': perfData.cls.toFixed(3),
          'Page Size': `${(perfData.pageSize / (1024 * 1024)).toFixed(2)} MB`,
        };
      }

      // Persona-based Performance weighting
      if (persona === 'low-vision' && perfData.cls > 0.05) {
        issues.performance.push({ 
          type: 'warning', 
          message: `Layout Shift (CLS) detected: ${perfData.cls.toFixed(3)}`, 
          severity: 'critical', // Upped to critical for low-vision
          impact: 'Sudden layout changes are extremely disorienting for users with low vision or cognitive impairments.',
          recommendation: 'Reserve space for containers and images using fixed dimensions.'
        });
      } else if (perfData.cls > 0.1) {
        issues.performance.push({ 
          type: 'warning', 
          message: `High Layout Shift (CLS): ${perfData.cls.toFixed(3)}`, 
          severity: 'moderate',
          impact: 'The page content "jumps" as it loads, causing users to misclick.',
          recommendation: 'Set explicit dimensions for images and containers.'
        });
      }

      // 2. Broken Links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map(a => ({ href: a.href, text: a.innerText.trim() }))
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
              recommendation: `Check if the URL ${link.href} has moved or been deleted.`
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
            recommendation: 'Verify the link URI is typed correctly.'
          });
        }
      }

      categoryMetrics.links = {
        'Links Scanned': uniqueLinks.length,
        'Broken Links': brokenCount
      };

      // 3. Accessibility - Tailored per Persona
      const a11yChecks = await page.evaluate((p) => {
        const results: { msg: string, impact: string, rec: string, sev: string }[] = [];
        const totalElements = document.querySelectorAll('*').length;
        
        // 1. Image Check (Critical for Screen Readers)
        document.querySelectorAll('img:not([alt])').forEach(img => {
          results.push({
            msg: `Image missing alt text: ${img.getAttribute('src')?.split('/').pop()}`,
            impact: p === 'screen-reader' ? 'CRITICAL: Screen reader users have no idea what this image represents.' : 'Vision-impaired users using screen readers will have no idea what this image is.',
            rec: 'Add an alt="..." attribute describing the image content.',
            sev: p === 'screen-reader' ? 'critical' : 'moderate'
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
                sev: (p === 'screen-reader' || p === 'keyboard-only') ? 'critical' : 'moderate'
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
          recommendation: check.rec
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
      const uiIssues = await page.evaluate(() => {
        const results: { msg: string, imp: string, rec: string }[] = [];
        const vw = window.innerWidth;
        const horizontalOverflow = document.documentElement.scrollWidth > vw;
        if (horizontalOverflow) {
          results.push({
            msg: 'Horizontal scroll detected',
            imp: 'Users have to scroll sideways, which is poor UX on mobile.',
            rec: 'Use responsive CSS like max-width: 100% on large elements.'
          });
        }
        return results;
      });

      uiIssues.forEach(i => {
        issues.ui.push({ type: 'warning', message: i.msg, severity: 'low', impact: i.imp, recommendation: i.rec });
      });
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

  return result;
}
