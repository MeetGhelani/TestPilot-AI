import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface AuthPageProps {
  onLogin: () => void;
  onClose: () => void;
  initialMode?: 'login' | 'signup' | 'update_password';
}

export default function AuthPage({ onLogin, onClose, initialMode = 'login' }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'update_password' | 'forgot_password'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const theme = {
    bg: '#050705',
    surface: '#0d110e',
    border: 'rgba(255, 255, 255, 0.08)',
    accent: '#c8f069',
    accentGlow: 'rgba(200, 240, 105, 0.15)',
    text: '#ffffff',
    textMuted: '#94a3b8',
    glass: 'rgba(13, 17, 14, 0.7)',
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('--- Auth Started ---', { mode, email, password });
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'signup') {
        console.log('Attempting Sign Up with Supabase...');
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });
        
        console.log('Sign Up response:', { data, error: signUpError });
        
        if (signUpError) throw signUpError;
        
        if (data.user) {
          if (data.session) {
            console.log('Session created, calling onLogin()...');
            onLogin();
          } else {
            console.log('User created but no session (confirmation required)');
            setSuccess('Please check your email to confirm your account.');
          }
        }
      } else if (mode === 'login') {
        console.log('Attempting Sign In with Supabase...');
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        console.log('Sign In response:', { data, error: signInError });
        
        if (signInError) throw signInError;
        
        if (data.session) {
          console.log('Session valid, calling onLogin()...');
          onLogin();
        } else {
          console.log('No session in response');
          setError('Invalid login response from server.');
        }
      } else if (mode === 'update_password') {
        if (password !== confirmPassword) throw new Error('Passwords do not match');
        
        const { error: updateError } = await supabase.auth.updateUser({
          password: password
        });
        
        if (updateError) throw updateError;
        
        setSuccess('Password updated successfully! Redirecting...');
        setTimeout(() => {
          onLogin();
        }, 2000);
      } else if (mode === 'forgot_password') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/reset-password',
        });
        
        if (resetError) throw resetError;
        
        setSuccess('Password reset link sent! Please check your email.');
      }
    } catch (err) {
      console.error('Auth caught error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
      console.log('--- Auth Finished ---');
    }
  };

  const loginWithGoogle = async () => {
  try {
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google'
    });

    if (error) throw error;
  } catch (err) {
    console.error('Error logging in with Google:', err instanceof Error ? err.message : String(err));
    setIsLoading(false);
  }
};  
  return (
    <div style={{ 
      position: 'fixed', inset: 0, zIndex: 2000, background: theme.bg, color: theme.text, 
      display: 'flex', minHeight: '100vh', fontFamily: 'var(--font-sans)', overflow: 'hidden' 
    }}>
      
      {/* FULL-WIDTH CONTAINER */}
      <div style={{ 
        display: 'flex', width: '100%', minHeight: '100vh', position: 'relative'
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
        
        <div style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, animation: 'fadeUp 0.8s ease-out', textAlign: 'center' }}>
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
      {/* RIGHT SIDE: AUTH FORM */}
      <div className="auth-form-pane" style={{ flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', position: 'relative', overflow: 'hidden' }}>
        
        {/* Subtle background glow */}
        {/*<div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, height: 600, background: `radial-gradient(circle, ${theme.accentGlow} 0%, transparent 70%)`, opacity: 0.4, pointerEvents: 'none', zIndex: 0 }} />*/}

        
        {/* Navigation & Close */}
        <div style={{ position: 'absolute', top: 32, left: 32, right: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="lg-hidden" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/logo.png" alt="Logo" style={{ height: 28 }} />
          </div>
          <div />
        </div>

        <div style={{ width: '100%', maxWidth: 400, animation: 'fadeUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>
              {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create an account' : mode === 'forgot_password' ? 'Reset password' : 'Set new password'}
            </h2>
            <p style={{ color: theme.textMuted, fontSize: 16, opacity: 0.8 }}>
              {mode === 'login' 
                ? 'Sign in to access your test dashboard' 
                : mode === 'signup' 
                  ? 'Join 10k+ developers automating their QA' 
                  : mode === 'forgot_password'
                    ? 'Enter your email to receive a reset link'
                    : 'Enter your new secure password'}
            </p>
          </div>

          {error && (
            <div style={{ 
              padding: '12px 16px', borderRadius: 12, background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: 13, 
              marginBottom: 20, textAlign: 'center', fontWeight: 500, animation: 'fadeUp 0.3s ease-out'
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ 
              padding: '12px 16px', borderRadius: 12, background: 'rgba(200, 240, 105, 0.1)', 
              border: '1px solid rgba(200, 240, 105, 0.2)', color: theme.accent, fontSize: 13, 
              marginBottom: 20, textAlign: 'center', fontWeight: 500, animation: 'fadeUp 0.3s ease-out'
            }}>
              {success}
            </div>
          )}

          {/* SOCIAL LOGIN */}
          <button 
            onClick={loginWithGoogle}
            style={{ 
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, 
              padding: '12px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', color: theme.text, border: `1px solid ${theme.border}`, 
              fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', marginBottom: 20,
              backdropFilter: 'blur(10px)'
            }} 
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.24)';
            }} 
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.borderColor = theme.border;
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            <span style={{ opacity: 0.9 }}>Continue with Google</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, opacity: 0.5 }}>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${theme.border}, ${theme.border})` }} />
            <span style={{ fontSize: 11, color: theme.textMuted, fontWeight: 700, letterSpacing: '0.05em' }}>OR CONTINUE WITH</span>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${theme.border}, ${theme.border})` }} />
          </div>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mode === 'signup' && (
              <div className="input-group">
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: theme.textMuted, marginBottom: 6, marginLeft: 4 }}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: theme.textMuted, opacity: 0.5, display: 'flex' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  </div>
                  <input 
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="John Doe" 
                    style={{ width: '100%', padding: '12px 14px 12px 44px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255, 255, 255, 0.24)`, color: theme.text, fontSize: 14, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', outline: 'none' }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = theme.accent;
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                      e.currentTarget.style.boxShadow = `0 0 0 4px ${theme.accentGlow}`;
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.24)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    required
                  />
                </div>
              </div>
            )}
            
            {mode !== 'update_password' && (
              <div className="input-group">
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: theme.textMuted, marginBottom: 6, marginLeft: 4 }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: theme.textMuted, opacity: 0.5, display: 'flex' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                  </div>
                  <input 
                    type="email" 
                    autoFocus
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com" 
                    style={{ width: '100%', padding: '12px 14px 12px 44px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255, 255, 255, 0.24)`, color: theme.text, fontSize: 14, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', outline: 'none' }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = theme.accent;
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                      e.currentTarget.style.boxShadow = `0 0 0 4px ${theme.accentGlow}`;
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.24)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    required
                  />
                </div>
              </div>
            )}

            {(mode !== 'forgot_password') && (
              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, padding: '0 4px' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted }}>
                    {mode === 'update_password' ? 'New Password' : 'Password'}
                  </label>
                  {(mode === 'login') && (
                    <button 
                      type="button"
                      onClick={() => setMode('forgot_password')}
                      style={{ background: 'none', border: 'none', fontSize: 12, color: theme.accent, textDecoration: 'none', fontWeight: 600, opacity: 0.8, cursor: 'pointer' }} 
                      className="hover-opacity-1"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: theme.textMuted, opacity: 0.5, display: 'flex' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" 
                    style={{ width: '100%', padding: '12px 14px 12px 44px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255, 255, 255, 0.24)`, color: theme.text, fontSize: 14, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', outline: 'none', paddingRight: 48 }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = theme.accent;
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                      e.currentTarget.style.boxShadow = `0 0 0 4px ${theme.accentGlow}`;
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.24)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer', padding: 8, display: 'flex', opacity: 0.6, transition: 'opacity 0.2s' }}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {mode === 'update_password' && (
              <div className="input-group">
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: theme.textMuted, marginBottom: 8, marginLeft: 4 }}>Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: theme.textMuted, opacity: 0.5, display: 'flex' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••" 
                    style={{ width: '100%', padding: '12px 14px 12px 44px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255, 255, 255, 0.24)`, color: theme.text, fontSize: 14, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', outline: 'none' }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = theme.accent;
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                      e.currentTarget.style.boxShadow = `0 0 0 4px ${theme.accentGlow}`;
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.24)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    required
                  />
                </div>
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              style={{ 
                width: '100%', padding: '14px', borderRadius: 14, 
                background: `var(--accent)`, 
                color: '#050705', border: 'none', fontSize: 15, fontWeight: 700, 
                cursor: 'pointer', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 
                marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                //boxShadow: `0 8px 32px ${theme.accentGlow}`,
                position: 'relative', overflow: 'hidden'
              }}
              onMouseEnter={e => { 
                //e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'; 
                e.currentTarget.style.boxShadow = `0 8px 20px rgba(200,240,105,0.35)`;
              }}
              onMouseLeave={e => { 
                //e.currentTarget.style.transform = 'none'; 
                e.currentTarget.style.boxShadow = `0 8px 20px ${theme.accentGlow}`;
              }}
            >
              {isLoading ? (
                <div style={{ width: 24, height: 24, border: '3px solid rgba(0,0,0,0.1)', borderTop: '3px solid #000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : mode === 'forgot_password' ? 'Send Reset Link' : 'Update Password'}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </div>
              )}
            </button>
          </form>

          {mode !== 'update_password' && (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <p style={{ fontSize: 14, color: theme.textMuted }}>
                {mode === 'login' ? "Don’t have an account?" : mode === 'signup' ? "Already have an account?" : "Remembered your password?"}
                <button 
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  style={{ background: 'none', border: 'none', color: theme.accent, fontWeight: 700, cursor: 'pointer', marginLeft: 8 }}
                >
                  {mode === 'login' ? 'Sign up' : mode === 'signup' ? 'Sign in' : 'Sign in'}
                </button>
              </p>
            </div>
          )}

          <div style={{ marginTop: 32, textAlign: 'center', borderTop: `1px solid ${theme.border}`, paddingTop: 20 }}>
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
        .hover-opacity-1:hover { opacity: 1 !important; transform: translateY(-1px); }
        @media (min-width: 1024px) {
          .lg-hidden { display: none !important; }
          .auth-branding-pane { display: flex !important; flex: 1 !important; border-right: none !important; }
          .auth-form-pane { flex: 1 !important; }
          .auth-divider { display: block !important; }
        }
        @media (max-width: 1023px) {
          .auth-branding-pane { border-right: none !important; }
        }
        input::placeholder { color: rgba(255,255,255,0.2) !important; }
      `}</style>
    </div>
  );
}
