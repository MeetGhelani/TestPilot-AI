import { useState, useEffect } from 'react';

interface NavbarProps {
  activeTab: string;
  switchTab: (tab: any) => void;
  globalBusy: boolean;
}

export default function Navbar({ activeTab, switchTab, globalBusy }: NavbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMarketing = activeTab === 'home';

  const theme = {
    bg: '#0B0F0C',
    surface: '#121814',
    border: '#1F2922',
    accent: '#c8f069',
    text: '#ffffff',
    textMuted: '#9CA3AF',
    glass: 'rgba(11, 15, 12, 0.8)',
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
      name: 'Runs',
      desc: 'Execution history & logs',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" />
        </svg>
      )
    },
  ];

  return (
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
        <nav style={{ display: 'none', alignItems: 'center', gap: 32 }} className="desktop-nav">
          {isMarketing ? (
            <>
              {['Home', 'Pricing', 'Docs'].map(item => (
                <a
                  key={item}
                  href="#"
                  onClick={(e) => { e.preventDefault(); if (item === 'Home') switchTab('home'); }}
                  className={`nav-link ${(item === 'Home' && activeTab === 'home') ? 'active' : ''}`}
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
                      {productLinks.map(link => (
                        <div
                          key={link.id}
                          onClick={() => { switchTab(link.id); setIsDropdownOpen(false); }}
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
            <div style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: 10, border: `1px solid ${theme.border}` }}>
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
          )}
        </nav>

        {/* RIGHT SIDE ACTIONS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {isMarketing ? (
            <>
              <button
                className="login-btn-ghost"
              >
                Login
              </button>
              <button
                onClick={() => switchTab('audit')}
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
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {globalBusy && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'rgba(200,240,105,0.05)', border: `1px solid rgba(200,240,105,0.2)`, borderRadius: 100 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: theme.accent, animation: 'pulse 1s infinite' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: theme.accent, letterSpacing: 1 }}>RUNNING</span>
                </div>
              )}
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: theme.border, border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              </div>
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
            {isMobileMenuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {isMobileMenuOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, background: theme.bg,
          borderBottom: `1px solid ${theme.border}`, padding: '24px', display: 'flex', flexDirection: 'column', gap: 20,
          animation: 'slideDown 0.3s ease-out'
        }}>
          {isMarketing ? (
            <>
              {['Home', 'Pricing', 'Docs'].map(item => (
                <a key={item} href="#" style={{ color: theme.text, fontSize: 18, fontWeight: 600, textDecoration: 'none' }}>{item}</a>
              ))}
              <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.textMuted, marginBottom: 16, textTransform: 'uppercase' }}>Solutions</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {productLinks.map(link => (
                    <div key={link.id} onClick={() => { switchTab(link.id); setIsMobileMenuOpen(false); }} style={{ color: theme.text, fontSize: 14, fontWeight: 500 }}>{link.name}</div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {productLinks.map(link => (
                <button
                  key={link.id}
                  onClick={() => { switchTab(link.id); setIsMobileMenuOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px', borderRadius: 12,
                    background: activeTab === link.id ? 'rgba(200,240,105,0.1)' : 'rgba(255,255,255,0.03)',
                    border: 'none', color: activeTab === link.id ? theme.accent : theme.text,
                    fontSize: 16, fontWeight: 600, textAlign: 'left'
                  }}
                >
                  {link.icon} {link.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translate(-50%, 10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
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
          color: ${theme.accent};
          border: 1px solid var(--text2);
          padding: 8px 24px;
          border-radius: 100px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .login-btn-ghost:hover {
          
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
      `}</style>
    </header>
  );
}
