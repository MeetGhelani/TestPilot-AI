import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { AuditResult, AuditIssue } from '../../../src/types/index';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ComparisonData {
  audits: AuditResult[];
  comparisons: {
    fromId: string;
    toId: string;
    fromTimestamp: string;
    toTimestamp: string;
    scoreDiff: number;
    categoryDiffs: Record<string, {
      scoreDiff: number;
      issues: {
        added: AuditIssue[];
        fixed: AuditIssue[];
        persistent: AuditIssue[];
      }
    }>
  }[];
  summary: {
    totalRuns: number;
    overallTrend: number;
  };
}

interface AuditComparisonProps {
  data: ComparisonData;
  onBack: () => void;
  theme: 'dark' | 'light';
}

export default function AuditComparison({ data, onBack, theme }: AuditComparisonProps) {
  const isDark = theme === 'dark';
  const themeColors = {
    text: isDark ? '#f1f5f9' : '#1e293b',
    text3: isDark ? '#64748b' : '#94a3b8',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
  };
  const { audits, comparisons, summary } = data;
  const latestAudit = audits[audits.length - 1];
  const firstAudit = audits[0];

  const chartData = useMemo(() => {
    const labels = audits.map(a => new Date(a.timestamp).toLocaleDateString());
    return {
      labels,
      datasets: [
        {
          label: 'Overall Health Score',
          data: audits.map(a => a.totalScore),
          fill: true,
          borderColor: 'rgb(200, 240, 105)',
          backgroundColor: 'rgba(200, 240, 105, 0.1)',
          tension: 0.4,
          pointRadius: 6,
          pointHoverRadius: 8,
        }
      ],
    };
  }, [audits]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
        titleColor: themeColors.text,
        bodyColor: themeColors.text,
        borderColor: themeColors.border,
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        displayColors: true,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: { color: themeColors.border },
        ticks: { color: themeColors.text3 },
      },
      x: {
        grid: { display: false },
        ticks: { color: themeColors.text3 },
      },
    },
  };

  const IssueBadge = ({ type, count }: { type: 'new' | 'fixed' | 'remaining', count: number }) => {
    const colors = {
      new: { bg: 'rgba(248, 113, 113, 0.1)', text: 'var(--fail)' },
      fixed: { bg: 'rgba(74, 222, 128, 0.1)', text: 'var(--pass)' },
      remaining: { bg: 'var(--warning-bg)', text: 'var(--warning)' }
    };
    return (
      <div style={{
        background: colors[type].bg,
        color: colors[type].text,
        padding: '12px 20px',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        border: `1px solid ${colors[type].text}22`
      }}>
        <span style={{ fontSize: 24, fontWeight: 900 }}>{count}</span>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{type}</span>
      </div>
    );
  };

  const generatedSummary = useMemo(() => {
    const totalScoreDiff = summary.overallTrend;
    const totalFixed = comparisons.reduce((acc, c) => acc + Object.values(c.categoryDiffs).reduce((a, cd) => a + cd.issues.fixed.length, 0), 0);
    const totalAdded = comparisons.reduce((acc, c) => acc + Object.values(c.categoryDiffs).reduce((a, cd) => a + cd.issues.added.length, 0), 0);
    
    if (totalScoreDiff > 5) return `Great progress! The site health improved significantly by ${totalScoreDiff} points. You've successfully fixed ${totalFixed} issues, while only ${totalAdded} new ones appeared. Focus on maintaining these gains.`;
    if (totalScoreDiff < -5) return `Attention required: The site health has degraded by ${Math.abs(totalScoreDiff)} points. ${totalAdded} new issues were detected, significantly impacting performance and UX. Prioritize fixing the new critical issues identified below.`;
    return `Site health is relatively stable. While ${totalFixed} issues were resolved, ${totalAdded} new ones were introduced. Overall, the health score changed by ${totalScoreDiff} points. Continue monitoring trends for further optimizations.`;
  }, [summary, comparisons]);

  const handleExportCSV = () => {
    const headers = ['Category', `${new Date(firstAudit.timestamp).toLocaleDateString()} Score`, `${new Date(latestAudit.timestamp).toLocaleDateString()} Score`, 'Delta', 'New Issues', 'Fixed Issues'];
    const rows = Object.keys(latestAudit.categories).map(key => {
      const catKey = key as keyof typeof latestAudit.categories;
      const pScore = firstAudit.categories[catKey]?.score || 0;
      const cScore = latestAudit.categories[catKey]?.score || 0;
      const diff = cScore - pScore;
      const lastComp = comparisons[comparisons.length - 1];
      const added = lastComp?.categoryDiffs[catKey]?.issues.added.length || 0;
      const fixed = lastComp?.categoryDiffs[catKey]?.issues.fixed.length || 0;
      return [catKey, pScore, cScore, `${diff}%`, added, fixed];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_comparison_${latestAudit.url.replace(/[^a-z0-9]/gi, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/audit/download-compare-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: audits.map(a => a.id) })
      });
      if (!res.ok) throw new Error('Failed to generate PDF');
      const data = await res.json();
      if (!data.pdfUrl) throw new Error('PDF URL not received');
      
      window.open(`http://localhost:3001${data.pdfUrl}`, '_blank');
    } catch (err) {
      console.error(err);
      alert('Failed to download PDF comparison report');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, animation: 'fadeIn 0.4s ease-out', minWidth: 0 }}>
      
      {/* AI Insight Box */}
      <div style={{ 
        background: 'rgba(200, 240, 105, 0.05)', 
        border: '1px solid rgba(200, 240, 105, 0.2)', 
        borderRadius: 16, 
        padding: '20px 24px', 
        display: 'flex', 
        gap: 16, 
        alignItems: 'flex-start' 
      }}>
        <div style={{ fontSize: 24 }}>✨</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>AI Status Summary</div>
          <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.6, fontWeight: 500 }}>{generatedSummary}</div>
        </div>
      </div>

      {/* Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button 
          onClick={onBack}
          style={{ 
            background: 'none', 
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid #333', 
            color: 'var(--accent    )', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8,
            fontSize: 12,
            fontWeight: 600
          }}
           onMouseEnter={e => {
                 e.currentTarget.style.borderColor = 'var(--accent)';
          
            }}
            onMouseLeave={e => {
                 e.currentTarget.style.borderColor = 'var(--border)';
            }}
        >
          &#129032; BACK TO AUDIT
        </button>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={handleExportCSV}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px', color: 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; 
              e.currentTarget.style.color = 'var(--accent)';
             }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; 
              e.currentTarget.style.color = 'var(--text)';
            }}
          >
            Export CSV
          </button>
          <button 
            onClick={handleDownloadPDF}
            style={{ background: 'var(--info)', border: 'none', borderRadius: 8, padding: '8px 16px', color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            &#129035; DOWNLOAD COMPARISON REPORT
          </button>
        </div>
      </div>

      {/* Comparison Overview */}
      <div style={{ 
        background: 'var(--surface)', 
        border: '1px solid var(--border)', 
        borderRadius: 24, 
        padding: 40,
        display: 'grid',
        gridTemplateColumns: '1fr 300px',
        gap: 40,
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
      }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Target : {latestAudit.url}</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Site Audit Comparison</h2>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 16 }}>Comparing {audits.length} runs between : {new Date(firstAudit.timestamp).toLocaleDateString()} and {new Date(latestAudit.timestamp).toLocaleDateString()}</p>
         {/* <div style={{ display: 'flex', gap: 16, marginBottom: 24, fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
            <span>FROM: {firstAudit.id}</span>
            <span>TO: {latestAudit.id}</span>
          </div>*/}
          
          <div style={{ display: 'flex', gap: 16 }}>
            <IssueBadge type="new" count={comparisons.reduce((acc, c) => acc + Object.values(c.categoryDiffs).reduce((a, cd) => a + cd.issues.added.length, 0), 0)} />
            <IssueBadge type="fixed" count={comparisons.reduce((acc, c) => acc + Object.values(c.categoryDiffs).reduce((a, cd) => a + cd.issues.fixed.length, 0), 0)} />
            <IssueBadge type="remaining" count={Object.values(latestAudit.categories).reduce((acc, c) => acc + c.issues.length, 0)} />
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid var(--border)', paddingLeft: 40 }}>
          <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Overall Score Change</div>
          <div style={{ 
            fontSize: 48, 
            fontWeight: 900, 
            color: summary.overallTrend >= 0 ? 'var(--pass)' : 'var(--fail)',
            display: 'flex',
            alignItems: 'baseline',
            gap: 4
          }}>
            {summary.overallTrend >= 0 ? '+' : ''}{summary.overallTrend}
            <span style={{ fontSize: 16, color: 'var(--text3)' }}>%</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 8 }}>From {firstAudit.totalScore} to {latestAudit.totalScore}</div>
        </div>
      </div>

      {/* Trends Chart */}
      <div style={{ 
        background: 'var(--surface)', 
        border: '1px solid var(--border)', 
        borderRadius: 24, 
        padding: 32,
        height: 400
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 24 }}>Health Score Trend</h3>
        <div style={{ height: 300 }}>
          <Line data={chartData} options={chartOptions as any} />
        </div>
      </div>

      {/* Metrics Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', borderLeft: '4px solid var(--accent)', paddingLeft: 16 }}>Metrics Comparison</h3>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '20px 24px', fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1.5 }}>Category</th>
                <th style={{ padding: '20px 24px', fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1.5 }}>{new Date(firstAudit.timestamp).toLocaleDateString()}</th>
                <th style={{ padding: '20px 24px', fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1.5 }}>{new Date(latestAudit.timestamp).toLocaleDateString()}</th>
                <th style={{ padding: '20px 24px', fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1.5 }}>Change</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(latestAudit.categories).map(key => {
                const catKey = key as keyof typeof latestAudit.categories;
                const pScore = firstAudit.categories[catKey]?.score || 0;
                const cScore = latestAudit.categories[catKey]?.score || 0;
                const diff = cScore - pScore;
                return (
                  <tr key={catKey} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '20px 24px', fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize' }}>{catKey}</td>
                    <td style={{ padding: '20px 24px', color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>{pScore}</td>
                    <td style={{ padding: '20px 24px', color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>{cScore}</td>
                    <td style={{ 
                      padding: '20px 24px', 
                      fontWeight: 800, 
                      color: diff > 0 ? 'var(--pass)' : diff < 0 ? 'var(--fail)' : 'var(--text3)',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {diff > 0 ? '↑' : diff < 0 ? '↓' : '-'} {Math.abs(diff)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issues Breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', borderLeft: '4px solid var(--accent)', paddingLeft: 16 }}>Issue Delta Details</h3>
        
        {comparisons[comparisons.length - 1] && Object.entries(comparisons[comparisons.length - 1].categoryDiffs).map(([catKey, diff]) => (
          (diff.issues.added.length > 0 || diff.issues.fixed.length > 0) && (
            <div key={catKey} style={{ background: 'var(--surface)', borderRadius: 20, padding: 24, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 20, fontWeight: 700 }}>
                {catKey} Differences
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Fixed Issues */}
                  {diff.issues.fixed.map((issue, i) => (
                    <div key={`fixed-${i}`} style={{ background: 'rgba(74, 222, 128, 0.03)', border: '1px solid rgba(74, 222, 128, 0.1)', borderRadius: 12, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ color: 'var(--pass)', fontSize: 18 }}>✓</span>
                        <div>
                          <div style={{ color: 'var(--pass)', fontSize: 11, fontWeight: 800, marginBottom: 4 }}>FIXED</div>
                          <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: 14 }}>{issue.message}</div>
                        </div>
                      </div>
                    </div>
                  ))}

                {/* New Issues */}
                  {diff.issues.added.map((issue, i) => (
                    <div key={`new-${i}`} style={{ background: 'rgba(248, 113, 113, 0.03)', border: '1px solid rgba(248, 113, 113, 0.1)', borderRadius: 12, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ color: 'var(--fail)', fontSize: 18 }}>+</span>
                        <div>
                          <div style={{ color: 'var(--fail)', fontSize: 11, fontWeight: 800, marginBottom: 4 }}>NEW ISSUE</div>
                          <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: 14 }}>{issue.message}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: 9, padding: '2px 6px', background: 'rgba(248, 113, 113, 0.1)', color: 'var(--fail)', borderRadius: 4, textTransform: 'uppercase', border: '1px solid var(--fail)' }}>{issue.severity}</span>
                    </div>
                  ))}
              </div>
            </div>
          )
        ))}
      </div>

    </div>
  );
}
