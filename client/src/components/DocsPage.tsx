import React, { useState, useEffect, useMemo } from 'react';

interface DocsSection {
  id: string;
  title: string;
  icon: string;
  content: React.ReactNode;
  category: 'getting-started' | 'features' | 'advanced' | 'support';
}

export default function DocsPage({ theme }: { theme: 'dark' | 'light' }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('getting-started');

  const sections: DocsSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: '🚀',
      category: 'getting-started',
      content: (
        <>
          <p>Welcome to <strong>TestPilot AI</strong>. Our mission is to make web testing as effortless as browsing. Whether you're a developer ensuring code quality or a QA engineer building a regression suite, TestPilot AI provides the tools you need to ship with confidence.</p>
          
          <div style={{ marginTop: 32, padding: 24, background: 'rgba(163, 230, 53, 0.05)', border: '1px solid rgba(163, 230, 53, 0.2)', borderRadius: 16 }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--accent)' }}>3-Step Quick Start</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>1</span>
                <span>Enter your website URL in the <strong>Audit</strong> or <strong>Suggest</strong> tabs.</span>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>2</span>
                <span>Use <strong>Test Suggester</strong> to auto-generate tests or <strong>Recorder</strong> to capture custom flows.</span>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>3</span>
                <span>Run your tests instantly and view detailed execution reports.</span>
              </div>
            </div>
          </div>
        </>
      )
    },
    {
      id: 'record-replay',
      title: 'Record & Replay',
      icon: '📹',
      category: 'features',
      content: (
        <>
          <p>The <strong>Recorder</strong> is the heartbeat of TestPilot AI. It allows you to create complex end-to-end tests without writing a single line of code. Every click, keystroke, and navigation is captured in real-time.</p>
          
          <h4 style={{ color: 'var(--text2)', marginTop: 24 }}>How to Record</h4>
          <ul style={{ color: 'var(--text3)', lineHeight: 1.8 }}>
            <li>Navigate to the <strong>Recorder</strong> tab.</li>
            <li>Enter the starting URL and click <strong>Start Recording</strong>.</li>
            <li>Perform actions on your site. TestPilot AI will build a step-by-step flow as you go.</li>
            <li>Click <strong>Stop</strong> to save your recording to the local library.</li>
          </ul>

          <div style={{ marginTop: 24, padding: 16, background: 'var(--surface2)', borderRadius: 12, borderLeft: '4px solid var(--accent)' }}>
            <strong>💡 Pro Tip:</strong> Our <strong>Smart Selectors</strong> use a multi-strategy approach (ID, CSS, XPath, Text) to ensure your tests don't break when your UI changes. If a selector fails, the agent <strong>auto-heals</strong> by finding the next best match.
          </div>

          <h4 style={{ color: 'var(--text2)', marginTop: 32 }}>Supported Actions Reference</h4>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>Every recorded step uses one of these fundamental actions. You can view and edit these in the <strong>Step Editor</strong>.</p>
          <div className="docs-table-container" style={{ maxHeight: 400, overflowY: 'scroll', overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 12, marginTop: 12}}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, letterSpacing: 0.5}}>
              <thead style={{ background: '#111512', position: 'sticky', top: 0, zIndex: 10 }}>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 20px', color: 'var(--text3)' }}>Action</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text3)' }}>Requirements</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text3)' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 20px', color: 'var(--accent)', fontWeight: 600 }}>navigate</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text2)' }}>Value (URL)</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text3)' }}>Initializes the browser to the target address. Usually the first step.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 20px', color: 'var(--accent)', fontWeight: 600 }}>click</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text2)' }}>Target (Selector)</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text3)' }}>Triggers a mouse click on the specified element. Supports auto-wait.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 20px', color: 'var(--accent)', fontWeight: 600 }}>fill</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text2)' }}>Target & Value</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text3)' }}>Inputs text into form fields, inputs, or textareas.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 20px', color: 'var(--accent)', fontWeight: 600 }}>select</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text2)' }}>Target & Value</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text3)' }}>Selects an option from a dropdown or picker component.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 20px', color: 'var(--accent)', fontWeight: 600 }}>hover</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text2)' }}>Target (Selector)</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text3)' }}>Simulates a mouse hover. Useful for triggering tooltips or menus.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 20px', color: 'var(--accent)', fontWeight: 600 }}>scroll</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text2)' }}>None / Optional</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text3)' }}>Scrolls the viewport. Can target specific elements if provided.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 20px', color: 'var(--accent)', fontWeight: 600 }}>wait</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text2)' }}>Value (ms)</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text3)' }}>Pauses execution for a set duration. Use sparingly for stability.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 20px', color: 'var(--accent)', fontWeight: 600 }}>assert_visible</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text2)' }}>Target (Selector)</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text3)' }}>Verifies the element is rendered and reachable in the viewport.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 20px', color: 'var(--accent)', fontWeight: 600 }}>assert_text</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text2)' }}>Target & Value</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text3)' }}>Ensures the target element contains the specified text string.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 20px', color: 'var(--accent)', fontWeight: 600 }}>assert_url</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text2)' }}>Value (String/Regex)</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text3)' }}>Validates that the current browser URL matches the expected value.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 20px', color: 'var(--accent)', fontWeight: 600 }}>assert_title</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text2)' }}>Value (String)</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text3)' }}>Checks if the page title property matches the provided value.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 20px', color: 'var(--accent)', fontWeight: 600 }}>screenshot</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text2)' }}>None</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text3)' }}>Captures a full-page snapshot for visual regression and debugging.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )
    },
    {
      id: 'test-suggester',
      title: 'Test Suggester',
      icon: '🧠',
      category: 'features',
      content: (
        <>
          <p>Don't know what to test? <strong>Test Suggester</strong> uses AI to analyze your page structure and suggest critical test scenarios that you might have missed.</p>
          
          <h4 style={{ color: 'var(--text2)', marginTop: 24 }}>Discovery Patterns</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
            <div style={{ padding: 16, background: 'var(--surface2)', borderRadius: 12 }}>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Login Flows</span>
              <p style={{ fontSize: 13, margin: '8px 0 0 0', color: 'var(--text3)' }}>Verifies authentication barriers and redirection logic.</p>
            </div>
            <div style={{ padding: 16, background: 'var(--surface2)', borderRadius: 12 }}>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Search & Filter</span>
              <p style={{ fontSize: 13, margin: '8px 0 0 0', color: 'var(--text3)' }}>Tests site-search accuracy and results rendering.</p>
            </div>
            <div style={{ padding: 16, background: 'var(--surface2)', borderRadius: 12 }}>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Form Submission</span>
              <p style={{ fontSize: 13, margin: '8px 0 0 0', color: 'var(--text3)' }}>Validates input fields, error messages, and success states.</p>
            </div>
            <div style={{ padding: 16, background: 'var(--surface2)', borderRadius: 12 }}>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Navigation</span>
              <p style={{ fontSize: 13, margin: '8px 0 0 0', color: 'var(--text3)' }}>Ensures key landing pages are reachable and functional.</p>
            </div>
          </div>

          <h4 style={{ color: 'var(--text2)', marginTop: 24 }}>How it Works</h4>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>When you click <strong>"Scan"</strong>, our AI engine traverses your DOM to identify "Intents". It matches element patterns (e.g., a magnifying glass icon next to an input) with high-confidence testing strategies.</p>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <div style={{ flex: 1, padding: 12, border: '1px dashed var(--border)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 18 }}>🔎</div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>DOM Traversal</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>→</div>
            <div style={{ flex: 1, padding: 12, border: '1px dashed var(--border)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 18 }}>🧩</div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>Intent Matching</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>→</div>
            <div style={{ flex: 1, padding: 12, border: '1px dashed var(--border)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 18 }}>✅</div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>Test Suggestion</div>
            </div>
          </div>
        </>
      )
    },
    {
      id: 'site-audit',
      title: 'Site Audit',
      icon: '📊',
      category: 'features',
      content: (
        <>
          <p>Run deep technical audits to ensure your site is fast, accessible, and visible to search engines. We use industry-standard metrics to give you a full picture of your site's health.</p>
          
          <div style={{ marginTop: 24 }}>
            <h4 style={{ color: 'var(--text2)' }}>Audit Personas</h4>
            <p style={{ fontSize: 13, color: 'var(--text3)' }}>TestPilot AI doesn't just check 'best practices'; it simulates the experience of real users with different adaptive needs.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div style={{ padding: 12, background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 11, color: 'var(--info)' }}>Screen-reader</span>
                <p style={{ margin: '4px 0 0 0', fontSize: 12 }}>Checks ARIA landmarks, alt-text, and heading hierarchies.</p>
              </div>
              <div style={{ padding: 12, background: 'rgba(74, 222, 128, 0.05)', border: '1px solid rgba(74, 222, 128, 0.2)', borderRadius: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 11, color: 'var(--pass)' }}>Low-vision</span>
                <p style={{ margin: '4px 0 0 0', fontSize: 12 }}>Simulates color-blindness and high-contrast verification.</p>
              </div>
              <div style={{ padding: 12, background: 'rgba(163, 230, 53, 0.05)', border: '1px solid rgba(163, 230, 53, 0.2)', borderRadius: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 11, color: 'var(--accent)' }}>Keyboard-only</span>
                <p style={{ margin: '4px 0 0 0', fontSize: 12 }}>Ensures interactive elements are focusable and navigable via Tab key.</p>
              </div>
              <div style={{ padding: 12, background: 'rgba(251, 191, 36, 0.05)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 11, color: 'var(--warning)' }}>Search Engine</span>
                <p style={{ margin: '4px 0 0 0', fontSize: 12 }}>Checks SEO health: meta-tags, indexing status, and canonicals.</p>
              </div>
            </div>

            <h4 style={{ color: 'var(--text2)', marginTop: 24 }}>Key Performance Metrics</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 8px', fontSize: 13, color: 'var(--text3)' }}>Metric</th>
                  <th style={{ padding: '12px 8px', fontSize: 13, color: 'var(--text3)' }}>Ideal Value</th>
                  <th style={{ padding: '12px 8px', fontSize: 13, color: 'var(--text3)' }}>Impact</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: 13 }}>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 8px', color: 'var(--accent)', fontWeight: 600 }}>First Contentful Paint (FCP)</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text2)' }}>&lt; 1.8s</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text3)' }}>Perceived load speed. High impact on bounce rate.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 8px', color: 'var(--accent)', fontWeight: 600 }}>Cumulative Layout Shift (CLS)</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text2)' }}>&lt; 0.1</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text3)' }}>Visual stability. Prevents accidental clicks.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 8px', color: 'var(--accent)', fontWeight: 600 }}>Largest Contentful Paint (LCP)</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text2)' }}>&lt; 2.5s</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text3)' }}>Main content load speed. Core Web Vital.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )
    },
    {
      id: 'running-tests',
      title: 'Running Tests',
      icon: '⚡',
      category: 'advanced',
      content: (
        <>
          <p>Execution is handled by our high-performance browser engine. When you trigger a run, TestPilot AI initiates a clean browser instance to ensure zero cross-test contamination.</p>
          
          <h4 style={{ color: 'var(--text2)', marginTop: 24 }}>Assertions & Validations</h4>
          <p>A test without assertions is just a walkthrough. We support multiple assertion types:</p>
          <pre style={{ background: '#1a1a1a', padding: 16, borderRadius: 12, border: '1px solid var(--border)', color: 'var(--accent)', fontSize: 12, overflow: 'auto' }}>
{`// Example Assertions
await expect(page.locator('.success-msg')).toBeVisible();
await expect(page).toHaveURL(/.*dashboard/);
await expect(page.locator('h1')).toContainText('Welcome');`}
          </pre>

          <h4 style={{ color: 'var(--text2)', marginTop: 24 }}>Validation & Lints</h4>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>TestPilot AI includes a real-time 'Linter' for your steps. This ensures your tests adhere to best practices before you even run them.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 8, display: 'flex', gap: 12 }}>
              <span style={{ fontWeight: 800, color: 'var(--fail)' }}>ERROR</span>
              <p style={{ margin: 0, fontSize: 12 }}>Missing target selector or invalid action type. Test cannot execute.</p>
            </div>
            <div style={{ padding: '10px 14px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 8, display: 'flex', gap: 12 }}>
              <span style={{ fontWeight: 800, color: 'var(--warning)' }}>WARNING</span>
              <p style={{ margin: 0, fontSize: 12 }}>Potential issues: Placeholder credentials, excessive waits (&gt;10s), or brittle SVG selectors.</p>
            </div>
          </div>
        </>
      )
    },
    {
      id: 'understanding-results',
      title: 'Understanding Results',
      icon: '🔍',
      category: 'advanced',
      content: (
        <>
          <p>Every test execution generates a comprehensive report. In the <strong>Results</strong> tab, you can drill down into any run to see exactly what happened.</p>
          
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <div style={{ flex: 1, padding: 16, background: 'rgba(74, 222, 128, 0.05)', border: '1px solid rgba(74, 222, 128, 0.2)', borderRadius: 12 }}>
              <span style={{ color: '#4ade80', fontWeight: 700 }}>PASSED</span>
              <p style={{ fontSize: 12, margin: '8px 0 0 0', color: 'var(--text3)' }}>All steps executed successfully and assertions were met.</p>
            </div>
            <div style={{ flex: 1, padding: 16, background: 'rgba(248, 113, 113, 0.05)', border: '1px solid rgba(248, 113, 113, 0.2)', borderRadius: 12 }}>
              <span style={{ color: '#f87171', fontWeight: 700 }}>FAILED</span>
              <p style={{ fontSize: 12, margin: '8px 0 0 0', color: 'var(--text3)' }}>A step timed out or an assertion failed. Includes screenshots.</p>
            </div>
          </div>
          <p style={{ marginTop: 20 }}>Results include <strong>screenshots</strong> of the failure point, full <strong>error logs</strong>, and a step-by-step trace of the execution.</p>
        </>
      )
    },
    {
      id: 'smart-features',
      title: 'Smart Features',
      icon: '✨',
      category: 'advanced',
      content: (
        <>
          <p>What makes TestPilot AI unique is our layer of "Smart Intelligence" that prevents brittle tests.</p>
          <ul style={{ color: 'var(--text3)', lineHeight: 1.8 }}>
            <li><strong>Auto-Healing:</strong> Automatically rotates selectors when the primary one fails.</li>
            <li><strong>Smart Waits:</strong> Intelligently waits for elements to be stable, visible, and enabled before interacting.</li>
            <li><strong>Multi-Strategy:</strong> Uses AI to evaluate multiple ways to reach the same goal.</li>
          </ul>
        </>
      )
    },
    {
      id: 'best-practices',
      title: 'Best Practices',
      icon: '🛡️',
      category: 'advanced',
      content: (
        <>
          <p>To build a robust test suite, follow these developer-recommended guidelines:</p>
          <ul style={{ color: 'var(--text3)', lineHeight: 1.8 }}>
            <li><strong>Use Stable Selectors:</strong> Prefer IDs or Data-Test-IDs over brittle CSS classes.</li>
            <li><strong>Atomic Tests:</strong> Keep tests focused on a single feature to pinpoint failures quickly.</li>
            <li><strong>Avoid Dynamic States:</strong> Use fixed timeouts or smart waits instead of hard-coded sleeps.</li>
          </ul>
        </>
      )
    },
    {
      id: 'faqs',
      title: 'FAQs',
      icon: '❓',
      category: 'support',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text2)' }}>Why did my test fail?</div>
            <p style={{ fontSize: 13, color: 'var(--text3)', margin: '8px 0 0 0' }}>Most failures are due to element timeouts or visibility changes. Check the screenshot in the Results panel for a visual hint.</p>
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text2)' }}>Can I test private/local sites?</div>
            <p style={{ fontSize: 13, color: 'var(--text3)', margin: '8px 0 0 0' }}>Yes, as long as the local browser engine can reach the IP. For private sites, use our Basic Auth support in the configuration panel.</p>
          </div>
        </div>
      )
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: '🔧',
      category: 'support',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: '12px 16px', background: 'var(--surface2)', borderRadius: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fail)' }}>ERR_ELEMENT_NOT_FOUND</span>
            <p style={{ fontSize: 13, margin: '4px 0 0 0' }}>The selector might be obscured by a modal or has changed in the latest build. Try re-recording the step.</p>
          </div>
          <div style={{ padding: '12px 16px', background: 'var(--surface2)', borderRadius: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--warning)' }}>ERR_TIMEOUT_EXCEEDED</span>
            <p style={{ fontSize: 13, margin: '4px 0 0 0' }}>The page or element took too long to load. Consider increasing the wait time for this specific step.</p>
          </div>
        </div>
      )
    },
    {
      id: 'security-data',
      title: 'Security & Data',
      icon: '🔒',
      category: 'support',
      content: (
        <>
          <p>We take your data privacy seriously. TestPilot AI uses <strong>Supabase</strong> for secure authentication and data storage. All scan results and recordings are encrypted at rest.</p>
          <p style={{ color: 'var(--text3)' }}>We never store sensitive credentials in plain text. Basic Auth passwords are encrypted before being passed to the execution engine.</p>
        </>
      )
    }
  ];

  const filteredSections = useMemo(() => {
    if (!searchQuery) return sections;
    return sections.filter(s => 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, sections]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      gap: 24,
      alignItems: 'flex-start',
      minHeight: 'calc(100vh - 152px)',
      color: '#f8fafc',
      fontFamily: 'var(--font-sans)',
      position: 'relative'
    }}>
      {/* Sidebar */}
      <aside className="custom-scrollbar" style={{
        width: 300,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: '24px 16px',
        position: 'sticky',
        top: 112,
        maxHeight: 'calc(100vh - 152px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        overflowY: 'auto'
      }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <input 
            type="text" 
            placeholder="Search docs..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: '10px 12px 10px 36px',
              color: '#fff',
              fontSize: 13,
              outline: 'none'
            }}
          />
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>🔍</span>
        </div>

        {/* Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {['getting-started', 'features', 'advanced', 'support'].map((cat) => (
            <div key={cat}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, paddingLeft: 8 }}>
                {cat.replace('-', ' ')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {sections.filter(s => s.category === cat).map(section => (
                  <button
                    key={section.id}
                    onClick={() => scrollTo(section.id)}
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      borderRadius: 6,
                      background: activeSection === section.id ? 'rgba(163, 230, 53, 0.08)' : 'transparent',
                      border: 'none',
                      color: activeSection === section.id ? 'var(--accent)' : 'var(--text2)',
                      fontSize: 13,
                      fontWeight: activeSection === section.id ? 600 : 400,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'all 0.2s'
                    }}
                  >
                    <span>{section.icon}</span>
                    {section.title}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{ 
        flex: 1, 
        paddingLeft: 24,
        paddingBottom: 80
      }}>
        {filteredSections.map((section, idx) => (
          <section 
            id={section.id} 
            key={section.id} 
            style={{ 
              marginBottom: 80,
              paddingTop: idx === 0 ? 0 : 40,
              scrollMarginTop: 112,
              animation: 'fadeIn 0.5s ease-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 24 }}>{section.icon}</span>
              <h2 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>{section.title}</h2>
            </div>
            <div style={{ color: 'var(--text2)', fontSize: 15, lineHeight: 1.7 }}>
              {section.content}
            </div>
          </section>
        ))}

        {filteredSections.length === 0 && (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔎</div>
            <h3 style={{ fontSize: 20 }}>No results found for "{searchQuery}"</h3>
            <p style={{ color: 'var(--text3)' }}>Try searching for "Audit", "Selectors", or "Security".</p>
          </div>
        )}
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        nav button:hover {
          background: rgba(255,255,255,0.03) !important;
          color: #fff !important;
        }
        pre::-webkit-scrollbar {
          height: 4px;
        }
        pre::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
        }
        .docs-table-container::-webkit-scrollbar {
          width: 8px;
          height: 8px;
          display: block;
        }
        .docs-table-container::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 10px;
          margin: 4px;
        }
        .docs-table-container::-webkit-scrollbar-thumb {
          background: rgba(163, 230, 53, 0.45);
          border-radius: 10px;
          min-height: 40px;
        }
        .docs-table-container::-webkit-scrollbar-thumb:hover {
          background: rgba(163, 230, 53, 0.7);
        }
        .docs-table-container {
          scrollbar-width: thin;
          scrollbar-color: rgba(163, 230, 53, 0.45) rgba(255,255,255,0.05);
        }
      `}</style>
    </div>
  );
}
