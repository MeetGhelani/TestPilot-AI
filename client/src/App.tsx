import { useState, useEffect } from 'react'
import SmartSuggester from './components/SmartSuggester'
import RecordReplay from './components/RecordReplay'
import HistoryPanel from './components/HistoryPanel'
import AuditPanel from './components/AuditPanel'
import LandingPage from './components/LandingPage'

export type Platform = 'web' | 'mobile' | 'desktop'

export interface StepResult {
  step: { action: string; target?: string; value?: string; description: string; optional?: boolean }
  status: 'passed' | 'failed' | 'skipped'
  durationMs: number
  error?: string
  screenshotPath?: string
}

export interface TestResult {
  id?: string;
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
  issues: { type: string, message: string, impact?: string, recommendation?: string, selector?: string }[]
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

type TabId = 'home' | 'history' | 'record' | 'suggest' | 'audit'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>(
    () => (localStorage.getItem('activeTab') as TabId) ?? 'home'
  )
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [globalBusy, setGlobalBusy] = useState(false)

  const switchTab = (tab: TabId) => {
    if (globalBusy) return
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

  const handleClearHistory = async () => {
    await fetch('http://localhost:3001/api/history', { method: 'DELETE' })
    setHistory([])
  }

  const handleDeleteHistoryItem = async (id: string) => {
    await fetch(`http://localhost:3001/api/history/${id}`, { method: 'DELETE' })
    fetchHistory()
  }

  const handleDeleteMultipleHistoryItems = async (ids: string[]) => {
    await fetch(`http://localhost:3001/api/history/delete-bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    })
    fetchHistory()
  }

  const TAB_LABELS: Record<TabId, string> = {
    home: 'Home',
    record: 'Record & replay',
    suggest: 'Suggest tests',
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

          {(['home', 'record', 'suggest', 'audit', 'history'] as TabId[]).map(tab => (
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
        {activeTab === 'home' ? (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <LandingPage onGetStarted={() => switchTab('audit')} />
          </div>
        ) : activeTab === 'record' ? (
          <div style={{ flex: 1, padding: 28, overflowY: 'auto' }}>
            <RecordReplay onBusyChange={setGlobalBusy} />
          </div>
        ) : activeTab === 'suggest' ? (
          <div style={{ flex: 1, padding: 28, overflowY: 'auto' }}>
            <SmartSuggester onBusyChange={setGlobalBusy} />
          </div>
        ) : activeTab === 'audit' ? (
          <div style={{ flex: 1, padding: 28, overflowY: 'auto' }}>
            <AuditPanel onBusyChange={setGlobalBusy} />
          </div>
        ) : (
          <div style={{ flex: 1, padding: 28, overflowY: 'auto' }}>
            <HistoryPanel history={history} onClear={handleClearHistory} onDeleteItem={handleDeleteHistoryItem} onDeleteItems={handleDeleteMultipleHistoryItems} />
          </div>
        )}
      </div>
    </div>
  )
}
