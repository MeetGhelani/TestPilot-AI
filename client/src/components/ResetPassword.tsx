import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const theme = {
    bg: 'var(--bg)',
    surface: 'var(--surface)',
    border: 'var(--border)',
    accent: 'var(--accent)',
    accentGlow: 'var(--accent-glow)',
    text: 'var(--text)',
    textMuted: 'var(--text3)',
    glass: 'var(--glass)',
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      setSuccess('Password updated successfully! Redirecting...');
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', 
      background: theme.bg, color: theme.text, fontFamily: 'var(--font-sans)', padding: 20,
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Background Glows */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)', filter: 'blur(100px)' }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)', filter: 'blur(100px)', opacity: 0.5 }} />

      <div style={{ 
        width: '100%', maxWidth: 440, background: theme.glass, border: `1px solid ${theme.border}`, 
        borderRadius: 28, padding: 40, backdropFilter: 'blur(32px)', boxShadow: '0 40px 100px rgba(0,0,0,0.2)',
        position: 'relative', zIndex: 1, animation: 'fadeUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <div style={{ 
              width: 56, height: 56, borderRadius: 16, background: 'var(--accent-glow)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.accent,
              border: `1px solid var(--accent-glow)`
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.02em' }}>Reset Password</h2>
          <p style={{ color: theme.textMuted, fontSize: 16, lineHeight: 1.5 }}>
            Enter your new secure password below to regain access to your dashboard.
          </p>
        </div>

        {error && (
          <div style={{ 
            padding: '12px 16px', borderRadius: 12, background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: 14, 
            marginBottom: 24, textAlign: 'center', fontWeight: 500, animation: 'fadeUp 0.3s ease-out'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ 
            padding: '12px 16px', borderRadius: 12, background: 'rgba(200, 240, 105, 0.1)', 
            border: '1px solid rgba(200, 240, 105, 0.2)', color: theme.accent, fontSize: 14, 
            marginBottom: 24, textAlign: 'center', fontWeight: 500, animation: 'fadeUp 0.3s ease-out'
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="input-group">
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: theme.textMuted, marginBottom: 8, marginLeft: 4 }}>New Password</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: theme.textMuted, opacity: 0.5, display: 'flex' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: -18 }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                autoFocus
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" 
                style={{ 
                  width: '100%', padding: '14px 14px 14px 48px', borderRadius: 14, 
                  background: 'var(--surface2)', border: `1px solid var(--border)`, 
                  color: theme.text, fontSize: 15, transition: 'all 0.3s' 
                }}
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer', padding: 8, opacity: 0.6 }}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
            {password.length > 0 && password.length < 6 && (
              <p style={{ fontSize: 12, color: '#ef4444', marginTop: 6, marginLeft: 4 }}>Password is too short</p>
            )}
          </div>

          <div className="input-group">
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: theme.textMuted, marginBottom: 8, marginLeft: 4 }}>Confirm New Password</label>
            <div style={{ position: 'relative' }}>
               <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: theme.textMuted, opacity: 0.5, display: 'flex' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••" 
                style={{ 
                  width: '100%', padding: '14px 14px 14px 48px', borderRadius: 14, 
                  background: 'var(--surface2)', border: `1px solid var(--border)`, 
                  color: theme.text, fontSize: 15, transition: 'all 0.3s' 
                }}
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading || password !== confirmPassword || password.length < 6}
            style={{ 
              width: '100%', padding: '16px', borderRadius: 16, 
              background: theme.accent, color: theme.bg, 
              border: 'none', fontSize: 16, fontWeight: 700, 
              cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
              marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              opacity: (isLoading || password !== confirmPassword || password.length < 6) ? 0.6 : 1,
              boxShadow: (isLoading || password !== confirmPassword || password.length < 6) ? 'none' : `0 10px 30px ${theme.accentGlow}`
            }}
          >
            {isLoading ? (
              <div style={{ width: 24, height: 24, border: '3px solid rgba(0,0,0,0.1)', borderTop: `3px solid ${theme.bg}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <>
                <span>Update Password</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <button 
            onClick={() => navigate('/')} 
            style={{ background: 'none', border: 'none', color: theme.textMuted, fontSize: 14, cursor: 'pointer', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = theme.text}
            onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input:focus {
          border-color: var(--accent) !important;
          outline: none;
          background: var(--surface2) !important;
          box-shadow: 0 0 0 4px var(--accent-glow);
        }
      `}</style>
    </div>
  );
}
