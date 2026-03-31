import React, { useState } from 'react';
import Footer from './Footer';

const ContactPage: React.FC<{ onSwitchTab: (tab: string) => void }> = ({ onSwitchTab }) => {
  const [formState, setFormState] = useState({ name: '', email: '', subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const theme = {
    bg: '#0B0F0C',
    surface: '#121814',
    border: '#1F2922',
    accent: '#c8f069',
    text: '#ffffff',
    textMuted: '#9CA3AF',
    glass: 'rgba(255, 255, 255, 0.03)',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSent(true);
      setFormState({ name: '', email: '', subject: '', message: '' });
    }, 1500);
  };

  return (
    <div style={{ background: theme.bg, color: theme.text, minHeight: '100vh', padding: '120px 24px 0', fontFamily: 'var(--font-sans)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1, display: 'flex', gap: 100 }} className="mobile-col">
        
        {/* LEFT: INFO */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 100, border: `1px solid ${theme.border}`, background: theme.glass, color: theme.accent, fontSize: 13, fontWeight: 700, marginBottom: 24 }}>
            📞 Contact Us
          </div>
          <h1 style={{ fontSize: 'clamp(40px, 8vw, 64px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 24 }}>
            Let's build a more <span style={{ color: theme.accent }}>reliable web together.</span>
          </h1>
          <p style={{ fontSize: 18, color: theme.textMuted, lineHeight: 1.6, marginBottom: 48 }}>
            Have a question about our enterprise plans? Need help with an integration? Our engineering team is ready to help.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div style={{ display: 'flex', gap: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📧</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.textMuted, letterSpacing: 1 }}>EMAIL US</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>support@testpilot.ai</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🐦</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.textMuted, letterSpacing: 1 }}>TWITTER</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>@testpilotai</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: FORM */}
        <div style={{ flex: 1.2 }}>
          <form 
            onSubmit={handleSubmit}
            style={{ 
              background: 'rgba(255, 255, 255, 0.02)', 
              border: `1px solid ${theme.border}`, 
              borderRadius: 32, 
              padding: '40px',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
              position: 'relative'
            }}
          >
            {isSent && (
              <div style={{ 
                position: 'absolute', inset: 0, background: theme.surface, borderRadius: 32, zIndex: 10,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40,
                animation: 'fadeUp 0.4s ease-out'
              }}>
                <div style={{ fontSize: 48, marginBottom: 24 }}>✨</div>
                <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Message Sent!</h3>
                <p style={{ color: theme.textMuted }}>Thank you for reaching out. A human from our team will get back to you within 24 hours.</p>
                <button onClick={() => setIsSent(false)} style={{ marginTop: 32, background: 'transparent', border: `1px solid ${theme.border}`, color: theme.text, padding: '12px 24px', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>Send another</button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: theme.textMuted, marginBottom: 8, letterSpacing: 1 }}>NAME</label>
                <input required type="text" placeholder="Your name" style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}`, padding: '14px 16px', borderRadius: 12, color: theme.text, outline: 'none' }} className="contact-input" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: theme.textMuted, marginBottom: 8, letterSpacing: 1 }}>EMAIL ADDRESS</label>
                <input required type="email" placeholder="email@company.com" style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}`, padding: '14px 16px', borderRadius: 12, color: theme.text, outline: 'none' }} className="contact-input" />
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: theme.textMuted, marginBottom: 8, letterSpacing: 1 }}>SUBJECT</label>
              <select style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}`, padding: '14px 16px', borderRadius: 12, color: theme.text, outline: 'none' }} className="contact-input">
                <option style={{ background: '#0e1110ff' }}>General Inquiry</option>
                <option style={{ background: '#0e1110ff' }}>Enterprise Plans</option>
                <option style={{ background: '#0e1110ff' }}>Technical Support</option>
                <option style={{ background: '#0e1110ff' }}>Billing</option>
              </select>
            </div>
            <div style={{ marginBottom: 32 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: theme.textMuted, marginBottom: 8, letterSpacing: 1 }}>MESSAGE</label>
              <textarea required rows={5} placeholder="Tell us what you're building..." style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}`, padding: '14px 16px', borderRadius: 12, color: theme.text, outline: 'none', resize: 'none' }} className="contact-input" />
            </div>
            <button 
              type="submit" 
              disabled={isSubmitting}
              style={{ width: '100%', background: theme.accent, color: '#000', border: 'none', padding: '18px', borderRadius: 12, fontSize: 16, fontWeight: 800, cursor: 'pointer', transition: 'all 0.3s' }}
              className="submit-btn"
            >
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>

      <Footer onSwitchTab={onSwitchTab} />

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .contact-input:focus {
          border-color: ${theme.accent} !important;
          background: rgba(200, 240, 105, 0.05) !important;
        }
        .submit-btn:hover {
          background: ${theme.accent}dd;
          transform: translateY(-2px);
          box-shadow: 0 10px 30px ${theme.accent}44;
        }
        @media (max-width: 768px) {
          .mobile-col { flex-direction: column !important; gap: 60px !important; }
        }
      `}</style>
    </div>
  );
};

export default ContactPage;
