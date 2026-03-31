import React, { useState, useEffect, useRef } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import SmartSuggester from './components/SmartSuggester'
import RecordReplay from './components/RecordReplay'
import HistoryPanel from './components/HistoryPanel'
import AuditPanel from './components/AuditPanel'
import LandingPage from './components/LandingPage'
import Navbar from './components/Navbar'
import AuthPage from './components/AuthPage'
import SettingsPage from './components/SettingsPage'
import DocsPage from './components/DocsPage'
import PricingPage from './components/PricingPage'
import ResetPassword from './components/ResetPassword'
import { supabase } from '../../lib/supabase'
import { AuthGuard } from './components/AuthGuard'
import { useAuth } from './contexts/AuthContext'

export type Platform = 'web' | 'mobile' | 'desktop'

export interface StepResult {
  step: { 
    action: string; 
    target?: string | { primary: string; fallback: string[] }; 
    value?: string; 
    description: string; 
    intent?: string;
    optional?: boolean;
    frame?: string;
    assertType?: 'visible' | 'text' | 'url';
  }
  status: 'passed' | 'failed' | 'skipped' | 'blocked'
  durationMs: number
  error?: string
  message?: string
  screenshotPath?: string
  networkErrors?: Array<{ url: string; status: number; statusText: string }>
  selectionTrace?: string
}

