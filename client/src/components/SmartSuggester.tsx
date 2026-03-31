import { useState, useEffect } from 'react'
import StepEditor, { EditableStep } from './StepEditor'

interface TestSuggestion {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  steps?: {
    action: string;
    target?: string | { primary: string; fallback: string[] };
    value?: string;
    description: string;
    intent?: string;
    assertType?: 'visible' | 'text' | 'url';
  }[];
  confidence?: {
    detection: number;
    selector: number;
    outcome: number;
  };
  testDescription?: string; // Legacy field
  isNegative?: boolean;
  isExecutable: boolean;
  intent: string;
  expectedState?: string;
  url: string;
  why: string;
}

interface ScanSummary {
  url: string; scannedAt: string; pagesVisited: number
  elementsFound: any[]; suggestions: TestSuggestion[]
  siteName?: string
}

interface StepResult {
  step: { 
    action: string; 
    target?: string | { primary: string; fallback: string[] }; 
    value?: string; 
    description: string;
    intent?: string;
    assertType?: 'visible' | 'text' | 'url';
  }
  status: 'passed' | 'failed' | 'skipped'; 
  durationMs: number; 
  error?: string; 
  screenshotPath?: string;
}
interface TestResult {
  id?: string;
  plan: { title: string; naturalLanguageInput: string }
  status: 'passed' | 'failed' | 'error'; stepResults: StepResult[]
  totalDurationMs: number; startedAt: string; reportPath?: string; error?: string
}

const PRIORITY_COLOR = { high: 'var(--fail)', medium: 'var(--accent)', low: 'var(--text3)' }
const PRIORITY_BG = { high: 'var(--fail-glow)', medium: 'var(--accent-glow)', low: 'var(--surface2)' }
const CATEGORY_LABELS: Record<string, string> = {
  auth: 'Auth', navigation: 'Navigation', form: 'Forms',
  search: 'Search', ecommerce: 'E-commerce', content: 'Content', ui: 'UI'
}

