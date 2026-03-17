import { useState, useEffect } from 'react'
import TestForm from './components/TestForm'
import SmartSuggester from './components/SmartSuggester'
import RecordReplay from './components/RecordReplay'
import ResultPanel from './components/ResultPanel'
import HistoryPanel from './components/HistoryPanel'
import AuditPanel from './components/AuditPanel'

export type Platform = 'web' | 'mobile' | 'desktop'

export interface StepResult {
  step: { action: string; target?: string; value?: string; description: string; optional?: boolean }
  status: 'passed' | 'failed' | 'skipped'
  durationMs: number
  error?: string
  screenshotPath?: string
}

export interface TestResult {
  plan: { title: string; platform: string; naturalLanguageInput: string; steps: { action: string; target?: string; value?: string; description: string; optional?: boolean }[] }
  status: 'passed' | 'failed' | 'error'
  stepResults: StepResult[]
  totalDurationMs: number
  startedAt: string
  reportPath?: string
  error?: string
}

export interface AuditCategory {
  score: number
  status: string
  issues: { type: string, message: string, impact?: string, recommendation?: string }[]
  metrics?: Record<string, string | number>
}

export interface AuditResult {
  id?: string;
  url: string;
  timestamp: string;
  categories: {
    functional: AuditCategory
    ui: AuditCategory
    links: AuditCategory
    console: AuditCategory
    performance: AuditCategory
    accessibility: AuditCategory
    seo: AuditCategory
    [key: string]: AuditCategory
  }
  totalScore: number
  status: 'passed' | 'failed'
  title: string
}

export type HistoryItem = TestResult | AuditResult

type TabId = 'run' | 'history' | 'scan' | 'record' | 'suggest' | 'audit'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>(
    () => (localStorage.getItem('activeTab') as TabId) ?? 'run'
  )
  const [result, setResult] = useState<TestResult | null>(null)
  const [running, setRunning] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  // Global busy flag — lifted from child sections
  const [globalBusy, setGlobalBusy] = useState(false)

  const switchTab = (tab: TabId) => {
    if (globalBusy) return  // block tab switch while anything is running
    setActiveTab(tab)
    localStorage.setItem('activeTab', tab)
  }

  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/history')
      setHistory(await res.json())
    } catch {}
  }

  useEffect(() => { fetchHistory() }, [])
  useEffect(() => { if (activeTab === 'history') fetchHistory() }, [activeTab])

  // Sync run-test busy state with globalBusy
  useEffect(() => { setGlobalBusy(running) }, [running])

  const handleRun = async (platform: Platform, url: string, test: string, headless: boolean, authUser?: string, authPass?: string) => {
    setRunning(true)
    setResult(null)
    try {
      const res = await fetch('http://localhost:3001/api/run-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, url, test, headless, authUser, authPass }),
      })
      const data: TestResult = await res.json()
      setResult(data)
      fetchHistory()
    } catch (err) {
      setResult({ plan: { title: 'Error', platform, naturalLanguageInput: test, steps: [] }, status: 'error', stepResults: [], totalDurationMs: 0, startedAt: new Date().toISOString(), error: String(err) })
    } finally {
      setRunning(false)
    }
  }

  const handleClearHistory = async () => {
    await fetch('http://localhost:3001/api/history', { method: 'DELETE' })
    setHistory([])
  }

  const TAB_LABELS: Record<TabId, string> = {
    run: 'Run test',
    record: 'Record & replay',
    suggest: 'Suggest tests',
    scan: 'Scan site',
    audit: 'Site Audit',
    history: `History${history.length > 0 ? ` (${history.length})` : ''}`,
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--border)', padding: '0 32px', display: 'flex', alignItems: 'center', gap: 32, height: 64, flexShrink: 0, position: 'sticky', top: 0, zIndex: 100, background: 'var(--bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/logo.png" alt="TestPilot AI" style={{ height: 44, objectFit: 'contain' }} />
        </div>

        <nav style={{ display: 'flex', gap: 4, marginLeft: 'auto', alignItems: 'center' }}>
          {/* Busy indicator */}
          {globalBusy && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: '#c8f06911', border: '1px solid #c8f06933', borderRadius: 6, marginRight: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'navpulse 1s ease-in-out infinite' }} />
              <style>{`@keyframes navpulse{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)', letterSpacing: 1 }}>RUNNING</span>
            </div>
          )}

          {(['run', 'record', 'suggest', 'audit', 'history'] as TabId[]).map(tab => (
            <button
              key={tab}
              onClick={() => switchTab(tab)}
              disabled={globalBusy && tab !== activeTab}
              title={globalBusy && tab !== activeTab ? 'Wait for current action to finish' : ''}
              style={{
                background: activeTab === tab ? 'var(--surface2)' : 'transparent',
                border: activeTab === tab ? '1px solid var(--border2)' : '1px solid transparent',
                borderRadius: 6,
                padding: '4px 14px',
                color: globalBusy && tab !== activeTab ? 'var(--text3)' : activeTab === tab ? '#c8f069' : 'var(--text2)',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                cursor: globalBusy && tab !== activeTab ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                opacity: globalBusy && tab !== activeTab ? 0.4 : 1,
              }}>
              {TAB_LABELS[tab]}
            </button>
          ))}
        </nav>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', gap: 0 }}>
        {activeTab === 'record' ? (
          <div style={{ flex: 1, padding: 28, overflowY: 'auto' }}>
            <RecordReplay onBusyChange={setGlobalBusy} />
          </div>
        ) : activeTab === 'suggest' ? (
          <div style={{ flex: 1, padding: 28, overflowY: 'auto' }}>
            <SmartSuggester onBusyChange={setGlobalBusy} />
          </div>
        ) : activeTab === 'run' ? (
          <>
            <div style={{ width: 400, borderRight: '1px solid var(--border)', padding: 28, flexShrink: 0 }}>
              <TestForm onRun={handleRun} running={running} />
            </div>
            <div style={{ flex: 1, padding: 28, overflowY: 'auto' }}>
              <ResultPanel result={result} running={running} />
            </div>
          </>
        ) : activeTab === 'audit' ? (
          <div style={{ flex: 1, padding: 28, overflowY: 'auto' }}>
            <AuditPanel onBusyChange={setGlobalBusy} />
          </div>
        ) : (
          <div style={{ flex: 1, padding: 28, overflowY: 'auto' }}>
            <HistoryPanel history={history} onClear={handleClearHistory} />
          </div>
        )}
      </div>
    </div>
  )
}
