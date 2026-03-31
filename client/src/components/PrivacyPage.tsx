import React from 'react';
import Footer from './Footer';

const PrivacyPage: React.FC<{ onSwitchTab: (tab: string) => void }> = ({ onSwitchTab }) => {
  const theme = {
    bg: '#0B0F0C',
    surface: '#121814',
    border: '#1F2922',
    accent: '#c8f069',
    text: '#ffffff',
    textMuted: '#9CA3AF',
    glass: 'rgba(255, 255, 255, 0.03)',
  };

  const sections = [
    { id: 'introduction', title: '1. Introduction', content: 'TestPilot AI ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and share information about you when you use our services.' },
    { id: 'collection', title: '2. Information We Collect', content: 'We collect information you provide directly, such as when you create an account, use our testing tools, or contact us. This includes your email, name, and any data captured during recorded sessions.' },
    { id: 'use', title: '3. How We Use Information', content: 'We use the information we collect to provide, maintain, and improve our services, including generating test reports and providing AI-driven insights.' },
    { id: 'security', title: '4. Security', content: 'We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access. Your account is protected by Supabase Auth and encrypted database layers.' },
    { id: 'cookies', title: '5. Cookies & Tracking', content: 'We use cookies and similar technologies to track usage and store your preferences. You can disable cookies in your browser settings, though some features may not function correctly.' },
    { id: 'contact', title: '6. Contact Us', content: 'For any questions about this Privacy Policy, please contact our legal team at privacy@testpilot.ai' },
  ];

  return (
    <div style={{ background: theme.bg, color: theme.text, minHeight: '100vh', padding: '120px 24px 0', fontFamily: 'var(--font-sans)', position: 'relative' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', gap: 60 }} className="mobile-col">
        
        {/* SIDE NAV - Desktop */}
        <aside style={{ width: 240, flexShrink: 0, position: 'sticky', top: 120, height: 'fit-content' }} className="mobile-hide">
          <h4 style={{ fontSize: 13, fontWeight: 800, color: theme.textMuted, letterSpacing: 1.5, marginBottom: 20 }}>DOCUMENT SECTIONS</h4>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sections.map(s => (
              <a key={s.id} href={`#${s.id}`} style={{ fontSize: 14, color: theme.textMuted, textDecoration: 'none', transition: 'color 0.2s', fontWeight: 600 }} onMouseEnter={e => e.currentTarget.style.color = theme.accent} onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}>
                {s.title}
              </a>
            ))}
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main style={{ flex: 1 }}>
          <div style={{ marginBottom: 60 }}>
            <div style={{ display: 'inline-flex', padding: '4px 12px', borderRadius: 100, border: `1px solid ${theme.border}`, background: theme.glass, color: theme.accent, fontSize: 12, fontWeight: 700, marginBottom: 16 }}>LEGAL</div>
            <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, marginBottom: 16 }}>Privacy Policy</h1>
            <p style={{ color: theme.textMuted }}>Last updated: March 31, 2026</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            {sections.map(s => (
              <section key={s.id} id={s.id} style={{ scrollMarginTop: 140 }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#fff' }}>{s.title}</h3>
                <p style={{ color: theme.textMuted, lineHeight: 1.8, fontSize: 16 }}>{s.content}</p>
                {/* Placeholder content to make it look lengthier */}
                <p style={{ color: theme.textMuted, fontSize: 15, marginTop: 12, lineHeight: 1.7 }}>
                  We prioritize your data security by implementing enterprise-grade encryption and secure authentication protocols. Our commitment to transparency ensures that you retain full ownership of your data at all times.
                </p>
              </section>
            ))}
          </div>

          <div style={{ marginTop: 80, padding: 40, background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 24, textAlign: 'center' }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Have questions about our terms?</h3>
            <p style={{ color: theme.textMuted, marginBottom: 24 }}>Check out our full Terms of Service or contact our dedicated privacy and legal counsel.</p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button style={{ background: theme.accent, color: '#000', border: 'none', padding: '12px 24px', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>Terms of Service</button>
              <button 
                onClick={() => onSwitchTab('contact')}
                style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.text, padding: '12px 24px', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                Email Support
              </button>
            </div>
          </div>
        </main>
      </div>

      <Footer onSwitchTab={onSwitchTab} />

      <style>{`
        html { scroll-behavior: smooth };
        @media (max-width: 768px) {
          .mobile-col { flex-direction: column !important; }
          .mobile-hide { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default PrivacyPage;
