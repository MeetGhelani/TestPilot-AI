import { useState, useEffect } from 'react'
import SmartSuggester from './components/SmartSuggester'
import RecordReplay from './components/RecordReplay'
import HistoryPanel from './components/HistoryPanel'
import AuditPanel from './components/AuditPanel'
import LandingPage from './components/LandingPage'
import Navbar from './components/Navbar'

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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      <Navbar activeTab={activeTab} switchTab={switchTab} globalBusy={globalBusy} />

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', gap: 0 }}>
        {activeTab === 'home' ? (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <LandingPage onGetStarted={() => switchTab('audit')} />
          </div>
        ) : activeTab === 'record' ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '40px 0' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px' }}>
              <RecordReplay onBusyChange={setGlobalBusy} />
            </div>
          </div>
        ) : activeTab === 'suggest' ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '40px 0' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px' }}>
              <SmartSuggester onBusyChange={setGlobalBusy} />
            </div>
          </div>
        ) : activeTab === 'audit' ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '40px 0' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px' }}>
              <AuditPanel onBusyChange={setGlobalBusy} />
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: '40px 0' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px' }}>
              <HistoryPanel history={history} onClear={handleClearHistory} onDeleteItem={handleDeleteHistoryItem} onDeleteItems={handleDeleteMultipleHistoryItems} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
