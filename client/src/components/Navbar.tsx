import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface NavbarProps {
  activeTab: string;
  switchTab: (tab: any) => void;
  globalBusy: boolean;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
  isAuthenticated: boolean;
  user: any;
  isSessionLoading: boolean;
}

export default function Navbar({ activeTab, switchTab, globalBusy, onOpenAuth, isAuthenticated, user, isSessionLoading }: NavbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const isMarketing = activeTab === 'home' || activeTab === 'docs' || !isAuthenticated;

  // Handle click outside to close profile dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isProfileOpen && !(e.target as HTMLElement).closest('.profile-container')) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    switchTab('home');
    setIsProfileOpen(false);
    setShowLogoutConfirm(false);
  };

  const theme = {
    bg: 'var(--bg)',
    surface: 'var(--surface)',
    border: 'var(--border)',
    accent: 'var(--accent)',
    text: 'var(--text)',
    textMuted: 'var(--text3)',
    glass: 'var(--glass)',
  };

  const productLinks = [
    {
      id: 'record',
      name: 'Recorder',
      desc: 'No-code session recording',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
        </svg>
      )
    },
    {
      id: 'suggest',
      name: 'AI Tests',
      desc: 'Autonomous test generation',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        </svg>
      )
    },
    {
      id: 'audit',
      name: 'Audit',
      desc: 'Performance & SEO scans',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
      )
    },
    {
      id: 'history',
      name: 'Results',
      desc: 'Execution history & logs',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" />
        </svg>
      )
    },
    {
      id: 'docs',
      name: 'Docs',
      desc: 'Learning & API reference',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      )
    },
  ];

  return (
    <>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        width: '100%',
        background: theme.glass,
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${theme.border}`,
        height: 72,
        display: 'flex',
        alignItems: 'center',
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* LOGO */}
          <div
            onClick={() => switchTab('home')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <img src="/logo.png" alt="TestPilot AI" style={{ height: 40, width: 'auto' }} />
          </div>

          {/* NAVIGATION - DESKTOP */}
          <nav style={{ display: 'none', alignItems: 'center', gap: 60 }} className="desktop-nav">
            {isMarketing ? (
              <>
                {['Home', 'Pricing', 'Docs'].map(item => (
                  <a
                    key={item}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (item === 'Home') switchTab('home');
                      if (item === 'Pricing') switchTab('pricing');
                      if (item === 'Docs') switchTab('docs');
                    }}
                    className={`nav-link ${(item.toLowerCase() === activeTab) ? 'active' : ''}`}
                    style={{ fontSize: 14, fontWeight: 500, textDecoration: 'none' }}
                  >
                    {item}
                  </a>
                ))}

                {/* PRODUCT DROPDOWN */}
                <div
                  onMouseEnter={() => setIsDropdownOpen(true)}
                  onMouseLeave={() => setIsDropdownOpen(false)}
                  style={{ position: 'relative', padding: '10px 0' }}
                >
                  <div className={`nav-link ${isDropdownOpen ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                    Product <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: isDropdownOpen ? 'rotate(180deg)' : 'none' }}><path d="m6 9 6 6 6-6" /></svg>
                  </div>

                  {isDropdownOpen && (
                    <div style={{
                      position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                      width: 380, padding: 16, background: theme.surface, border: `1px solid ${theme.border}`,
                      borderRadius: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.4)', animation: 'slideIn 0.2s ease-out'
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                        {productLinks.filter(link => link.id !== 'docs').map(link => (
                          <div
                            key={link.id}
                            onClick={() => {
                              if (!isAuthenticated) {
                                onOpenAuth('login');
                              } else {
                                switchTab(link.id);
                                setIsDropdownOpen(false);
                              }
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 16, padding: 12, borderRadius: 12,
                              cursor: 'pointer'
                            }}
                            className="nav-dropdown-item"
                          >
                            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(200,240,105,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.accent }}>
                              {link.icon}
                            </div>
                            <div>
                              <div className="item-title" style={{ fontSize: 14, fontWeight: 600, transition: 'color 0.2s', color: 'var(--text2)' }}>{link.name}</div>
                              <div className="item-desc" style={{ fontSize: 12, transition: 'color 0.2s', color: 'var(--text3)' }}>{link.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Home button */}
                <button
                  onClick={() => switchTab('home')}
                  disabled={globalBusy}
                  title="Back to Home"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
                    background: 'transparent', border: `1px solid ${theme.border}`,
                    cursor: 'pointer', transition: 'all 0.2s',
                    color: theme.textMuted, fontSize: 13, fontWeight: 600,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = theme.text; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.background = 'transparent'; }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                  Home
                </button>

                {/* Divider */}
                <div style={{ width: 1, height: 24, background: theme.border }} />

                {/* Product tabs */}
                <div style={{ display: 'flex', gap: 20, background: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: 10, border: `1px solid ${theme.border}` }}>
                  {productLinks.map(link => (
                    <button
                      key={link.id}
                      onClick={() => switchTab(link.id)}
                      disabled={globalBusy && activeTab !== link.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8,
                        background: activeTab === link.id ? 'rgba(200,240,105,0.1)' : 'transparent',
                        border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                        color: activeTab === link.id ? theme.accent : theme.textMuted,
                        fontSize: 13, fontWeight: 600,
                      }}
                      onMouseEnter={e => { if (activeTab !== link.id) e.currentTarget.style.color = theme.text; }}
                      onMouseLeave={e => { if (activeTab !== link.id) e.currentTarget.style.color = theme.textMuted; }}
                    >
                      {link.icon}
                      {link.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </nav>

          {/* RIGHT SIDE ACTIONS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {isSessionLoading ? (
              <div style={{ width: 80, height: 36, borderRadius: 100, background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }} />
            ) : isMarketing && !isAuthenticated ? (
              <div className="desktop-only" style={{ alignItems: 'center', gap: 12 }}>
                <button
                  className="login-btn-ghost"
                  onClick={() => onOpenAuth('login')}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#ffffff25'; e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.border = `1px solid ${theme.accent}`; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.border = `1px solid var(--text)`; }}
                >
                  Login
                </button>
                <button
                  onClick={() => onOpenAuth('signup')}
                  style={{
                    background: theme.accent, color: '#000', border: 'none', padding: '10px 24px', borderRadius: 100,
                    fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: '0 0 20px rgba(200,240,105,0.2)'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(200,240,105,0.4)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(200,240,105,0.2)'; }}
                >
                  Start Testing &rarr;
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} className="profile-container">
                {isAuthenticated ? (
                  <>
                    {globalBusy && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'rgba(200,240,105,0.05)', border: `1px solid rgba(200,240,105,0.2)`, borderRadius: 100 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: theme.accent, animation: 'pulse 1s infinite' }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: theme.accent, letterSpacing: 1 }}>RUNNING</span>
                      </div>
                    )}

                    {isMarketing && (
                      <button
                        onClick={() => switchTab('record')}
                        style={{
                          background: 'var(--surface2)', color: theme.accent, border: `1px solid ${theme.accent}40`, padding: '8px 20px', borderRadius: 100,
                          fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,240,105,0.1)';  }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface2)';}}
                      >
                        Dashboard
                      </button>
                    )}

                    {/* Icon + Dropdown — own position:relative scope so dropdown anchors to icon */}
                    <div style={{ position: 'relative' }}>
                      <div
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        style={{
                          width: 36, height: 36, borderRadius: '50%', background: isProfileOpen ? theme.accent : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${isProfileOpen ? theme.accent : theme.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                          transition: 'all 0.2s',
                          color: isProfileOpen ? '#000' : theme.textMuted
                        }}
                        onMouseEnter={e => { if (!isProfileOpen) { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = theme.accent; e.currentTarget.style.borderColor = theme.accent } }}
                        onMouseLeave={e => { if (!isProfileOpen) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.borderColor = theme.border; } }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      </div>

                      {/* Profile Dropdown — anchored to icon */}
                      {isProfileOpen && (
                        <div style={{
                          position: 'absolute', top: 'calc(100% + 12px)', right: 0, width: 260,
                          background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 16,
                          boxShadow: '0 20px 40px rgba(0,0,0,0.5)', animation: 'slideInSimple 0.15s ease-out',
                          zIndex: 1001, padding: '8px'
                        }}>
                          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border}`, marginBottom: 4 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, marginBottom: 2 }}>{user?.user_metadata?.full_name || 'User'}</div>
                            <div style={{ fontSize: 11, color: theme.textMuted, wordBreak: 'break-all' }}>{user?.email}</div>
                          </div>

                          <button
                            onClick={() => { switchTab('settings'); setIsProfileOpen(false); }}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                              borderRadius: 10, border: 'none', background: 'transparent', color: theme.text,
                              fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                              transition: 'background 0.2s'
                            }}
                            className="dropdown-item-hover"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                            Settings
                          </button>

                          <button
                            onClick={() => { setShowLogoutConfirm(true); setIsProfileOpen(false); }}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                              borderRadius: 10, border: 'none', background: 'transparent', color: '#ff5f56',
                              fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                              transition: 'background 0.2s', marginTop: 4
                            }}
                            className="dropdown-item-hover"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
                            Logout
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            )}





            {/* MOBILE TOGGLE */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="mobile-toggle"
              style={{
                display: 'flex', background: 'transparent', border: 'none', color: theme.text, cursor: 'pointer', padding: 8
              }}
            >
              {isMobileMenuOpen ? null : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
              )}
            </button>
          </div>
        </div>

      </header>

      {/* MOBILE DRAWER (Right Side) */}
      {isMobileMenuOpen && (
          <>
            <div 
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 1999, background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)', animation: 'fadeIn 0.3s ease-out'
              }}
            />
            <div style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, width: '85%', maxWidth: 340,
              background: theme.surface, borderLeft: `1px solid ${theme.border}`, padding: '24px 20px', 
              display: 'flex', flexDirection: 'column', gap: 24, zIndex: 2000, overflowY: 'auto',
              animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '-20px 0 60px rgba(0,0,0,0.7)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: theme.text }}>Menu</div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', color: theme.textMuted, cursor: 'pointer', padding: 8 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>

              {isMarketing ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {['Home', 'Pricing', 'Docs'].map(item => (
                      <a key={item} href="#"
                        onClick={e => { e.preventDefault(); if (item === 'Home') switchTab('home'); if (item === 'Pricing') switchTab('pricing'); if (item === 'Docs') switchTab('docs'); setIsMobileMenuOpen(false); }}
                        style={{ color: theme.text, fontSize: 18, fontWeight: 600, textDecoration: 'none', padding: '8px 0' }}>{item}</a>
                    ))}
                  </div>
                  <div style={{ height: 1, background: theme.border }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: theme.textMuted, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>Solutions</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {productLinks.map(link => (
                        <div key={link.id} onClick={() => { switchTab(link.id); setIsMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 12, color: theme.text, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(200,240,105,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.accent }}>
                            {link.icon}
                          </div>
                          {link.name}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {!isAuthenticated && (
                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 24 }}>
                      <button onClick={() => { onOpenAuth('login'); setIsMobileMenuOpen(false); }} className="login-btn-ghost" style={{ width: '100%', padding: '12px' }}>Login</button>
                      <button onClick={() => { onOpenAuth('signup'); setIsMobileMenuOpen(false); }} style={{ width: '100%', padding: '12px', background: theme.accent, color: '#000', border: 'none', borderRadius: 100, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>Get Started</button>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button
                    onClick={() => { switchTab('home'); setIsMobileMenuOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '14px', borderRadius: 12,
                      background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}`,
                      color: theme.textMuted, fontSize: 16, fontWeight: 600, textAlign: 'left', cursor: 'pointer'
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                    Home
                  </button>
                  <div style={{ height: 1, background: theme.border, margin: '8px 0' }} />
                  {productLinks.map(link => (
                    <button
                      key={link.id}
                      onClick={() => {
                        if (!isAuthenticated) { onOpenAuth('login'); setIsMobileMenuOpen(false); } 
                        else { switchTab(link.id); setIsMobileMenuOpen(false); }
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '14px', borderRadius: 12,
                        background: activeTab === link.id ? 'rgba(200,240,105,0.1)' : 'transparent',
                        border: 'none', color: activeTab === link.id ? theme.accent : theme.text,
                        fontSize: 16, fontWeight: 600, textAlign: 'left', cursor: 'pointer'
                      }}
                    >
                      {link.icon} {link.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}


      {showLogoutConfirm && (
        <div
          onClick={() => setShowLogoutConfirm(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 380, padding: 32, background: 'rgba(18, 24, 20, 0.95)', border: `1px solid ${theme.border}`,
              borderRadius: 24, boxShadow: '0 32px 64px rgba(0,0,0,0.6)', textAlign: 'center',
              animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative', overflow: 'hidden'
            }}
          >
            {/* Glossy highlight */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, #c8f06940, transparent)' }} />

            <div style={{
              width: 48, height: 48, borderRadius: '50%', background: 'rgba(255, 95, 86, 0.1)',
              color: '#ff5f56', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
            </div>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400, color: '#fff', marginBottom: 12 }}>Check out?</h2>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: theme.textMuted, marginBottom: 32 }}>Are you sure you want to end your current session? You'll need to log back in to access your data.</p>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12, background: 'transparent',
                  border: `1px solid ${theme.border}`, color: 'var(--text2)', fontSize: 13,
                  fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = theme.textMuted; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = theme.border; }}
              >
                STAY
              </button>
              <button
                onClick={handleLogout}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12, background: 'var(--fail)',
                  border: 'none', color: '#000', fontSize: 13,
                  fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: '0 8px 16px rgba(255, 95, 86, 0.2)'
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                LOGOUT
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideIn {
          from { opacity: 0; transform: translate(-50%, 10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes slideInSimple {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @media (min-width: 768px) {
          .desktop-nav { display: flex !important; }
          .mobile-toggle { display: none !important; }
        }
        
        .nav-link {
          color: ${theme.textMuted};
          transition: all 0.2s;
        }
        .nav-link:hover {
          color: ${theme.text};
        }
        .nav-link.active {
          color: ${theme.accent};
        }
        
        .login-btn-ghost {
          background: rgba(255, 255, 255, 0.03);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          color: var(--text);
          border: 1px solid var(--text);
          padding: 8px 24px;
          border-radius: 100px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .login-btn-ghost:hover {
          color: ${theme.accent};
        }
        
        .nav-dropdown-item {
          background: transparent;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .nav-dropdown-item:hover {
          background: rgba(255, 255, 255, 0.03) !important;
        }
        .nav-dropdown-item:hover .item-title {
          color: var(--text) !important;
        }
        .nav-dropdown-item:hover .item-desc {
          color: var(--text2) !important;
        }
        .dropdown-item-hover:hover {
          background: rgba(255, 255, 255, 0.05) !important;
        }
      `}</style>
    </>
  );
}