export interface TestResult {
  id?: string;
  plan: { 
    title: string; 
    platform: string; 
    naturalLanguageInput: string; 
    steps: { 
      action: string; 
      target?: string | { primary: string; fallback: string[] }; 
      value?: string; 
      description: string; 
      intent?: string;
      optional?: boolean;
      frame?: string;
      assertType?: 'visible' | 'text' | 'url';
    }[];
    version?: number;
  }
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

type TabId = 'home' | 'history' | 'record' | 'suggest' | 'audit' | 'settings' | 'docs' | 'pricing'

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const activeTab = location.pathname === '/' ? 'home' : (location.pathname.split('/')[1] || 'home')
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('app-theme') as 'dark' | 'light') ?? 'dark'
  )
  const [isThemeChanging, setIsThemeChanging] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [globalBusy, setGlobalBusy] = useState(false)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'update_password'>('login')
  const { session, isLoading: isSessionLoading } = useAuth()
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(null)

  const switchTab = (tab: string) => {
    if (globalBusy) return
    navigate(tab === 'home' ? '/' : `/${tab}`)
  }

  const toggleTheme = (newTheme: 'dark' | 'light') => {
    if (newTheme === theme) return;
    setIsThemeChanging(true);
    setTimeout(() => {
      setTheme(newTheme);
      localStorage.setItem('app-theme', newTheme);
      setIsThemeChanging(false);
    }, 1000);
  }

  const openAuth = (mode: 'login' | 'signup' = 'login') => {
    setAuthMode(mode)
    setIsAuthOpen(true)
  }

  const handleAuthSuccess = () => {
    setIsAuthOpen(false)
    if (activeTab === 'home') {
      switchTab('audit') // Go to app after login if we're on landing page
    }
  }

  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/history')
      setHistory(await res.json())
    } catch {}
  }

  useEffect(() => { fetchHistory() }, [])
  useEffect(() => { if (activeTab === 'history') fetchHistory() }, [activeTab])
  useEffect(() => {
    const handleWindowScroll = () => {
      setShowScrollTop(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleWindowScroll);
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, []);

  useEffect(() => {
    // Reset scroll position and show-scroll state when tab changes
    window.scrollTo(0, 0);
    setShowScrollTop(false);
  }, [location.pathname]);

  useEffect(() => {
    // Handle specific auth routing side-effects (e.g. social login hash or password recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (currentSession && event === 'SIGNED_IN') {
        const isSocialRedirect = window.location.hash.includes('access_token') || 
                               window.location.search.includes('code=');
        if (isSocialRedirect) {
          handleAuthSuccess();
        }
      }
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

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

  const LoadingOverlay = () => (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'fadeIn 0.4s ease-out'
    }}>
      <div style={{
        width: 60,
        height: 60,
        border: '4px solid rgba(200, 240, 105, 0.1)',
        borderTop: '4px solid var(--accent)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: 20
      }} />
      <div style={{
        color: '#fff',
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: 2,
        animation: 'pulse 1.5s infinite'
      }}>
        {theme === 'dark' ? 'SWITCHING TO LIGHT' : 'SWITCHING TO DARK'}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  )

  return (
    <Routes>
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="*" element={
        <div 
          data-theme={activeTab === 'home' ? 'dark' : theme} 
          style={{ 
            display: 'flex', 
            minHeight: '100vh', 
            flexDirection: 'column',
            background: 'var(--bg)',
            color: 'var(--text)',
            transition: 'background 0.3s, color 0.3s'
          }}>
          {isThemeChanging && <LoadingOverlay />}
          <Navbar 
            activeTab={activeTab} 
            switchTab={switchTab} 
            globalBusy={globalBusy} 
            onOpenAuth={openAuth} 
          />

          {isAuthOpen && (
            <AuthPage 
              initialMode={authMode} 
              onClose={() => setIsAuthOpen(false)} 
              onLogin={handleAuthSuccess} 
            />
          )}

          {/* Body */}
          <div style={{ flex: 1, display: 'flex', gap: 0, position: 'relative' }}>
            <Routes>
              <Route path="/" element={
                <div style={{ flex: 1 }}>
                  <LandingPage 
                    onGetStarted={() => openAuth('signup')} 
                    onGoToApp={() => switchTab('audit')} 
                  />
                </div>
              } />
              
              <Route path="/record" element={
                <AuthGuard onUnauthorized={() => { switchTab('home'); openAuth('login'); }}>
                  <div style={{ flex: 1, padding: '40px 0' }} className="mobile-py-4">
                    <div style={{ maxWidth: 1300, margin: '0 auto', padding: '0 40px' }} className="mobile-px-4">
                      <RecordReplay onBusyChange={setGlobalBusy} switchTab={switchTab} setHighlightId={setHighlightId} />
                    </div>
                  </div>
                </AuthGuard>
              } />

              <Route path="/suggest" element={
                <AuthGuard onUnauthorized={() => { switchTab('home'); openAuth('login'); }}>
                  <div style={{ flex: 1, padding: '40px 0' }} className="mobile-py-4">
                    <div style={{ maxWidth: 1300, margin: '0 auto', padding: '0 40px' }} className="mobile-px-4">
                      <SmartSuggester onBusyChange={setGlobalBusy} switchTab={switchTab} setHighlightId={setHighlightId} />
                    </div>
                  </div>
                </AuthGuard>
              } />

              <Route path="/audit" element={
                <AuthGuard onUnauthorized={() => { switchTab('home'); openAuth('login'); }}>
                  <div style={{ flex: 1, padding: '40px 0' }} className="mobile-py-4">
                    <div style={{ maxWidth: 1300, margin: '0 auto', padding: '0 40px' }} className="mobile-px-4">
                      <AuditPanel onBusyChange={setGlobalBusy} theme={theme} />
                    </div>
                  </div>
                </AuthGuard>
              } />

              <Route path="/history" element={
                <AuthGuard onUnauthorized={() => { switchTab('home'); openAuth('login'); }}>
                  <div style={{ flex: 1, padding: '40px 0' }} className="mobile-py-4">
                    <div style={{ maxWidth: 1300, margin: '0 auto', padding: '0 40px' }} className="mobile-px-4">
                      <HistoryPanel 
                        history={history} 
                        onClear={handleClearHistory} 
                        onDeleteItem={handleDeleteHistoryItem} 
                        onDeleteItems={handleDeleteMultipleHistoryItems} 
                        highlightId={highlightId}
                        setHighlightId={setHighlightId}
                      />
                    </div>
                  </div>
                </AuthGuard>
              } />

              <Route path="/docs/*" element={
                <div style={{ flex: 1, padding: '40px 0', background: '#0B0F0C' }} className="mobile-py-4">
                  <div style={{ maxWidth: 1300, margin: '0 auto', padding: '0 40px' }} className="mobile-px-4">
                    <DocsPage theme={theme} />
                  </div>
                </div>
              } />

              <Route path="/pricing" element={
                <div style={{ flex: 1 }}>
                  <PricingPage
                    onGetStarted={() => openAuth('signup')}
                    onUpgradePro={() => openAuth('signup')}
                  />
                </div>
              } />

              <Route path="/settings" element={
                <AuthGuard onUnauthorized={() => { switchTab('home'); openAuth('login'); }}>
                  <div style={{ flex: 1 }}>
                    <SettingsPage 
                      theme={theme}
                      onToggleTheme={toggleTheme}
                    />
                  </div>
                </AuthGuard>
              } />
            </Routes>

            {/* Scroll-to-top button - Premium Design (Product Pages only) */}
            {activeTab !== 'home' && showScrollTop && (
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="scroll-top-btn mobile-scroll-top"
                style={{
                  position: 'fixed',
                  bottom: 90,
                  right: 90,
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  background: 'var(--glass)',
                  backdropFilter: 'blur(15px)',
                  border: '1px solid var(--border)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 500,
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                }}
                title="Scroll to top"
              >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'translateY(-1px)' }}>
                    <path d="m18 15-6-6-6 6"/>
                  </svg>
                </div>
              </button>
            )}
          </div>
        </div>
      } />
    </Routes>
  )
}