interface Props { 
  onBusyChange?: (busy: boolean) => void;
  switchTab?: (tab: 'home' | 'history' | 'record' | 'suggest' | 'audit' | 'settings') => void;
  setHighlightId?: (id: string | null) => void;
}
export default function SmartSuggester({ onBusyChange, switchTab, setHighlightId }: Props = {}) {
  const [url, setUrl] = useState('')
  const [siteName, setSiteName] = useState('')
  const [useAuth, setUseAuth] = useState(false)
  const [authUser, setAuthUser] = useState('')
  const [authPass, setAuthPass] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [activeResult, setActiveResult] = useState<ScanSummary | null>(null)
  const [savedScans, setSavedScans] = useState<ScanSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState('all')
  const [expandedWhy, setExpandedWhy] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<{ sugId: string; result: TestResult } | null>(null)
  const [running, setRunning] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  // Edit state: sugId -> current edited text/steps
  const [editingSugId, setEditingSugId] = useState<string | null>(null)
  const [editedSteps, setEditedSteps] = useState<EditableStep[]>([])
  const [editText, setEditText] = useState('')
  // Rename state
  const [renamingUrl, setRenamingUrl] = useState<string | null>(null)
  const [renameText, setRenameText] = useState('')
  // Toast state
  const [showRunToast, setShowRunToast] = useState(false)

  const fetchSaved = async () => {
    try {
      const r = await fetch('http://localhost:3001/api/suggestions')
      const data: ScanSummary[] = await r.json()
      setSavedScans(data.reverse())
      if (data.length > 0 && !activeResult) setActiveResult(data[0])
    } catch {}
  }

  useEffect(() => {
    fetchSaved();
    return () => onBusyChange?.(false);
  }, []);

  const handleScan = async () => {
    if (!url.trim()) return
    setScanning(true); setError(null); onBusyChange?.(true)
    try {
      const res = await fetch('http://localhost:3001/api/suggest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          siteName: siteName.trim() || undefined,
          authUser: useAuth && authUser.trim() ? authUser.trim() : undefined,
          authPass: useAuth && authPass.trim() ? authPass.trim() : undefined,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setActiveResult(data)
      fetchSaved()
    } catch (err) { setError(err instanceof Error ? err.message : String(err)) }
    finally { setScanning(false); onBusyChange?.(false) }
  }

  const handleRun = async (sug: TestSuggestion) => {
    setRunningId(sug.id)
    setRunResult(null)
    setRunning(true); onBusyChange?.(true)
    try {
      const res = await fetch('http://localhost:3001/api/run-test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'web',
          url: sug.url,
          test: JSON.stringify(sug.steps), // Send structured steps
          isStructured: true,
          headless: true,
          authUser: useAuth && authUser.trim() ? authUser.trim() : undefined,
          authPass: useAuth && authPass.trim() ? authPass.trim() : undefined,
        }),
      })
      const data: TestResult = await res.json()
      setRunResult({ sugId: sug.id, result: data })
    } catch (err) {
      console.error(err)
    } finally {
      setRunning(false)
      onBusyChange?.(false)
      setRunningId(null) // Reset button state
      window.scrollTo({ top: 0, behavior: 'smooth' }) // Scroll to see toast
      // Show run toast (persistent until manual close or new run)
      setShowRunToast(true)
    }
  }

  const handleCopy = (sug: TestSuggestion) => {
    navigator.clipboard.writeText(JSON.stringify(sug.steps, null, 2))
    setCopiedId(sug.id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const handleDeleteScan = async (scanUrl: string) => {
    await fetch('http://localhost:3001/api/suggestions', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: scanUrl }),
    })
    setConfirmDelete(null)
    if (activeResult?.url === scanUrl) setActiveResult(null)
    fetchSaved()
  }

  // Save site name for a scan
  const handleRenameSave = async () => {
    if (!renamingUrl) return
    try {
      await fetch('http://localhost:3001/api/suggestions/rename', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: renamingUrl, siteName: renameText.trim() }),
      })
      // Update local state
      setSavedScans(prev => prev.map(s => s.url === renamingUrl ? { ...s, siteName: renameText.trim() } : s))
      if (activeResult?.url === renamingUrl) setActiveResult(prev => prev ? { ...prev, siteName: renameText.trim() } : prev)
    } catch {}
    setRenamingUrl(null)
  }

  // Save edited steps back to global suggestions
  const handleSaveSteps = async (suggestionId: string, steps: EditableStep[]) => {
    if (!activeResult) return
    try {
      await fetch('http://localhost:3001/api/suggestions/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: activeResult.url,
          suggestionId,
          steps
        }),
      })
      // Update local state
      setActiveResult(prev => {
        if (!prev) return null
        return {
          ...prev,
          suggestions: prev.suggestions.map(s => 
            s.id === suggestionId ? { ...s, steps, isExecutable: true } : s
          )
        }
      })
      setEditingSugId(null)
    } catch (err) {
      setError('Failed to save test steps')
    }
  }

  // Legacy edit for description (kept for safety)
  const handleEditSave = async (sugId: string) => {
    // No longer needed since we have StepEditor, but kept for UI structure if needed
    setEditingSugId(null)
  }

  const handleScrollToResult = (sugId: string) => {
    const el = document.getElementById(`sug-${sugId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Visual highlight flash
      el.style.borderColor = 'var(--accent)'
      setTimeout(() => { if (el) el.style.borderColor = '' }, 2000)
    }
    setShowRunToast(false)
  }

  const inp: React.CSSProperties = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontFamily: 'var(--font-sans)', fontSize: 13, outline: 'none' }
  const lbl: React.CSSProperties = { fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, display: 'block' }

  const categories = activeResult ? ['all', ...Array.from(new Set(activeResult.suggestions.map(s => s.category)))] : []
  const filtered = activeResult?.suggestions.filter(s => activeCategory === 'all' || s.category === activeCategory) ?? []

  return (
    <div className="mobile-col" style={{ display: 'flex', gap: 24, alignItems: 'flex-start', position: 'relative' }}>

      {/* Running/Scanning overlays — dims whole panel while busy */}
      {(running || scanning) && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--glass)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, backdropFilter: 'blur(12px)', animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ width: 48, height: 48, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <style>{`
            @keyframes spin{to{transform:rotate(360deg)}}
            @keyframes fadeIn{from{opacity:0}to{opacity:1}}
          `}</style>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', fontWeight: 600, letterSpacing: 2 }}>{scanning ? 'SCANNING SITE' : 'RUNNING TEST'}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)', marginTop: 6, maxWidth: 300, lineHeight: 1.5 }}>
              {scanning ? 'Please wait — our AI is exploring your pages to suggest the best test scenarios...' : 'Please wait — browser is executing test steps live...'}
            </div>
          </div>
        </div>
      )}

      {/* ── Left panel ── */}
      <div className="mobile-w-full mobile-relative" style={{ width: '100%', maxWidth: 350, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 112, alignSelf: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(24px, 6vw, 28px)', fontWeight: 600,   lineHeight: 1.2 }}>Smart test<br /><em style={{ color: 'var(--accent)', fontFamily: 'var(--font-serif)', fontWeight: 500 }}>suggester</em></h1>
          <p style={{ color: 'var(--text2)', fontSize: 12, marginTop: 6 }}>Scans your site — tells you exactly what to test.</p>
        </div>

        {/* Site name */}
        <div>
          <label style={lbl}>Site name</label>
          <input style={inp} placeholder="e.g. Demo, My Shop..." value={siteName} onChange={e => setSiteName(e.target.value)} disabled={scanning} />
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Optional — helps identify saved scans</p>
        </div>

        <div>
          <label style={lbl}>Site URL</label>
          <input style={inp} placeholder="https://yoursite.com" value={url} onChange={e => setUrl(e.target.value)} disabled={scanning} />
        </div>

        {/* Auth */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }} onClick={() => setUseAuth(v => !v)}>
            <div style={{ width: 36, height: 20, borderRadius: 10, background: useAuth ? 'var(--accent)' : 'var(--surface2)', border: `2px solid ${useAuth ? 'var(--accent)' : 'var(--border2)'}`, position: 'relative', transition: 'all 0.2s', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 1, left: useAuth ? 16 : 1, width: 14, height: 14, borderRadius: '50%', background: useAuth ? '#0f0f0f' : 'var(--text3)', transition: 'left 0.2s' }} />
            </div>
            <span style={{ fontSize: 12 }}>Site requires Basic Auth</span>
          </div>
          {useAuth && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input style={inp} placeholder="Username" value={authUser} onChange={e => setAuthUser(e.target.value)} autoComplete="off" />
              <div style={{ position: 'relative' }}>
                <input 
                  style={{ ...inp, paddingRight: 38 }} 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Password" 
                  value={authPass} 
                  onChange={e => setAuthPass(e.target.value)} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: 4,
                    cursor: 'pointer',
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text3)'
                  }}
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>
          )}
        </div>

        <button onClick={handleScan} disabled={scanning || !url.trim() || running}
          style={{ padding: '11px 0', background: scanning ? 'var(--surface2)' : 'var(--accent)', border: 'none', borderRadius: 10, color: scanning ? 'var(--text3)' : '#0f0f0f', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, cursor: scanning ? 'not-allowed' : 'pointer', letterSpacing: 1 }}>
          {scanning ? '⟳ SCANNING...' : '⌕ SCAN & SUGGEST'}
        </button>

        {error && <div style={{ padding: '10px 12px', background: '#f8717111', border: '1px solid #f8717133', borderRadius: 8, color: 'var(--fail)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{error}</div>}

        {/* Saved scans */}
        {savedScans.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: 1, marginBottom: 8 }}>SAVED SCANS ({savedScans.length})</div>
            <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', maxHeight: '30vh', paddingRight: 4 }}>
              {savedScans.map(scan => (
                <div key={scan.url}>
                  {renamingUrl === scan.url ? (
                    <div style={{ padding: '8px', background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: 8, display: 'flex', gap: 6 }}>
                      <input
                        value={renameText} onChange={e => setRenameText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleRenameSave(); if (e.key === 'Escape') setRenamingUrl(null) }}
                        autoFocus
                        style={{ ...inp, padding: '4px 8px', fontSize: 12, flex: 1 }}
                        placeholder="Site name..."
                      />
                      <button onClick={handleRenameSave} style={{ padding: '4px 10px', background: 'var(--accent)', border: 'none', borderRadius: 6, color: '#0f0f0f', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}>SAVE</button>
                      <button onClick={() => setRenamingUrl(null)} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--border2)', borderRadius: 6, color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}>×</button>
                    </div>
                  ) : (
                    <div
                      style={{ padding: '10px 12px', background: 'var(--surface)', border: `1px solid ${activeResult?.url === scan.url ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', transition: 'border-color 0.15s' }}
                      onClick={() => { setActiveResult(scan); setActiveCategory('all') }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          {scan.siteName && <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, marginBottom: 2 }}>{scan.siteName}</div>}
                          <div style={{ fontSize: 11, color: scan.siteName ? 'var(--text3)' : 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {scan.url.replace(/^https?:\/\//, '')}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: 3, display: 'flex', gap: 8 }}>
                            <span>{scan.suggestions.length} tests</span>
                            <span>{new Date(scan.scannedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 6 }}>
                          <button onClick={e => { e.stopPropagation(); setRenamingUrl(scan.url); setRenameText(scan.siteName ?? '') }}
                            title="Rename" style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer', padding: '2px 4px' }}>✎</button>
                          <button onClick={e => { e.stopPropagation(); setConfirmDelete(scan.url) }}
                            style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 14, cursor: 'pointer', padding: '2px 4px' }}>×</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Right panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Global Toast Notification */}
        {showRunToast && (
          <div style={{ padding: '10px 14px', background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: 10, display: 'flex', gap: 12, alignItems: 'center', animation: 'fadeInDown 0.3s ease-out', position: 'relative' }}>
            <span style={{ fontSize: 14 }}>🚀</span>
            <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500, flex: 1 }}>
              Test run completed! You can view detailed results in the <span 
                onClick={() => {
                  if (runResult && switchTab && setHighlightId) {
                    setHighlightId(runResult.result.id || runResult.result.startedAt || null)
                    switchTab('history')
                  }
                }}
                style={{ fontFamily: 'var(--font-mono)', borderBottom: '1px solid var(--accent)', cursor: 'pointer', color: 'var(--accent)' }}
              >Result Panel</span> below.
            </div>
            <button 
              onClick={() => setShowRunToast(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14, padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Dismiss"
            >✕</button>
          </div>
        )}
        <style>{`
          @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>


        {!activeResult && !scanning && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280, opacity: 0.4 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontStyle: 'italic', color: 'var(--text3)' }}>ready to scan</div>
            <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 8 }}>Enter your URL and click Scan</p>
          </div>
        )}

        {activeResult && !scanning && (
          <>
            {/* Summary bar */}
            <div style={{ padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                {activeResult.siteName && <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 2 }}>{activeResult.siteName}</div>}
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 3 }}>{activeResult.url.replace(/^https?:\/\//, '')}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', display: 'flex', gap: 14 }}>
                  <span>{activeResult.suggestions.length} suggestions</span>
                  <span>{activeResult.pagesVisited} pages</span>
                  <span>{new Date(activeResult.scannedAt).toLocaleString()}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ padding: '3px 10px', background: 'var(--fail-glow)', color: 'var(--fail)', borderRadius: 20, fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                  {activeResult.suggestions.filter(s => s.priority === 'high').length} HIGH
                </span>
                <span style={{ padding: '3px 10px', background: 'var(--accent-glow)', color: 'var(--accent)', borderRadius: 20, fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                  {activeResult.suggestions.filter(s => s.priority === 'medium').length} MED
                </span>
              </div>
            </div>

            {/* Category filter */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  style={{ padding: '4px 12px', background: activeCategory === cat ? 'var(--accent)' : 'var(--surface)', border: `1px solid ${activeCategory === cat ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 20, color: activeCategory === cat ? '#0f0f0f' : 'var(--text2)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {cat === 'all' ? `All (${activeResult.suggestions.length})` : `${CATEGORY_LABELS[cat] ?? cat} (${activeResult.suggestions.filter(s => s.category === cat).length})`}
                </button>
              ))}
            </div>

            {/* Suggestion cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map(sug => {
                const isEditing = editingSugId === sug.id
                return (
                  <div key={sug.id} id={`sug-${sug.id}`} style={{ background: 'var(--surface)', border: `1px solid ${isEditing ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s', minWidth: 0 }}>
                    <div className="mobile-p-4" style={{ padding: '14px 16px', display: 'flex', gap: 12 }}>
                      <div style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{sug.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>{sug.title}</div>
                            <div style={{ fontSize: 12, color: 'var(--text2)' }}>{sug.description}</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
                            <span style={{ padding: '2px 8px', borderRadius: 10, background: PRIORITY_BG[sug.priority], color: PRIORITY_COLOR[sug.priority], fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                              {sug.priority.toUpperCase()}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{CATEGORY_LABELS[sug.category] ?? sug.category}</span>
                          </div>
                        </div>

                        {/* Auth warning */}
                      {sug.category === 'auth' && sug.title.toLowerCase().includes('valid') && (
                        <div style={{ marginTop: 8, padding: '8px 10px', background: '#c8f06911', border: '1px solid #c8f06933', borderRadius: 6, fontSize: 11, color: 'var(--accent)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                          <span style={{ flexShrink: 0 }}>⚠</span>
                          <span>Replace <strong>your@email.com</strong> and <strong>yourpassword</strong> with real credentials, and update the URL after login (e.g. <strong>dashboard</strong> → your actual redirect path). Use the ✎ Edit button below.</span>
                        </div>
                      )}

                      {/* Test description — editable */}
                         {/* Steps - Modern List */}
                        <div style={{ marginTop: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: 1 }}>TEST FLOW ({sug.steps?.length ?? 0} STEPS)</span>
                            {sug.confidence && (
                              <div style={{ display: 'flex', gap: 10 }}>
                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }} title="Detection Confidence">
                                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: sug.confidence.detection > 0.7 ? 'var(--pass)' : 'var(--fail)' }} />
                                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>{Math.round(sug.confidence.detection * 100)}% DET</span>
                                </div>
                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }} title="Selector Stability">
                                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: sug.confidence.selector > 0.7 ? 'var(--pass)' : 'var(--fail)' }} />
                                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>{Math.round(sug.confidence.selector * 100)}% SEL</span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {isEditing ? (
                              <div style={{ padding: '4px' }}>
                                <StepEditor steps={editedSteps} onChange={setEditedSteps} />
                                <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                  <button onClick={() => handleSaveSteps(sug.id, editedSteps)} style={{ padding: '7px 16px', background: 'var(--accent)', border: 'none', borderRadius: 6, color: '#0f0f0f', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>SAVE & CLOSE</button>
                                  <button onClick={() => setEditingSugId(null)} style={{ padding: '7px 12px', background: 'transparent', border: '1px solid var(--border2)', borderRadius: 6, color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}>CANCEL</button>
                                </div>
                              </div>
                            ) : (
                              sug.steps ? (
                                sug.steps.map((st, idx) => (
                                  <div key={idx} style={{ display: 'flex', gap: 10, fontSize: 11, padding: '6px 8px', borderRadius: 6, background: st.action.startsWith('assert') ? 'var(--accent-glow)' : 'transparent', border: st.action.startsWith('assert') ? '1px dashed var(--accent)' : 'none' }}>
                                    <span style={{ color: 'var(--text3)', width: 14 }}>{idx + 1}.</span>
                                    <span style={{ fontWeight: 600, color: st.action.startsWith('assert') ? 'var(--accent)' : 'var(--text)', width: 75 }}>{st.action.toUpperCase()}</span>
                                    <span style={{ flex: 1, color: 'var(--text2)' }}>{st.description}</span>
                                    {st.intent && <span style={{ color: 'var(--text3)', fontSize: 9, fontFamily: 'var(--font-mono)' }}>[{st.intent}]</span>}
                                  </div>
                                ))
                              ) : (
                                <div style={{ padding: '8px', fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>
                                  {sug.testDescription || 'No steps available for this legacy suggestion.'}
                                </div>
                              )
                            )}
                          </div>
                        </div>

                        {/* Metadata Tags */}
                        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {sug.isExecutable && (
                            <span style={{ fontSize: 9, background: 'var(--pass-glow)', color: 'var(--pass)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--pass-border)', textTransform: 'uppercase', letterSpacing: 0.5 }}>✓ Execution Ready</span>
                          )}
                          {sug.isNegative && (
                            <span style={{ fontSize: 9, background: 'var(--fail-glow)', color: 'var(--fail)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--fail-border)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Negative Test</span>
                          )}
                          {sug.intent && (
                            <span style={{ fontSize: 9, background: 'var(--surface2)', color: 'var(--text3)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>Intent: {sug.intent}</span>
                          )}
                        </div>

                        {/* Why */}
                        <div style={{ marginTop: 12 }}>
                          <button onClick={() => setExpandedWhy(expandedWhy === sug.id ? null : sug.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 8 }}>{expandedWhy === sug.id ? '▼' : '▶'}</span> WHY TEST THIS?
                          </button>
                          {expandedWhy === sug.id && (
                            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text3)', padding: '12px', background: 'var(--surface2)', borderRadius: 8, borderLeft: '3px solid var(--accent)', lineHeight: 1.6 }}>
                              {sug.why}
                              {sug.expectedState && (
                                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', fontSize: 11 }}>
                                  <strong style={{ color: 'var(--text2)', display: 'block', marginBottom: 2 }}>Expected Final State:</strong>
                                  {sug.expectedState}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action bar */}
                    <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end', background: 'var(--surface2)', flexWrap: 'wrap' }}>
                      <button onClick={() => { setEditingSugId(sug.id); setEditedSteps([...(sug.steps || [])]) }} disabled={isEditing}
                        style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text2)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}>
                        {isEditing ? 'EDITING...' : '✎ EDIT'}
                      </button>
                      <button onClick={() => handleCopy(sug)}
                        style={{ padding: '6px 14px', background: copiedId === sug.id ? 'var(--pass-glow)' : 'transparent', border: `1px solid ${copiedId === sug.id ? 'var(--pass-border)' : 'var(--border)'}`, borderRadius: 6, color: copiedId === sug.id ? 'var(--pass)' : 'var(--text2)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer', transition: 'all 0.2s' }}>
                        {copiedId === sug.id ? '✓ COPIED' : 'COPY'}
                      </button>
                      <button onClick={() => handleRun(sug)} disabled={runningId === sug.id || (!sug.isExecutable && !sug.testDescription)}
                        style={{ padding: '6px 14px', background: (sug.isExecutable || sug.testDescription) ? 'var(--accent)' : 'var(--surface2)', border: 'none', borderRadius: 6, color: (sug.isExecutable || sug.testDescription) ? '#0f0f0f' : 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, cursor: (sug.isExecutable || sug.testDescription) ? 'pointer' : 'not-allowed' }}>
                        {runningId === sug.id ? '▶ STARTING...' : '▶ RUN TEST'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Confirm delete popup */}
      {confirmDelete && (
        <div onClick={() => setConfirmDelete(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: '28px 32px', width: 360, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>Delete saved scan?</div>
            <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6 }}>All suggestions for this site will be removed. You can always re-scan to get them back.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: '10px 0', background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text2)', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer' }}>CANCEL</button>
              <button onClick={() => handleDeleteScan(confirmDelete)} style={{ flex: 1, padding: '10px 0', background: '#f8717122', border: '1px solid #f8717144', borderRadius: 8, color: 'var(--fail)', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>DELETE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
