import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  onUnauthorized: () => void;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, onUnauthorized }) => {
  const { session, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !session) {
      onUnauthorized();
    }
  }, [isLoading, session, onUnauthorized]);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        background: 'radial-gradient(circle at center, rgba(200, 240, 105, 0.03) 0%, transparent 70%)',
        position: 'fixed',
        inset: 0,
        zIndex: 9999
      }}>
        <div style={{
          padding: '40px',
          borderRadius: '32px',
          background: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.05)',
          animation: 'scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {/* Logo / Icon Hub */}
          <div style={{ position: 'relative', marginBottom: 24 }}>
            <div style={{ 
              width: 80, height: 80, 
              borderRadius: '24px', 
              background: 'rgba(200, 240, 105, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(200, 240, 105, 0.2)',
              position: 'relative',
              zIndex: 2
            }}>
              <img src="/logo.png" alt="Logo" style={{ width: 44, height: 'auto', filter: 'drop-shadow(0 0 8px rgba(200, 240, 105, 0.4))' }} />
            </div>
            
            {/* Animated Rings */}
            <div style={{
              position: 'absolute', top: -10, left: -10, right: -10, bottom: -10,
              borderRadius: '30px', border: '1px solid rgba(200, 240, 105, 0.2)',
              animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite'
            }} />
            <div className="loader-ring" />
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              color: '#fff', 
              fontSize: 16, 
              fontWeight: 600, 
              letterSpacing: 0.5,
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              justifyContent: 'center'
            }}>
              Securing Session
              <span className="dot-jump">.</span>
              <span className="dot-jump" style={{ animationDelay: '0.2s' }}>.</span>
              <span className="dot-jump" style={{ animationDelay: '0.4s' }}>.</span>
            </div>
            <div style={{ 
              color: 'var(--text3)', 
              fontSize: 12, 
              fontWeight: 500, 
              letterSpacing: 1, 
              textTransform: 'uppercase',
              opacity: 0.8
            }}>
              TestPilot AI Engine
            </div>
          </div>
        </div>

        <style>{`
          @keyframes ping {
            75%, 100% { transform: scale(1.4); opacity: 0; }
          }
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes dotJump {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
          .loader-ring {
            position: absolute; inset: -15px;
            border-radius: 35px;
            border: 2px solid transparent;
            border-top-color: var(--accent);
            border-left-color: var(--accent);
            opacity: 0.4;
            animation: rotate 1.5s linear infinite;
          }
          .dot-jump {
            animation: dotJump 1.4s infinite;
          }
        `}</style>
      </div>
    );
  }

  if (!session) {
    return null; // Don't render protected content; useEffect will redirect.
  }

  return <>{children}</>;
};
