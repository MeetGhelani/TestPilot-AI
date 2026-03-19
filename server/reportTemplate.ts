import type { AuditResult, AuditIssue, AuditCategory } from '../src/types/index';

export function generateReportHtml(audit: AuditResult): string {
  const { url, timestamp, totalScore, categories } = audit;
  const dateStr = new Date(timestamp).toLocaleString();
  const hostname = new URL(url).hostname;

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#4ade80';
    if (score >= 50) return '#fbbf24';
    return '#f87171';
  };

  const escapeHtml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const renderCategory = (name: string, cat: AuditCategory) => `
    <div class="category-card">
      <div class="category-header">
        <span class="category-name">${name}</span>
        <span class="category-score" style="color: ${getScoreColor(cat.score)}">${cat.score}</span>
      </div>
      <div class="score-bar">
        <div class="score-fill" style="width: ${cat.score}%; background: ${getScoreColor(cat.score)}"></div>
      </div>
      <div class="category-status">${cat.issues.length} issues detected</div>
    </div>
  `;

  const renderIssue = (issue: AuditIssue) => `
    <div class="issue-item">
      <div class="issue-main">
        <span class="issue-icon ${issue.type}">${issue.type === 'error' ? '⊗' : '⚠'}</span>
        <span class="issue-msg">${escapeHtml(issue.message)}</span>
        <span class="issue-severity ${issue.severity}">${issue.severity.toUpperCase()}</span>
      </div>
      ${issue.impact ? `<div class="issue-detail"><strong>Impact:</strong> ${escapeHtml(issue.impact)}</div>` : ''}
      ${issue.recommendation ? `<div class="issue-fix"><strong>Fix:</strong> ${escapeHtml(issue.recommendation)}</div>` : ''}
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Audit Report - ${hostname}</title>
      <style>
        :root {
          --bg: #0a0a0a;
          --surface: #141414;
          --surface2: #1a1a1a;
          --border: #222;
          --text: #ffffff;
          --text2: #aaaaaa;
          --text3: #666666;
          --accent: #c8f069;
          --font-sans: 'Inter', -apple-system, blinkmacsystemfont, 'Segoe UI', roboto, oxygen, ubuntu, cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
          --font-serif: 'Instrument Serif', serif;
        }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-sans);
          margin: 20px;
          padding: 40px;
          line-height: 1.5;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-bottom: 1px solid var(--border);
          padding-bottom: 30px;
          margin-bottom: 40px;
        }

        .header-left h1 {
          font-size: 32px;
          margin: 0 0 8px 0;
          font-weight: 500;
        }

        .header-left h1 em {
          color: var(--accent);
        }

        .header-left .url {
          color: var(--text2);
          font-size: 18px;
          font-weight: 500;
        }

        .header-right {
          text-align: right;
        }

        .header-right .date {
          color: var(--text2);
          font-size: 14px;
          font-family: var(--font-mono);
        }

        .summary-row {
          display: flex;
          gap: 40px;
          margin-bottom: 50px;
          background: linear-gradient(135deg, #111 0%, #1a1a1a 100%);
          padding: 40px;
          border-radius: 24px;
          border: 1px solid var(--border);
        }

        .total-score-box {
          text-align: center;
          padding-right: 40px;
          border-right: 1px solid var(--border);
        }

        .total-score-label {
          font-size: 12px;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 10px;
          font-weight: 700;
        }

        .total-score-value {
          font-size: 80px;
          font-weight: 900;
          line-height: 1;
        }

        .total-score-value span {
          font-size: 24px;
          color: var(--text3);
        }

        .insights-box {
          flex: 1;
        }

        .insights-label {
          font-size: 14px;
          color: var(--text2);
          font-weight: 700;
          margin-bottom: 12px;
        }

        .insights-text {
          font-size: 15px;
          color: var(--text);
          line-height: 1.6;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 50px;
        }

        .category-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px;
        }

        .category-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .category-name {
          font-weight: 700;
          font-size: 16px;
        }

        .category-score {
          font-family: var(--font-mono);
          font-weight: 800;
          font-size: 20px;
        }

        .score-bar {
          height: 6px;
          background: rgba(200, 240, 105, 0.05);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .score-fill {
          height: 100%;
        }

        .category-status {
          font-size: 12px;
          color: var(--text3);
        }

        .section-title {
          font-size: 20px;
          font-weight: 700;
          border-left: 4px solid var(--accent);
          padding-left: 16px;
          margin: 40px 0 20px 0;
          page-break-after: avoid;
        }

        .issue-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .issue-item {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
        }

        .issue-main {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .issue-icon {
          font-size: 20px;
        }

        .issue-icon.error { color: #f87171; }
        .issue-icon.warning { color: #fbbf24; }

        .issue-msg {
          font-weight: 600;
          font-size: 15px;
          flex: 1;
        }

        .issue-severity {
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 800;
          font-family: var(--font-mono);
        }

        .issue-severity.critical { background: #411; color: #f87171; }
        .issue-severity.high { background: #321; color: #fbbf24; }
        .issue-severity.moderate { background: rgba(200, 240, 105, 0.05); color: #aaa; }
        .issue-severity.low { background: #1a1a1a; color: #666; }

        .issue-detail {
          font-size: 14px;
          color: var(--text2);
          margin-top: 8px;
          padding-left: 32px;
        }

        .issue-fix {
          font-size: 14px;
          background: rgba(200, 240, 105, 0.05);
          border: 1px solid rgba(200, 240, 105, 0.1);
          padding: 12px;
          border-radius: 8px;
          margin-top: 12px;
          margin-left: 32px;
        }

        .issue-fix h1, .issue-fix h2, .issue-fix h3, .issue-fix h4 {
          font-size: inherit;
          margin: 0;
          display: inline;
          font-weight: 600;
          color: var(--accent);
        }

        .footer-note {
          margin-top: 60px;
          text-align: center;
          color: var(--accent);
          font-size: 12px;
          border-top: 1px solid var(--border);
          padding-top: 30px;
        }

        @media print {
          body { padding: 0; }
          .category-card, .issue-item, .summary-row {
            break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-left">
          <h1>TestPilot <em style="font-family : var(--font-serif)">AI</em></h1>
          <div class="url"><span style="color: var(--accent)">Site Name :</span> ${audit.url}</div>
        </div>
        <div class="header-right">
          <div class="date">${dateStr}</div>
        </div>
      </div>

      <div class="summary-row">
        <div class="total-score-box">
          <div class="total-score-label">Health Score</div>
          <div class="total-score-value" style="color: ${getScoreColor(totalScore)}">${totalScore}<span>/100</span></div>
        </div>
        <div class="insights-box">
          <div class="insights-label">AI EXECUTIVE SUMMARY</div>
          <div class="insights-text">
            ${generateAiSummary(audit)}
          </div>
        </div>
      </div>

      <div class="grid">
        ${renderCategory('Functional', categories.functional)}
        ${renderCategory('UI & Visuals', categories.ui)}
        ${renderCategory('Performance', categories.performance)}
        ${renderCategory('Accessibility', categories.accessibility)}
        ${renderCategory('Links', categories.links)}
        ${categories.seo ? renderCategory('SEO', categories.seo) : ''}
      </div>

      ${(() => {
        const criticalIssues = Object.values(categories)
          .flatMap(c => (c as AuditCategory).issues)
          .filter(i => i.severity === 'critical' || i.severity === 'high')
          .slice(0, 5);
        if (criticalIssues.length === 0) return '';
        return `
          <div class="section-title">Critical Issues to Resolve</div>
          <div class="issue-list">
            ${criticalIssues.map(renderIssue).join('')}
          </div>
        `;
      })()}

      <div class="section-title">Full Detailed Breakdown</div>
      ${[
      { key: 'functional', label: 'Functional' },
      { key: 'ui', label: 'UI & Visuals' },
      { key: 'performance', label: 'Performance' },
      { key: 'accessibility', label: 'Accessibility' },
      { key: 'links', label: 'Links' },
      { key: 'seo', label: 'SEO' }
    ].map(({ key, label }) => {
      const cat = (categories as any)[key];
      if (!cat || !cat.issues || cat.issues.length === 0) return '';
      return `
          <h3 style="margin-top: 30px; text-transform: capitalize; color: var(--text2); page-break-after: avoid;">${label} Observations</h3>
          <div class="issue-list">
            ${cat.issues.map(renderIssue).join('')}
          </div>
        `;
    }).join('')}

      <hr style="border: none; border-top: 1.5px solid var(--border); margin: 20px 0;">

      <div class="footer-note">
        Generated by TestPilot AI Site Auditor. &copy; 2026 TestPilot AI.
      </div>  
    </body>
    </html>
  `;
}

function generateAiSummary(audit: AuditResult): string {
  const { totalScore, categories } = audit;
  let summary = "";

  if (totalScore >= 90) {
    summary += "Excellent health! The site is highly optimized across most metrics. ";
  } else if (totalScore >= 70) {
    summary += "Good overall health with some room for optimization. ";
  } else {
    summary += "The site requires significant attention, particularly in the areas highlighted below. ";
  }

  const lowCats = Object.entries(categories)
    .filter(([_, cat]) => (cat as AuditCategory).score < 80)
    .map(([name, _]) => name);

  if (lowCats.length > 0) {
    summary += `Focus efforts on <strong>${lowCats.join(', ')}</strong> to see the quickest improvement in overall UX and performance. `;
  }

  const criticalIssues = Object.values(categories).flatMap(c => (c as AuditCategory).issues).filter(i => i.severity === 'critical');
  if (criticalIssues.length > 0) {
    summary += `There are ${criticalIssues.length} critical issues that may be impacting users directly.`;
  }

  return summary;
}
