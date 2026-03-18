import { useState, useEffect, useMemo } from 'react'
import type { AuditResult, AuditCategory, AuditIssue } from '../../../src/types/index'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement
);

interface AuditPanelProps {
  onBusyChange: (busy: boolean) => void
}

export default function AuditPanel({ onBusyChange }: AuditPanelProps) {
  const [url, setUrl] = useState('')
  const [useAuth, setUseAuth] = useState(false)
  const [authUser, setAuthUser] = useState('')
  const [authPass, setAuthPass] = useState('')
  const [persona, setPersona] = useState<'screen-reader' | 'low-vision' | 'keyboard-only' | 'all'>('all')
  const [result, setResult] = useState<AuditResult | null>(null)
  const [history, setHistory] = useState<AuditResult[]>([])
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(true)
  const [compare, setCompare] = useState(false)
  const [selectedComparisonId, setSelectedComparisonId] = useState<string | null>(null)

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{ type: 'delete' | 'clear-all' | 'delete-selected', id?: string } | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set())

  const fetchAudits = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/audits')
      setHistory(await res.json())
    } catch (err) { }
  }

  const [includeSeo, setIncludeSeo] = useState(true)

  useEffect(() => {
    fetchAudits()
  }, [])

  const handleAudit = async () => {
    if (!url) return
    setRunning(true)
    onBusyChange(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('http://localhost:3001/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          authUser: useAuth ? authUser : undefined,
          authPass: useAuth ? authPass : undefined,
          persona,
          includeSeo,
          compare
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
      if (data.comparisons) {
        setSelectedComparisonId('desktop')
      } else {
        setSelectedComparisonId(null)
      }
      fetchAudits()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRunning(false)
      onBusyChange(false)
    }
  }

  const handleDeleteAudit = async (id: string) => {
    await fetch(`http://localhost:3001/api/audits/${id}`, { method: 'DELETE' })
    fetchAudits()
    if (result?.id === id) setResult(null)
    setConfirmModal(null)
  }

  const handleDeleteMultipleAudits = async (ids: string[]) => {
    await fetch(`http://localhost:3001/api/audits/delete-bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    })
    fetchAudits()
    if (result && ids.includes(result.id!)) setResult(null)
    setConfirmModal(null)
  }

  const handleClearAll = async () => {
    // We need a clear all endpoint or just loop/overwrite
    // For now let's assume server supports DELETE /api/audits
    await fetch('http://localhost:3001/api/audits', { method: 'DELETE' })
    fetchAudits()
    setResult(null)
    setConfirmModal(null)
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#4ade80'
    if (score >= 50) return '#fbbf24'
    return '#f87171'
  }

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
  }

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

  const handleHighlight = async (selector: string, message: string) => {
    if (!result?.url || !selector) return;
    try {
      await fetch('http://localhost:3001/api/audit/highlight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: result.url, selector, message })
      });
    } catch (err) {
      console.error('Highlight failed:', err);
    }
  };

  const PerformanceCharts = ({ metrics }: { metrics: Record<string, string | number> }) => {
    const data = {
      labels: ['FCP (ms)', 'TBT (ms)', 'DOM Nodes'],
      datasets: [
        {
          label: 'Value',
          data: [
            parseInt(String(metrics['FCP'] || '0')),
            parseInt(String(metrics['TBT'] || '0')),
            parseInt(String(metrics['DOM Nodes'] || '0'))
          ],
          backgroundColor: [
            'rgba(74, 222, 128, 0.6)',
            'rgba(248, 113, 113, 0.6)',
            'rgba(251, 191, 36, 0.6)'
          ],
          borderColor: [
            'rgb(74, 222, 128)',
            'rgb(248, 113, 113)',
            'rgb(251, 191, 36)'
          ],
          borderWidth: 1,
        },
      ],
    };

    const options = {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'Performance Metrics Breakdown', color: '#fff' },
      },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#888' } },
        x: { grid: { display: false }, ticks: { color: '#888' } }
      }
    };

    return <div style={{ height: 200, marginTop: 16 }}><Bar data={data} options={options} /></div>;
  };

  const DeviceComparisonChart = ({ comparisons }: { comparisons: Record<string, AuditResult> }) => {
    const categories: (keyof AuditResult['categories'])[] = ['functional', 'ui', 'links', 'console', 'performance', 'accessibility', 'seo'];

    // Filter out categories that aren't present in any comparison
    const activeCategories = categories.filter(cat =>
      Object.values(comparisons).some(res => res.categories[cat])
    );

    const labels = activeCategories.map(cat => cat === 'ui' ? 'UI' : cat === 'seo' ? 'SEO' : cat.charAt(0).toUpperCase() + cat.slice(1));

    const data = {
      labels,
      datasets: [
        {
          label: 'Desktop',
          data: activeCategories.map(cat => comparisons.desktop?.categories[cat]?.score || 0),
          backgroundColor: 'rgba(56, 189, 248, 0.7)',
          borderColor: 'rgb(56, 189, 248)',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Mobile',
          data: activeCategories.map(cat => comparisons.mobile?.categories[cat]?.score || 0),
          backgroundColor: 'rgba(248, 113, 113, 0.7)',
          borderColor: 'rgb(248, 113, 113)',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Low-end Mobile',
          data: activeCategories.map(cat => comparisons.lowEndMobile?.categories[cat]?.score || 0),
          backgroundColor: 'rgba(251, 191, 36, 0.7)',
          borderColor: 'rgb(251, 191, 36)',
          borderWidth: 1,
          borderRadius: 4,
        }
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          labels: { color: '#ccc', boxWidth: 12, font: { size: 10, weight: 'bold' } }
        },
        title: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          titleColor: 'var(--accent)',
          bodyColor: '#fff',
          padding: 12,
          cornerRadius: 10,
          displayColors: true
        }
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
          ticks: { color: '#888', font: { size: 11, family: 'var(--font-mono)' } },
          title: { display: true, text: 'Score', color: '#666', font: { size: 10 } }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#aaa', font: { size: 11, weight: 'bold' } }
        }
      }
    };

    return (
      <div style={{
        marginTop: 20,
        background: 'var(--surface)',
        padding: '24px',
        borderRadius: 24,
        border: '1px solid var(--border)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
      }}>
        <div style={{
          fontSize: 12,
          fontWeight: 800,
          color: 'var(--text2)',
          textTransform: 'uppercase',
          letterSpacing: 2,
          marginBottom: 20,
          textAlign: 'center'
        }}>Category Breakdown by Device</div>
        <div style={{ height: 320 }}>
          <Bar data={data} options={options as any} />
        </div>
      </div>
    );
  };

  const CategoryCard = ({ title, cat, icon }: { title: string, cat: AuditCategory, icon: string }) => (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>{icon}</span>
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)', letterSpacing: 0.5 }}>{title}</span>
        </div>
        <div style={{
          fontSize: 22,
          fontWeight: 800,
          color: getScoreColor(cat.score),
          fontFamily: 'var(--font-mono)'
        }}>{cat.score}</div>
      </div>

      <div style={{ height: 6, background: '#222', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${cat.score}%`,
          background: getScoreColor(cat.score),
          transition: 'width 1.2s cubic-bezier(0.2, 0, 0, 1)'
        }} />
      </div>

      <div style={{ marginTop: 4 }}>
        {cat.metrics && Object.keys(cat.metrics).length > 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginBottom: 16,
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            {Object.entries(cat.metrics)
              .filter(([label]) => label !== 'JS Heap Used')
              .map(([label, value]) => {
                const info = getMetricInfo(label, value);
                return (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 40 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 12, color: 'var(--text1)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2 }}>{label}</span>
                      {metricDescriptions[label] && (
                        <span style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.3, maxWidth: 180 }}>{metricDescriptions[label]}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {info && <span style={{ fontSize: 10, padding: '1px 4px', borderRadius: 4, background: info.color + '22', color: info.color, fontWeight: 800, border: `1px solid ${info.color}44` }}>{info.label}</span>}
                        <span style={{
                          fontSize: 16,
                          color: info?.color || 'var(--text)',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)'
                        }}>{value}</span>
                      </div>
                      {info && <span style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>Limit: {info.limit}</span>}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px' }}>
          <span style={{ color: cat.status === 'passed' ? '#4ade80' : cat.status === 'warning' ? '#fbbf24' : '#f87171', fontSize: 16 }}>
            {cat.status === 'passed' ? '✓' : '●'}
          </span>
          <span style={{ color: 'var(--text2)', fontWeight: 500 }}>
            {cat.score === 100 ? 'Perfectly optimized' : cat.issues.length === 0 ? 'No issues found' : `${cat.issues.length} ${cat.issues.length === 1 ? 'issue' : 'issues'} detected`}
          </span>
        </div>
        {title === 'Performance' && cat.metrics && <PerformanceCharts metrics={cat.metrics} />}
      </div>
    </div>
  )

  const ComparisonView = ({ comparisons }: { comparisons: Record<string, AuditResult> }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.4s ease-out', marginBottom: 20 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 16
      }}>
        {Object.entries(comparisons).map(([id, res]) => {
          const isActive = selectedComparisonId === id;
          return (
            <div key={id}
              onClick={() => setSelectedComparisonId(id)}
              style={{
                background: isActive ? 'rgba(200,240,105,0.05)' : 'var(--surface)',
                border: isActive ? '2px solid var(--accent)' : '2px solid var(--border)',
                borderRadius: 20,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                boxShadow: isActive ? '0 5px 20px rgba(200,240,105,0.15)' : '0 4px 12px rgba(0,0,0,0.1)',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isActive ? 'translateY(-4px)' : 'none'
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: isActive ? 6 : 4,
                bottom: 0,
                background: getScoreColor(res.totalScore)
              }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: isActive ? 'var(--accent)' : 'var(--text3)',
                  textTransform: 'uppercase',
                  letterSpacing: 1.2
                }}>{id === 'lowEndMobile' ? 'Low-end Mobile' : id.charAt(0).toUpperCase() + id.slice(1)}</span>
                <div style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color: getScoreColor(res.totalScore),
                  fontFamily: 'var(--font-mono)'
                }}>{res.totalScore}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {Object.entries(res.categories).slice(0, 4).map(([name, cat]) => (
                  <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: 6 }}>
                    <span style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'capitalize' }}>{name.slice(0, 4)}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: getScoreColor(cat.score) }}>{cat.score}</span>
                  </div>
                ))}
              </div>

              <div style={{
                textAlign: 'center',
                fontSize: 10,
                fontWeight: 700,
                color: isActive ? 'var(--accent)' : 'var(--text3)',
                marginTop: 4,
                opacity: isActive ? 1 : 0.6
              }}>
                {isActive ? '● VIEWING DETAILS' : 'CLICK TO VIEW FULL DETAILS'}
              </div>
            </div>
          );
        })}
      </div>
      <DeviceComparisonChart comparisons={comparisons} />
    </div>
  )

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 20, minHeight: '80vh', position: 'relative' }}>

      {/* Confirmation Modal Overlay */}
      {confirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 32,
            maxWidth: 400,
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            animation: 'modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <style>{`
              @keyframes modalIn {
                from { opacity: 0; transform: scale(0.9) translateY(20px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
              }
            `}</style>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
              {confirmModal.type === 'clear-all' ? 'Clear All History?' : confirmModal.type === 'delete-selected' ? 'Delete Selected?' : 'Delete This Audit?'}
            </h3>
            <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.5, marginBottom: 24 }}>
              {confirmModal.type === 'clear-all'
                ? 'This will permanently remove all saved site audits. This action cannot be undone.'
                : confirmModal.type === 'delete-selected'
                ? `This will permanently delete ${selectedForDeletion.size} selected audits.`
                : 'This individual report will be permanently deleted from your history.'}
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setConfirmModal(null)}
                style={{ flex: 1, padding: '12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontWeight: 600, cursor: 'pointer' }}
              >Cancel</button>
              <button
                onClick={() => {
                  if (confirmModal.type === 'clear-all') handleClearAll();
                  else if (confirmModal.type === 'delete-selected') {
                    handleDeleteMultipleAudits(Array.from(selectedForDeletion));
                    setIsEditing(false);
                    setSelectedForDeletion(new Set());
                  } else handleDeleteAudit(confirmModal.id!);
                }}
                style={{ flex: 1, padding: '12px', background: '#f87171', border: 'none', borderRadius: 8, color: '#000', fontWeight: 700, cursor: 'pointer' }}
              >Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar History */}
      {showHistory && (
        <div style={{ width: 330, flexShrink: 0, borderRight: '1px solid var(--border)', paddingRight: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text1)', textTransform: 'uppercase', letterSpacing: 1.5, margin: 0 }}>Recent Audits</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              {isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setSelectedForDeletion(new Set());
                    }}
                    style={{ background: 'none', border: '1px solid var(--text2)', borderRadius: 6, padding: '4px 12px', color: 'var(--text2)', fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer', letterSpacing: 1 }}>
                    CANCEL
                  </button>
                  <button
                    onClick={() => setConfirmModal({ type: 'delete-selected' })}
                    disabled={selectedForDeletion.size === 0}
                    style={{ background: selectedForDeletion.size > 0 ? '#f8717122' : 'none', border: `1px solid ${selectedForDeletion.size > 0 ? '#f8717144' : 'var(--border)'}`, borderRadius: 6, padding: '4px 12px', color: selectedForDeletion.size > 0 ? 'var(--fail)' : 'var(--text3)', fontSize: 11, fontFamily: 'var(--font-mono)', cursor: selectedForDeletion.size === 0 ? 'not-allowed' : 'pointer', letterSpacing: 1, opacity: selectedForDeletion.size === 0 ? 0.5 : 1 }}>
                    DELETE ({selectedForDeletion.size})
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 12px', color: 'var(--accent)', fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer', letterSpacing: 1 }}>
                    EDIT
                  </button>
                  <button
                    onClick={() => setConfirmModal({ type: 'clear-all' })}
                    disabled={history.length === 0}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 12px', color: 'var(--fail)', fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer', letterSpacing: 1, opacity: history.length === 0 ? 0.3 : 1 }}>
                    CLEAR ALL
                  </button>
                </>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
            {history.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>No previous audits.</p>
            ) : (
              history.map(item => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (isEditing) {
                      if (item.id) {
                        const newSet = new Set(selectedForDeletion);
                        if (newSet.has(item.id)) newSet.delete(item.id); else newSet.add(item.id);
                        setSelectedForDeletion(newSet);
                      }
                    } else {
                      setResult(item);
                      if (item.comparisons) {
                        setSelectedComparisonId('desktop');
                      } else {
                        setSelectedComparisonId(null);
                      }
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: result?.id === item.id && !isEditing ? 'var(--surface2)' : 'rgba(255,255,255,0.02)',
                    border: `2px solid ${isEditing ? (item.id && selectedForDeletion.has(item.id) ? 'var(--fail)' : 'var(--border2)') : (result?.id === item.id ? 'var(--accent)' : 'var(--border2)')}`,
                    borderRadius: 14,
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    height: 76,
                    marginBottom: 4
                  }}
                  onMouseEnter={e => {
                    if (!isEditing && result?.id !== item.id) {
                      e.currentTarget.style.borderColor = 'var(--text3)';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = isEditing ? (item.id && selectedForDeletion.has(item.id) ? 'var(--fail)' : 'var(--border2)') : (result?.id === item.id ? 'var(--accent)' : 'var(--border2)');
                  }}
                >
                  {/* Left Score Block - Boldly colored block like the mockup */}
                  <div style={{
                    width: 54,
                    flexShrink: 0,
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: getScoreColor(item.totalScore),
                    borderRight: '2px solid rgba(0,0,0,0.1)',
                    color: '#141414ff',
                    fontWeight: 900,
                    fontSize: 22,
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {item.totalScore}
                  </div>

                  {/* Center Content - clean site_name and date/time info */}
                  <div style={{
                    flex: 1,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: 2,
                    minWidth: 0
                  }}>
                    <div
                      title={item.url}
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: 'var(--text)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        letterSpacing: -0.3
                      }}>
                      {item.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500, letterSpacing: 0.2 }}>
                      {new Date(item.timestamp).toLocaleDateString()} at {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {/* Right Action Area - Fixed width for the delete button */}
                  <div style={{ width: 44, flexShrink: 0, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isEditing && item.id && (
                      <div style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        border: `2px solid ${selectedForDeletion.has(item.id) ? 'var(--fail)' : 'var(--border2)'}`,
                        background: selectedForDeletion.has(item.id) ? 'var(--fail)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {selectedForDeletion.has(item.id) && <span style={{ color: '#000', fontSize: 12, fontWeight: 800 }}>✓</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* Search Header */}
        <div style={{ textAlign: 'center', padding: '20px 0', position: 'relative' }}>
          {/* New Left-side History Toggle */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              position: 'absolute',
              left: 0,
              top: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text2)',
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              cursor: 'pointer',
              transition: 'all 0.2s',
              zIndex: 10
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <span>{showHistory ? '⟪' : '⟫'}</span>
            <span>History</span>
          </button>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)' }}>Site <em style={{ color: 'var(--accent)', fontFamily: 'var(--font-serif)' }}>Audit</em></h1>
          </div>
          <p style={{ color: 'var(--text2)', marginBottom: 32 }}>Professional multi-dimensional QA & SEO verification engine.</p>

          <div style={{ display: 'flex', gap: 12, maxWidth: 660, margin: '0 auto' }}>
            <input
              type="text"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={running}
              style={{
                flex: 1,
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '12px 16px',
                color: 'var(--text)',
                fontSize: 15,
                outline: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
            />
            <button
              onClick={handleAudit}
              disabled={running || !url}
              style={{
                background: running ? 'var(--surface2)' : 'var(--accent)',
                color: '#000',
                border: 'none',
                borderRadius: 8,
                padding: '0 24px',
                fontWeight: 600,
                fontSize: 14,
                cursor: running ? 'not-allowed' : 'pointer',
                opacity: running || !url ? 0.6 : 1,
                transition: 'all 0.2s',
                letterSpacing: 0.5
              }}
            >
              {running ? '● Analyzing...' : 'RUN AUDIT'}
            </button>
          </div>

          <div style={{ maxWidth: 660, margin: '20px auto 0', display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'left', padding: '0 4px' }}>
            <div>
              <label style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Persona Audit Focus</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['all', 'screen-reader', 'low-vision', 'keyboard-only'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPersona(p)}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      background: persona === p ? 'var(--accent)' : 'var(--surface2)',
                      border: `1px solid ${persona === p ? 'var(--accent)' : 'var(--border2)'}`,
                      borderRadius: 8,
                      color: persona === p ? '#0f0f0f' : 'var(--text2)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      cursor: 'pointer',
                      fontWeight: persona === p ? 500 : 400,
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    {p.replace('-', ' ')}
                  </button>
                ))}
              </div>
              <p style={{ color: 'var(--accent)', opacity: 0.7, fontSize: 12, marginTop: 10 }}>
                {persona === 'all' && 'Comprehensive full-spectrum audit for all audiences.'}
                {persona === 'screen-reader' && 'Prioritizes ARIA roles, semantics, and audio navigation.'}
                {persona === 'low-vision' && 'Prioritizes layout stability, contrast, and visual flow.'}
                {persona === 'keyboard-only' && 'Prioritizes focus management and keyboard operability.'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div onClick={() => setUseAuth(!useAuth)} style={{ width: 36, height: 20, borderRadius: 10, background: useAuth ? 'var(--accent)' : 'var(--surface2)', border: '1px solid var(--border2)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', top: 2, left: useAuth ? 17 : 2, width: 14, height: 14, borderRadius: '50%', background: useAuth ? '#0f0f0f' : 'var(--text3)', transition: 'left 0.2s' }} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>Site requires Authentication</span>
              </div>
              {useAuth && (
                <div style={{ display: 'flex', gap: 12, padding: '14px', background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 10, animation: 'fadeIn 0.2s ease-out' }}>
                  <input style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 6, padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none' }} placeholder="Username" value={authUser} onChange={e => setAuthUser(e.target.value)} />
                  <input type="password" style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 6, padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none' }} placeholder="Password" value={authPass} onChange={e => setAuthPass(e.target.value)} />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div onClick={() => setIncludeSeo(!includeSeo)} style={{ width: 36, height: 20, borderRadius: 10, background: includeSeo ? 'var(--accent)' : 'var(--surface2)', border: '1px solid var(--border2)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', top: 2, left: includeSeo ? 17 : 2, width: 14, height: 14, borderRadius: '50%', background: includeSeo ? '#0f0f0f' : 'var(--text3)', transition: 'left 0.2s' }} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>Include Search & SEO Audit</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div onClick={() => setCompare(!compare)} style={{ width: 36, height: 20, borderRadius: 10, background: compare ? 'var(--accent)' : 'var(--surface2)', border: '1px solid var(--border2)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', top: 2, left: compare ? 17 : 2, width: 14, height: 14, borderRadius: '50%', background: compare ? '#0f0f0f' : 'var(--text3)', transition: 'left 0.2s' }} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>Compare across devices (Desktop, Mobile, Low-end Mobile)</span>
              </div>
            </div>
          </div>

          {error && <div style={{ color: '#f87171', marginTop: 16, fontSize: 14, padding: '12px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8 }}>{error}</div>}
        </div>

        {running && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10,10,10,0.6)',
            backdropFilter: 'blur(8px)',
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              .audit-spinner {
                animation: spin 0.8s linear infinite !important;
              }
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
            `}</style>
            <div className="audit-spinner" style={{
              width: 56,
              height: 56,
              border: '4px solid rgba(255,255,255,0.1)',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              marginBottom: 24,
              boxShadow: '0 0 30px rgba(200,240,105,0.2)'
            }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>Deep Analysis in Progress</div>
              <p style={{ color: 'var(--text2)', fontSize: 15, fontWeight: 500, margin: 0 }}>Simulating devices & capturing metrics...</p>
              <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 12 }}>Typically takes 15-45 seconds depending on site complexity.</p>
            </div>
          </div>
        )}

        {result && !running && (() => {
          const displayResult = (result.comparisons && selectedComparisonId)
            ? result.comparisons[selectedComparisonId]
            : result;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 40, animation: 'fadeIn 0.4s ease-out' }}>
              <div style={{ background: 'linear-gradient(135deg, #111 0%, #1a1a1a 100%)', border: '1px solid #333', borderRadius: 20, padding: '36px 44px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, fontWeight: 700 }}>
                    {result.comparisons && selectedComparisonId ? `Details: ${selectedComparisonId === 'lowEndMobile' ? 'Low-end Mobile' : selectedComparisonId.toUpperCase()}` : 'Overall Health Score'}
                  </div>
                  <div style={{ fontSize: 64, fontWeight: 800, color: getScoreColor(displayResult.totalScore), lineHeight: 1 }}>{displayResult.totalScore}<span style={{ fontSize: 24, color: '#444' }}>/100</span></div>
                  <div style={{ marginTop: 14, color: 'var(--text3)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>REPORT_ID: {result.id || 'LIVE_PREVIEW'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Target URL</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>{result.url}</div>
                  <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 8 }}>Audited: {new Date(result.timestamp).toLocaleString()}{result.comparisons && ' (Multi-Device Comparison)'}</div>
                </div>
              </div>

              {result.comparisons ? (
                <ComparisonView comparisons={result.comparisons} />
              ) : null}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
                <CategoryCard title="Functional Health" icon="⚙️" cat={displayResult.categories.functional} />
                <CategoryCard title="UI & Visuals" icon="🎨" cat={displayResult.categories.ui} />
                <CategoryCard title="Broken Links" icon="🔗" cat={displayResult.categories.links} />
                <CategoryCard title="Console & Errors" icon="📟" cat={displayResult.categories.console} />
                <CategoryCard title="Performance" icon="⚡" cat={displayResult.categories.performance} />
                <CategoryCard title="Accessibility" icon="♿" cat={displayResult.categories.accessibility} />
                {displayResult.categories.seo && (
                  <CategoryCard title="Search & SEO" icon="🔍" cat={displayResult.categories.seo} />
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', borderLeft: '4px solid var(--accent)', paddingLeft: 16 }}>Detailed Observations</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {Object.entries(displayResult.categories).map(([key, cat]) => (
                    cat.issues.length > 0 && (
                      <div key={key} style={{ background: '#0a0a0a', borderRadius: 16, padding: 24, border: '1px solid #1a1a1a' }}>
                        <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 20, fontWeight: 700 }}>{key} Issues ({cat.issues.length})</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          {cat.issues.map((issue, i) => (
                            <div key={i} style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                  <span style={{ color: issue.type === 'error' ? '#f87171' : '#fbbf24', fontSize: 22 }}>{issue.type === 'error' ? '⊗' : '⚠'}</span>
                                  <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: 15 }}>{issue.message}</span>
                                  <span style={{ fontSize: 9, padding: '2px 6px', background: issue.severity === 'critical' ? '#411' : '#222', color: issue.severity === 'critical' ? '#f87171' : 'var(--text3)', borderRadius: 4, textTransform: 'uppercase' }}>{issue.severity}</span>
                                  {issue.confidence && (
                                    <span style={{ fontSize: 9, padding: '2px 6px', background: 'rgba(255,255,255,0.05)', color: 'var(--text3)', borderRadius: 4, textTransform: 'uppercase', border: '1px solid rgba(255,255,255,0.1)' }}>
                                      Confidence: {issue.confidence}
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  {issue.selector && (
                                    <button
                                      onClick={() => handleHighlight(issue.selector!, issue.message)}
                                      style={{ background: 'rgba(248, 113, 113, 0.1)', color: '#f87171', fontSize: 10, fontWeight: 700, textDecoration: 'none', border: '1px solid #f87171', padding: '4px 12px', borderRadius: 6, cursor: 'pointer' }}
                                    >HIGHLIGHT</button>
                                  )}
                                  {issue.url && <a href={issue.url} target="_blank" style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 700, textDecoration: 'none', border: '1px solid var(--accent)', padding: '4px 10px', borderRadius: 6 }}>OPEN LINK</a>}
                                </div>
                              </div>
                              {issue.impact && <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}><span style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginTop: 3 }}>Impact</span><span style={{ color: 'var(--text2)', fontSize: 14 }}>{issue.impact}</span></div>}
                              {issue.recommendation && <div style={{ background: 'rgba(200,240,105,0.05)', padding: '12px 16px', borderRadius: 8, border: '1px solid rgba(200,240,105,0.1)', display: 'flex', gap: 10, alignItems: 'flex-start' }}><span style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginTop: 3 }}>Fix</span><span style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.5 }}>{issue.recommendation}</span></div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
