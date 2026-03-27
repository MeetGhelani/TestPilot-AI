import React, { useState, useEffect } from 'react';

interface AuthPageProps {
  onLogin: () => void;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export default function AuthPage({ onLogin, onClose, initialMode = 'login' }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const theme = {
    bg: '#0B0F0C',
    surface: '#121814',
    border: '#1F2922',
    accent: '#c8f069',
    text: '#ffffff',
    textMuted: '#9CA3AF',
    glass: 'rgba(18, 24, 20, 0.7)',
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      onLogin();
    }, 1500);
  };

  return (
    <div style={{ 
      position: 'fixed', inset: 0, zIndex: 2000, background: theme.bg, color: theme.text, 
      display: 'flex', minHeight: '100vh', fontFamily: 'var(--font-sans)', overflow: 'hidden' 
    }}>
      
      {/* CENTERED CONTAINER */}
      <div style={{ 
        display: 'flex', width: '100%', minHeight: '100vh', maxWidth: 1400, margin: '0 auto', position: 'relative'
      }}>
        {/* LEFT SIDE: BRANDING & PREVIEW */}
        <div style={{ 
          flex: 1, position: 'relative', display: 'none', flexDirection: 'column', 
          justifyContent: 'center', alignItems: 'center', padding: '0 80px', overflow: 'hidden',
          background: `radial-gradient(circle at 20% 30%, rgba(200,240,105,0.08) 0%, transparent 50%), 
                       radial-gradient(circle at 80% 70%, rgba(200,240,105,0.05) 0%, transparent 50%)`
        }} className="auth-branding-pane">
        
        {/* Close Button Mobile (Hidden on Desktop) */}
        <button onClick={onClose} style={{ position: 'absolute', top: 32, left: 32, background: 'none', border: 'none', color: theme.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, opacity: 0.6 }}>
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg> Back to site
        </button>

        <div style={{ maxWidth: 520, zIndex: 1, animation: 'fadeUp 0.8s ease-out', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40, justifyContent: 'center' }}>
            <img src="/logo.png" alt="TestPilot AI" style={{ height: 44 }} />
          </div>
          <h1 style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.1, marginBottom: 24, letterSpacing: '-0.03em' }}>
            Start testing <br />
            <span style={{ color: theme.accent }}>in seconds.</span>
          </h1>
          <p style={{ fontSize: 18, color: theme.textMuted, lineHeight: 1.6, marginBottom: 48 }}>
            Automate QA, generate AI tests, and audit your site’s health — all in one unified developer platform.
          </p>

          {/* UI PREVIEW CARD */}
          <div style={{ 
            width: '100%', maxWidth: 440, background: 'rgba(255,255,255,0.02)', border: `1px solid ${theme.border}`, borderRadius: 24, padding: 32, 
            backdropFilter: 'blur(10px)', boxShadow: '0 40px 80px rgba(0,0,0,0.5)', position: 'relative',
            animation: 'cardFloat 4s ease-in-out infinite', textAlign: 'left'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Live Audit Report</div>
              <div style={{ padding: '4px 12px', background: 'rgba(200,240,105,0.1)', color: theme.accent, borderRadius: 100, fontSize: 12, fontWeight: 700 }}>v2.0 Beta</div>
            </div>

            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <div style={{ position: 'relative', width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="50" cy="50" r="44" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="none" />
                  <circle cx="50" cy="50" r="44" stroke={theme.accent} strokeWidth="8" fill="none" strokeDasharray="276" strokeDashoffset="27.6" strokeLinecap="round" style={{ transition: 'stroke-dashoffset 2s', animation: 'ringFill 2s ease-out' }} />
                </svg>
                <div style={{ position: 'absolute', fontSize: 32, fontWeight: 900 }}>90</div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Functional', val: '92%', ok: true },
                  { label: 'Security', val: 'Pass', ok: true },
                  { label: 'Performance', val: '88ms', ok: true }
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ color: theme.textMuted }}>{item.label}</span>
                    <span style={{ color: theme.accent, fontWeight: 600 }}>{item.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Scanning Line */}
            <div style={{ 
              position: 'absolute', left: 0, right: 0, height: 2, background: 'linear-gradient(to right, transparent, #c8f069, transparent)',
              animation: 'scanMove 3s linear infinite', top: '50%', opacity: 0.3 
            }} />
          </div>
        </div>

        {/* Floating background elements */}
        <div style={{ position: 'absolute', top: '10%', right: '-10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(200,240,105,0.03) 0%, transparent 70%)', borderRadius: '50%' }} />
      </div>

      <div className="auth-divider" style={{ width: 1, height: 500, background: 'linear-gradient(to bottom, transparent, var(--accent), transparent)',borderRadius: '50%', alignSelf: 'center', display: 'none' }} />

      {/* RIGHT SIDE: AUTH FORM */}
      <div className="auth-form-pane" style={{ flex: '0 0 100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 40px', position: 'relative' }}>
        
        {/* Navigation & Close */}
        <div style={{ position: 'absolute', top: 32, left: 32, right: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="lg-hidden" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/logo.png" alt="Logo" style={{ height: 28 }} />
          </div>
          <div />
        </div>

        <div style={{ width: '100%', maxWidth: 400, animation: 'fadeUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 12 }}>
              {mode === 'login' ? 'Welcome back' : 'Create an account'}
            </h2>
            <p style={{ color: theme.textMuted, fontSize: 15 }}>
              {mode === 'login' 
                ? 'Sign in to access your test dashboard' 
                : 'Join 10k+ developers automating their QA'}
            </p>
          </div>

          {/* SOCIAL LOGIN */}
          <button style={{ 
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, 
            padding: '14px', borderRadius: 12, background: '#fff', color: '#000', border: 'none', 
            fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', marginBottom: 24 
          }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
            <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: theme.border }} />
            <span style={{ fontSize: 13, color: theme.textMuted, fontWeight: 600 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: theme.border }} />
          </div>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {mode === 'signup' && (
              <div className="input-group">
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: theme.textMuted, marginBottom: 8 }}>Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Doe" 
                  style={{ width: '100%', padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}`, color: theme.text, fontSize: 15, transition: 'all 0.2s', outline: 'none' }}
                  onFocus={e => e.currentTarget.style.borderColor = theme.accent}
                  onBlur={e => e.currentTarget.style.borderColor = theme.border}
                  required
                />
              </div>
            )}
            
            <div className="input-group">
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: theme.textMuted, marginBottom: 8 }}>Email Address</label>
              <input 
                type="email" 
                autoFocus
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com" 
                style={{ width: '100%', padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}`, color: theme.text, fontSize: 15, transition: 'all 0.2s', outline: 'none' }}
                onFocus={e => { e.currentTarget.style.borderColor = theme.accent; e.currentTarget.style.boxShadow = `0 0 20px rgba(200,240,105,0.1)`; }}
                onBlur={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.boxShadow = 'none'; }}
                required
              />
            </div>

            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: theme.textMuted }}>Password</label>
                {mode === 'login' && <a href="#" style={{ fontSize: 13, color: theme.accent, textDecoration: 'none', fontWeight: 600 }}>Forgot?</a>}
              </div>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  style={{ width: '100%', padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}`, color: theme.text, fontSize: 15, transition: 'all 0.2s', outline: 'none', paddingRight: 48 }}
                  onFocus={e => { e.currentTarget.style.borderColor = theme.accent; e.currentTarget.style.boxShadow = `0 0 20px rgba(200,240,105,0.1)`; }}
                  onBlur={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.boxShadow = 'none'; }}
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer', padding: 4 }}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              style={{ 
                width: '100%', padding: '16px', borderRadius: 12, background: theme.accent, color: '#000', 
                border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer', transition: 'all 0.3s', 
                marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                boxShadow: `0 0 30px rgba(200,240,105,0.2)`
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 0 40px rgba(200,240,105,0.4)`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 0 30px rgba(200,240,105,0.2)`; }}
            >
              {isLoading ? (
                <div style={{ width: 24, height: 24, border: '3px solid rgba(0,0,0,0.1)', borderTop: '3px solid #000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <> {mode === 'login' ? 'Sign In' : 'Create Account'} &rarr; </>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <p style={{ fontSize: 15, color: theme.textMuted }}>
              {mode === 'login' ? "Don’t have an account?" : "Already have an account?"}
              <button 
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                style={{ background: 'none', border: 'none', color: theme.accent, fontWeight: 700, cursor: 'pointer', marginLeft: 8 }}
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>

          <div style={{ marginTop: 48, textAlign: 'center', borderTop: `1px solid ${theme.border}`, paddingTop: 24 }}>
            <p style={{ fontSize: 12, color: theme.textMuted, opacity: 0.6 }}>
               Secure login with 256-bit encryption. <br />
               No spam. No hidden charges.
            </p>
          </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardFloat {
          0%, 100% { transform: translateY(0) rotateX(0); }
          50% { transform: translateY(-10px) rotateX(1deg); }
        }
        @keyframes scanMove {
          0% { top: 0; }
          100% { top: 100%; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes ringFill {
          from { stroke-dashoffset: 276; }
          to { stroke-dashoffset: 27.6; }
        }
        @media (min-width: 1024px) {
          .lg-hidden { display: none !important; }
          .auth-branding-pane { display: flex !important; flex: 1 !important; border-right: none !important; }
          .auth-form-pane { flex: 1 !important; }
          .auth-divider { display: block !important; }
        }
        @media (max-width: 1023px) {
          .auth-branding-pane { border-right: none !important; }
        }
      `}</style>
    </div>
  );
}
