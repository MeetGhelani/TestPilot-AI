import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SettingsPageProps {
  theme: 'dark' | 'light';
  onToggleTheme: (newTheme: 'dark' | 'light') => void;
}

export default function SettingsPage({ theme: currentTheme, onToggleTheme }: SettingsPageProps) {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'security' | 'preferences'>('profile');
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Form states
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');

  React.useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setFullName(user.user_metadata.full_name);
    }
  }, [user]);

  const theme = {
    bg: 'var(--bg)',
    surface: 'var(--surface)',
    border: 'var(--border)',
    accent: 'var(--accent)',
    text: 'var(--text)',
    textMuted: 'var(--text3)',
    glass: 'var(--glass)',
  };

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetPassword = async () => {
    setIsUpdating(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user?.email || '', {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Password reset link sent to your email!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    setIsUpdating(true);
    try {
      await signOut();
      setShowLogoutConfirm(false);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to logout: ' + err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    )},
    { id: 'account', label: 'Account', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
    )},
    { id: 'security', label: 'Security', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    )},
    { id: 'preferences', label: 'Preferences', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
    )},
  ];

  return (
    <div className="mobile-p-4" style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 40px', animation: 'fadeIn 0.4s ease-out' }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Settings</h1>
      <p style={{ color: theme.textMuted, marginBottom: 40 }}>Manage your account settings and preferences.</p>

      {message && (
        <div style={{ 
          padding: '12px 16px', 
          borderRadius: 12, 
          background: message.type === 'success' ? 'rgba(200, 240, 105, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${message.type === 'success' ? 'rgba(200, 240, 105, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          color: message.type === 'success' ? theme.accent : '#ef4444',
          marginBottom: 24,
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          {message.type === 'success' ? '✓' : '⚠'} {message.text}
        </div>
      )}

      <div className="mobile-col" style={{ display: 'flex', gap: 48 }}>
        {/* Sidebar */}
        <div className="mobile-w-full" style={{ width: 300, flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: 'none',
                  background: activeTab === tab.id ? 'rgba(200, 240, 105, 0.1)' : 'transparent',
                  color: activeTab === tab.id ? theme.accent : theme.textMuted,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.color = theme.text; }}
                onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.color = theme.textMuted; }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {activeTab === 'profile' && (
            <div style={{ animation: 'slideIn 0.3s ease-out' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Profile Information</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 480 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: theme.textMuted, marginBottom: 8 }}>Email Address</label>
                  <input 
                    type="text" 
                    value={user?.email || ''} 
                    disabled 
                    style={{ 
                      width: '100%', padding: '12px 16px', borderRadius: 12, 
                      background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}`,
                      color: theme.textMuted, cursor: 'not-allowed'
                    }} 
                  />
                  <p style={{ fontSize: 12, color: theme.textMuted, marginTop: 8 }}>Email cannot be changed.</p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: theme.textMuted, marginBottom: 8 }}>Full Name</label>
                  <input 
                    type="text" 
                    value={fullName} 
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Enter your name"
                    style={{ 
                      width: '100%', padding: '12px 16px', borderRadius: 12, 
                      background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.border}`,
                      color: theme.text, outline: 'none'
                    }} 
                  />
                </div>

                <button 
                  onClick={handleUpdateProfile}
                  disabled={isUpdating}
                  style={{
                    background: theme.accent, color: '#000', border: 'none', padding: '12px 24px', borderRadius: 12,
                    fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', width: 'fit-content',
                    marginTop: 8
                  }}
                  onMouseEnter={e => { if (!isUpdating) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { if (!isUpdating) e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  {isUpdating ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div style={{ animation: 'slideIn 0.3s ease-out' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Account Details</h2>
              <div style={{ 
                background: 'rgba(255,255,255,0.02)', border: `1px solid ${theme.border}`, 
                borderRadius: 20, padding: 32, display: 'flex', flexDirection: 'column', gap: 24
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: theme.textMuted, letterSpacing: 1.5, marginBottom: 12 }}>USER ID</label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <code style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: 8, fontSize: 13, color: theme.accent }}>{user?.id}</code>
                    <button 
                      onClick={() => { navigator.clipboard.writeText(user?.id || ''); alert('Copied to clipboard!'); }}
                      style={{ background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: theme.textMuted, letterSpacing: 1.5, marginBottom: 8 }}>JOINED ON</label>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{new Date(user?.created_at || new Date()).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: theme.textMuted, letterSpacing: 1.5, marginBottom: 8 }}>CURRENT PLAN</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>Pro Plan</div>
                      <span style={{ fontSize: 10, fontWeight: 900, background: 'rgba(200, 240, 105, 0.1)', color: theme.accent, padding: '2px 8px', borderRadius: 100, border: `1px solid rgba(200, 240, 105, 0.2)` }}>ACTIVE</span>
                    </div>
                  </div>
                </div>

                <div style={{ height: 1, background: theme.border, margin: '8px 0' }} />
                <div style={{display: 'flex', paddingTop:10,paddingBottom:15, background: 'rgba(255, 94, 86, 0.01)',alignItems: 'center', flexDirection: 'column', border: `1px solid #ff5e5644` , borderRadius: 20, padding: 32}}><span style={{ color: 'var(--fail)', fontSize: 20, fontWeight: 400 ,opacity:0.7}}>Danger Zone!</span>

                  {!showLogoutConfirm ? (
                    <div style={{ display: 'flex', marginTop:12 }}>
                      <button
                        onClick={() => setShowLogoutConfirm(true)}
                        style={{
                          padding: '12px 24px', borderRadius: 12, background: 'rgba(255, 95, 86, 0.1)',
                          border: '1px solid rgba(255, 95, 86, 0.2)', color: '#ff5f56', fontSize: 13,
                          fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                          display: 'flex', alignItems: 'center', gap: 8
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 95, 86, 0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 95, 86, 0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
                        LOGOUT
                      </button>
                    </div>
                  ) : (
                    <div style={{ 
                      marginTop: 12, padding: 32, background: 'transparent', 
                      borderRadius: 20,
                      textAlign: 'center', animation: 'fadeIn 0.3s ease-out' 
                    }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: '50%', background: 'rgba(255, 95, 86, 0.1)',
                        color: '#ff5f56', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 20px'
                      }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
                      </div>

                      <h2 style={{ fontSize: 20, fontWeight: 700, color: theme.text, marginBottom: 12 }}>Ready to leave?</h2>
                      <p style={{ fontSize: 13, lineHeight: 1.6, color: theme.textMuted, marginBottom: 32 }}>Are you sure you want to end your current session? You'll need to log back in to access your data.</p>

                      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                        <button
                          onClick={() => setShowLogoutConfirm(false)}
                          style={{
                            padding: '12px 32px', borderRadius: 12, background: 'transparent',
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
                            padding: '12px 32px', borderRadius: 12, background: 'var(--fail)',
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
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div style={{ animation: 'slideIn 0.3s ease-out' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Security</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                <div style={{ padding: 24, borderRadius: 20, border: `1px solid ${theme.border}`, background: 'rgba(255,255,255,0.02)' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Two-Factor Authentication</h3>
                  <p style={{ color: theme.textMuted, fontSize: 14, marginBottom: 20 }}>Add an extra layer of security to your account.</p>
                  <button style={{ background: 'transparent', color: theme.text, border: `1px solid ${theme.border}`, padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'not-allowed', opacity: 0.5 }}>Enable 2FA</button>
                </div>

                <div style={{ padding: 24, borderRadius: 20, border: `1px solid ${theme.border}`, background: 'rgba(255,255,255,0.02)' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Password Reset</h3>
                  <p style={{ color: theme.textMuted, fontSize: 14, marginBottom: 20 }}>Send a secure link to your email ({user?.email}) to set a new password.</p>
                  <button 
                    onClick={handleResetPassword}
                    disabled={isUpdating}
                    style={{ 
                      background: theme.accent, color: '#000', border: 'none', 
                      padding: '10px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' 
                    }}
                  >
                    {isUpdating ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div style={{ animation: 'slideIn 0.3s ease-out' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Preferences</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${theme.border}` }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>Theme Mode</div>
                    <div style={{ color: theme.textMuted, fontSize: 13 }}>Switch between dark and light appearance.</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, background: 'rgba(0,0,0,0.05)', padding: 4, borderRadius: 12, border: `1px solid ${theme.border}` }}>
                    <button 
                      onClick={() => onToggleTheme('dark')}
                      style={{ 
                        padding: '8px 16px', borderRadius: 8, border: 'none', 
                        background: currentTheme === 'dark' ? theme.accent : 'transparent', 
                        color: currentTheme === 'dark' ? '#000' : theme.textMuted, 
                        fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' 
                      }}
                    >
                      Dark
                    </button>
                    <button 
                      onClick={() => onToggleTheme('light')}
                      style={{ 
                        padding: '8px 16px', borderRadius: 8, border: 'none', 
                        background: currentTheme === 'light' ? theme.accent : 'transparent', 
                        color: currentTheme === 'light' ? '#000' : theme.textMuted, 
                        fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' 
                      }}
                    >
                      Light
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${theme.border}` }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>Email Notifications</div>
                    <div style={{ color: theme.textMuted, fontSize: 13 }}>Receive test reports and security alerts via email.</div>
                  </div>
                  <div style={{ width: 44, height: 24, background: theme.accent, borderRadius: 100, position: 'relative', cursor: 'pointer' }}>
                    <div style={{ position: 'absolute', right: 4, top: 4, width: 16, height: 16, background: '#000', borderRadius: '50%' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}
