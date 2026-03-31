import React from 'react';

interface FooterProps {
  onSwitchTab: (tab: string) => void;
}

const Footer: React.FC<FooterProps> = ({ onSwitchTab }) => {
  const theme = {
    bg: '#0B0F0C',
    surface: '#121814',
    border: '#1F2922',
    accent: '#c8f069',
    text: '#ffffff',
    textMuted: '#9CA3AF',
  };

  return (
    <footer style={{ borderTop: `1px solid ${theme.border}`, padding: '60px 24px 40px', background: theme.bg, position: 'relative', zIndex: 10, marginTop: 100 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 40, marginBottom: 60 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <img src="/logo.png" alt="TestPilot AI Logo" style={{ height: 45, width: 'auto', display: 'block' }} />
            </div>
            <p style={{ color: theme.textMuted, fontSize: 14, maxWidth: 280, lineHeight: 1.6 }}>
              The next-generation testing engine for modern web applications. Quality engineering at the speed of light.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: 80, flexWrap: 'wrap' }}>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: theme.text, marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1 }}>Product</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {['Features', 'Pricing', 'Docs', 'Security'].map(item => (
                  <a 
                    key={item} 
                    href={item === 'Features' ? '/#features' : '#'} 
                    onClick={(e) => {
                      if (item === 'Pricing') { e.preventDefault(); onSwitchTab('pricing'); }
                      if (item === 'Docs') { e.preventDefault(); onSwitchTab('docs'); }
                      if (item === 'Features') { 
                        if (window.location.pathname === '/') {
                          // Already on home, let anchor work
                        } else {
                          e.preventDefault();
                          onSwitchTab('home');
                          setTimeout(() => {
                            const el = document.getElementById('features');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }, 100);
                        }
                      }
                    }}
                    style={{ fontSize: 14, color: theme.textMuted, textDecoration: 'none', transition: 'color 0.2s' }} 
                    onMouseEnter={e => e.currentTarget.style.color = theme.accent} 
                    onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}
                  >
                    {item}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: theme.text, marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1 }}>Company</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {['About', 'Blog', 'Contact', 'Privacy'].map(item => (
                  <a 
                    key={item} 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      onSwitchTab(item.toLowerCase());
                    }}
                    style={{ fontSize: 14, color: theme.textMuted, textDecoration: 'none', transition: 'color 0.2s' }} 
                    onMouseEnter={e => e.currentTarget.style.color = theme.accent} 
                    onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}
                  >
                    {item}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: `1px solid rgba(255,255,255,0.05)`, paddingTop: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ fontSize: 13, color: theme.textMuted }}>
            &copy; 2026 TestPilot AI by MeetGhelani. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Twitter', 'GitHub', 'LinkedIn'].map(social => (
              <a key={social} href="#" style={{ fontSize: 13, color: theme.textMuted, textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = theme.accent} onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}>{social}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
