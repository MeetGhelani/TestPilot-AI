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

  const metricDescriptions: Record<string, string> = {
    'FCP': 'First Contentful Paint: Time until the first message/image is visible.',
    'TBT': 'Total Blocking Time: Total time user input was blocked.',
    'CLS': 'Cumulative Layout Shift: Visual stability during load.',
    'Page Size': 'Total payload weight of all resources.',
    'Memory Usage': 'Current JS heap memory consumption.',
    'DOM Nodes': 'Total element count (impacts interactivity).',
    'Title Length': 'SEO title tag length.',
    'H1 Count': 'SEO heading structure check.',
    'Robots.txt': 'Presence of crawler control file.',
    'OG Tags': 'Social media link preview tags.'
  };

  const getMetricInfo = (label: string, value: string | number) => {
    const valStr = String(value);
    const num = parseFloat(valStr.replace(/[^0-9.]/g, ''));

    if (label === 'FCP') {
      if (num <= 1800) return { color: '#4ade80', label: 'GOOD', limit: '≤ 1.8s' };
      if (num <= 3000) return { color: '#fbbf24', label: 'N.I.', limit: '1.8-3s' };
      return { color: '#f87171', label: 'POOR', limit: '> 3s' };
    }
    if (label === 'TBT') {
      if (num <= 200) return { color: '#4ade80', label: 'GOOD', limit: '≤ 200ms' };
      if (num <= 600) return { color: '#fbbf24', label: 'N.I.', limit: '200-600ms' };
      return { color: '#f87171', label: 'POOR', limit: '> 600ms' };
    }
    if (label === 'CLS') {
      if (num <= 0.1) return { color: '#4ade80', label: 'GOOD', limit: '≤ 0.1' };
      if (num <= 0.25) return { color: '#fbbf24', label: 'N.I.', limit: '0.1-0.25' };
      return { color: '#f87171', label: 'POOR', limit: '> 0.25' };
    }
    if (label === 'Memory Usage') {
      if (num <= 50) return { color: '#4ade80', label: 'GOOD', limit: '≤ 50MB' };
      if (num <= 150) return { color: '#fbbf24', label: 'MOD.', limit: '50-150MB' };
      return { color: '#f87171', label: 'HEAVY', limit: '> 150MB' };
    }
    if (label === 'DOM Nodes') {
      if (num <= 1500) return { color: '#4ade80', label: 'GOOD', limit: '≤ 1.5k' };
      if (num <= 3000) return { color: '#fbbf24', label: 'HEAVY', limit: '1.5-3k' };
      return { color: '#f87171', label: 'V.HEAVY', limit: '> 3k' };
    }
    if (label === 'Page Size') {
      if (num <= 2) return { color: '#4ade80', label: 'GOOD', limit: '≤ 2MB' };
      if (num <= 5) return { color: '#fbbf24', label: 'MOD.', limit: '2-5MB' };
      return { color: '#f87171', label: 'HEAVY', limit: '> 5MB' };
    }
    return null;
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
      
      ${(() => {
      const filteredMetrics = Object.entries(cat.metrics || {}).filter(([label]) => label !== 'JS Heap Used' && label !== 'JS Heap Limit');
      if (filteredMetrics.length === 0) return '';
      return `
          <div class="metrics-container">
            ${filteredMetrics.map(([label, value]) => {
        const info = getMetricInfo(label, value);
        return `
                <div class="metric-item">
                  <div class="metric-info">
                    <div class="metric-label">${label}</div>
                    <div class="metric-desc">${metricDescriptions[label] || ''}</div>
                  </div>
                  <div class="metric-value-container">
                    <div class="metric-status-row">
                      ${info ? `<span class="metric-badge" style="background: ${info.color}22; color: ${info.color}; border: 1px solid ${info.color}44">${info.label}</span>` : ''}
                      <span class="metric-value" style="color: ${info?.color || 'var(--text)'}">${value}</span>
                    </div>
                    ${info ? `<div class="metric-limit">Limit: ${info.limit}</div>` : ''}
                  </div>
                </div>
              `;
      }).join('')}
          </div>
        `;
    })()}

      <div class="category-status">${cat.issues.length} issues detected</div>
    </div>
  `;

  const renderIssue = (issue: AuditIssue) => `
    <div class="issue-item">
      <div class="issue-main">
        <span class="issue-icon ${issue.type}">${issue.type === 'error' ? '⊗' : '⚠'}</span>
        <div class="issue-title-container">
          <span class="issue-msg">${escapeHtml(issue.message)}</span>
          ${issue.category ? `<span style="font-size: 10px; color: var(--text3); border: 1px solid var(--border); padding: 2px 6px; border-radius: 4px; margin-left: 8px;">${issue.category}</span>` : ''}
        </div>
        <span class="issue-severity ${issue.severity}">${issue.severity.toUpperCase()}</span>
      </div>
      ${issue.impact ? `<div class="issue-detail"><strong>Impact:</strong> ${escapeHtml(issue.impact)}</div>` : ''}
      ${issue.fix ? `<div class="issue-fix"><strong>Suggested Fix:</strong> <br/><code>${escapeHtml(issue.fix)}</code></div>` : ''}
      ${!issue.fix && issue.recommendation && issue.recommendation !== issue.helpUrl ? `<div class="issue-fix"><strong>Fix:</strong> ${escapeHtml(issue.recommendation)}</div>` : ''}
      ${issue.helpUrl ? `<div class="issue-detail" style="margin-top: 8px;"><a href="${issue.helpUrl}" target="_blank" style="color: #38bdf8; text-decoration: none; font-size: 12px; font-weight: 600;">WCAG Documentation ↗</a></div>` : ''}
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
          background: linear-gradient(135deg, #111 0%, #292929ff 100%);
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
          display: flex;
          flex-direction: column;
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
          margin-top: auto;
        }

        .metrics-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
          padding: 12px;
          background: rgba(255,255,255,0.02);
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.05);
        }

        .metric-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }

        .metric-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }

        .metric-label {
          font-size: 11px;
          color: var(--text);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .metric-desc {
          font-size: 10px;
          color: var(--text3);
          line-height: 1.3;
        }

        .metric-value-container {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .metric-status-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .metric-badge {
          font-size: 9px;
          padding: 1px 4px;
          border-radius: 4px;
          font-weight: 800;
          font-family: var(--font-mono);
        }

        .metric-value {
          font-size: 14px;
          font-weight: 700;
          font-family: var(--font-mono);
        }

        .metric-limit {
          font-size: 10px;
          color: var(--text3);
          font-style: italic;
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

        .issue-title-container {
          flex: 1;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
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
        ${Object.entries(categories).map(([key, cat]) => {
    const labelMap: Record<string, string> = {
      functional: 'Functional',
      ui: 'UI & Visuals',
      performance: 'Performance',
      links: 'Links',
      console: 'Console & Errors',
      accessibility: 'Accessibility',
      seo: 'Search & SEO'
    };
    return renderCategory(labelMap[key] || key.charAt(0).toUpperCase() + key.slice(1), cat as AuditCategory);
  }).join('')}
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
        Generated by TestPilot AI - Site Auditor. &copy; 2026 TestPilot AI.
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

export function generateComparisonReportHtml(audits: AuditResult[], comparisons: any[], overallTrend: number): string {
  const first = audits[0];
  const latest = audits[audits.length - 1];
  const hostname = new URL(latest.url).hostname;

  const escapeHtml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Comparison Report - ${hostname}</title>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <style>
        :root {
          --bg: #09090b;
          --surface: #18181b;
          --surface2: #27272a;
          --border: #3f3f46;
          --text: #ffffff;
          --text2: #a1a1aa;
          --text3: #71717a;
          --accent: #c8f069;
          --danger: #ef4444;
          --success: #22c55e;
          --info: #38bdf8;
          --font-sans: 'Inter', -apple-system, sans-serif;
        }
        * { box-sizing: border-box; }
        body { 
          background: var(--bg); 
          color: var(--text); 
          font-family: var(--font-sans); 
          padding: 60px; 
          margin: 0 auto;
          line-height: 1.5;
        }
        .header { 
          border-bottom: 1px solid var(--border); 
          padding-bottom: 30px; 
          margin-bottom: 40px; 
        }
        .header h1 { 
          font-size: 32px; 
          margin: 0 0 10px 0; 
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .header p { color: var(--text2); margin: 0; font-size: 14px; }
        
        .summary-grid { 
          display: grid; 
          grid-template-columns: 1fr 2fr; 
          gap: 24px; 
          margin-bottom: 40px; 
        }
        .summary-card { 
          background: linear-gradient(145deg, #3f3f44ff 0%, #09090b 100%);
          padding: 32px; 
          border-radius: 24px; 
          border: 1px solid var(--border); 
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .trend-value { 
          font-size: 56px; 
          font-weight: 900; 
          letter-spacing: -0.04em;
          line-height: 1;
          margin-top: 8px;
          color: ${overallTrend >= 0 ? 'var(--success)' : 'var(--danger)'}; 
        }
        .card-label { font-size: 12px; color: var(--text1); font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }

        .chart-container { 
          background: #111; 
          padding: 30px; 
          border-radius: 24px; 
          border: 1px solid var(--border); 
          margin-bottom: 40px; 
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
          .chart {
            width: 620px;
            height: 100%;
          } 
        
        .table-container {
          background: var(--surface);
          border-radius: 20px;
          border: 1px solid var(--border);
          overflow: hidden;
          margin-bottom: 40px;
        }
        .table { width: 100%; border-collapse: collapse; }
        .table th { 
          background: rgba(255,255,255,0.03); 
          padding: 20px; 
          color: var(--text2); 
          font-size: 11px; 
          text-transform: uppercase; 
          letter-spacing: 0.1em;
          text-align: left;
          border-bottom: 1px solid var(--border);
        }
        .table td { 
          padding: 20px; 
          border-bottom: 1px solid rgba(255,255,255,0.05); 
          font-size: 14px;
        }
        .table tr:last-child td { border-bottom: none; }
        
        .issue-delta { padding: 24px; border-radius: 16px; margin-bottom: 16px; border: 1px solid var(--border); line-height: 1.6; }
        .issue-fixed { background: rgba(34, 197, 94, 0.05); border-color: rgba(34, 197, 94, 0.2); }
        .issue-new { background: rgba(239, 68, 68, 0.05); border-color: rgba(239, 68, 68, 0.2); }
        
        h2 { font-size: 20px; font-weight: 800; margin-bottom: 24px; color: var(--text); }
        h3 { font-size: 16px; font-weight: 700; margin-bottom: 16px; color: var(--text2); }
      </style>
    </head>
    <body style="opacity: 0; transition: opacity 0.5s;">
      <div class="header">
        <h1>Comparison Report: <em style="color: var(--accent); font-style: normal;">${hostname}</em></h1>
        <div style="color: var(--accent); font-size: 14px; margin-bottom: 12px; font-weight: 500;">Target: ${latest.url}</div>
        <p>Comparison of ${audits.length} benchmarks from ${new Date(first.timestamp).toLocaleDateString()} to ${new Date(latest.timestamp).toLocaleDateString()}</p>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <div class="card-label">Overall Health Trend</div>
          <div class="trend-value">${overallTrend >= 0 ? '+' : ''}${overallTrend}%</div>
        </div>
        <div class="summary-card">
          <div class="card-label">Comparison Scope</div>
          <div style="display: flex; gap: 40px; align-items: baseline; margin-top: 8px;">
            <div>
              <div style="font-size: 32px; font-weight: 800; color: var(--info);">${audits.length}</div>
              <div style="font-size: 12px; color: var(--text2); font-weight: 600;">AUDITS COMPARED</div>
            </div>
            <div style="flex: 1; border-left: 1px solid rgba(255,255,255,0.1); padding-left: 30px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-size: 12px; color: var(--text2);">First Score</span>
                <span style="font-size: 14px; font-weight: 700;">${first.totalScore}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="font-size: 12px; color: var(--text2);">Latest Score</span>
                <span style="font-size: 14px; font-weight: 700; color: var(--accent);">${latest.totalScore}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="chart-container">
        <div class="card-label" style="margin-bottom: 24px;">Health Score Trajectory</div>
        <div style="height: 350px;" class="chart">
          <canvas id="trendChart"></canvas>
        </div>
      </div>

      <h2>Performance & Quality Delta</h2>
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th style="width: 40%">Category</th>
              <th style="width: 20%">Initial <div style="font-size: 10px; opacity: 0.8;">${new Date(first.timestamp).toLocaleDateString()}</div></th>
              <th style="width: 20%">Latest <div style="font-size: 10px; opacity: 0.8; color: var(--accent);">${new Date(latest.timestamp).toLocaleDateString()}</div></th>
              <th style="width: 20%">Change</th>
            </tr>
          </thead>
          <tbody>
            ${Object.keys(latest.categories).map(key => {
    const catKey = key as keyof typeof latest.categories;
    const pScore = first.categories[catKey]?.score || 0;
    const cScore = latest.categories[catKey]?.score || 0;
    const diff = cScore - pScore;
    return `
                <tr>
                  <td style="font-weight: 700; text-transform: capitalize; color: var(--text2);">${key}</td>
                  <td>${pScore}</td>
                  <td style="font-weight: 700;">${cScore}</td>
                  <td style="color: ${diff > 0 ? 'var(--success)' : diff < 0 ? 'var(--danger)' : 'var(--text3)'}; font-weight: 800;">
                    ${diff > 0 ? '+' : ''}${diff}%
                  </td>
                </tr>
              `;
  }).join('')}
          </tbody>
        </table>
      </div>

      <h2 style="margin-top: 60px;">Critical Observation Changes</h2>
      ${comparisons.map(comp => {
    const catEntries = Object.entries(comp.categoryDiffs);
    return catEntries.map(([catKey, diff]: any) => {
      if (diff.issues.added.length === 0 && diff.issues.fixed.length === 0) return '';
      return `
            <div style="margin-bottom: 32px;">
              <h3 style="text-transform: capitalize; border-left: 3px solid var(--accent); padding-left: 12px;">${catKey} Differences</h3>
              ${(diff.issues?.fixed || []).map((issue: any) => `
                <div class="issue-delta issue-fixed">
                  <span style="background: var(--success); color: #000; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; margin-right: 12px;">FIXED</span>
                  <span style="color: var(--text2)">${escapeHtml(issue.message)}</span>
                </div>
              `).join('')}
              ${(diff.issues?.added || []).map((issue: any) => `
                <div class="issue-delta issue-new">
                  <span style="background: var(--danger); color: #000; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; margin-right: 12px;">NEW</span>
                  <span style="color: var(--text); font-weight: 500;">${escapeHtml(issue.message)}</span>
                  <div style="font-size: 11px; color: var(--text3); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em;">Severity: ${issue.severity}</div>
                </div>
              `).join('')}
            </div>
          `;
    }).join('');
  }).join('')}

      <div style="margin-top: 80px; padding-top: 30px; border-top: 1px solid var(--border); text-align: center;">
        <div style="font-size: 11px; color: var(--info); text-transform: uppercase; letter-spacing: 0.2em;">
          TESTPILOT AI Audit Intelligence • Generated at ${new Date().toLocaleString()}
        </div>
      </div>

      <script>
        window.addEventListener('load', () => {
          const ctx = document.getElementById('trendChart').getContext('2d');
          new Chart(ctx, {
            type: 'line',
            data: {
              labels: ${JSON.stringify(audits.map(a => new Date(a.timestamp).toLocaleDateString()))},
              datasets: [{
                label: 'Health Score',
                data: ${JSON.stringify(audits.map(a => a.totalScore))},
                borderColor: '#c8f069',
                borderWidth: 4,
                backgroundColor: (context) => {
                  const chart = context.chart;
                  const {ctx, chartArea} = chart;
                  if (!chartArea) return null;
                  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                  gradient.addColorStop(0, 'rgba(200, 240, 105, 0.2)');
                  gradient.addColorStop(1, 'rgba(200, 240, 105, 0)');
                  return gradient;
                },
                fill: true,
                tension: 0.4,
                pointRadius: 8,
                pointHoverRadius: 10,
                pointBackgroundColor: '#c8f069',
                pointBorderColor: '#09090b',
                pointBorderWidth: 2
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              animation: false,
              layout: {
                padding: {
                  right: 40,
                  left: 10,
                  top: 10,
                  bottom: 10
                }
              },
              plugins: { 
                legend: { display: false },
                tooltip: { enabled: false } 
              },
              scales: {
                y: { 
                  min: 0, 
                  max: 100, 
                  grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false }, 
                  ticks: { 
                    color: '#a1a1aa', 
                    font: { size: 11, weight: '600' },
                    padding: 10
                  } 
                },
                x: { 
                  grid: { display: false }, 
                  ticks: { 
                    color: '#a1a1aa', 
                    font: { size: 10, weight: '600' },
                    maxRotation: 0,
                    padding: 15
                  } 
                }
              }
            }
          });
          document.body.style.opacity = '1';
        });
      </script>
    </body>
    </html>
  `;
}
