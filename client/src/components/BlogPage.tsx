import React from 'react';
import Footer from './Footer';

const BlogPage: React.FC<{ onSwitchTab: (tab: string) => void }> = ({ onSwitchTab }) => {
  const theme = {
    bg: '#0B0F0C',
    surface: '#121814',
    border: '#1F2922',
    accent: '#c8f069',
    text: '#ffffff',
    textMuted: '#9CA3AF',
    glass: 'rgba(255, 255, 255, 0.03)',
  };

  const posts = [
    { title: 'The Future of AI-Driven QA Enginering', date: 'March 28, 2026', readTime: '5 min read', category: 'Engineering' },
    { title: 'Designing for Trust: Our New UI/UX Standards', date: 'March 22, 2026', readTime: '8 min read', category: 'Design' },
    { title: 'Optimizing LCP for Single Page Applications', date: 'March 15, 2026', readTime: '12 min read', category: 'Performance' },
    { title: 'How TestPilot AI Speeds Up Your Release Cycle', date: 'March 08, 2026', readTime: '6 min read', category: 'Product' },
    { title: 'Case Study: From 40% to 98% Test Coverage', date: 'March 02, 2026', readTime: '10 min read', category: 'Case Study' },
    { title: 'Why Web Accessibility (A11y) Matters More Than Ever', date: 'Feb 26, 2026', readTime: '7 min read', category: 'A11y' },
  ];

  return (
    <div style={{ background: theme.bg, color: theme.text, minHeight: '100vh', padding: '120px 24px 0', fontFamily: 'var(--font-sans)', position: 'relative' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        
        {/* HEADER */}
        <section style={{ marginBottom: 80, textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 800, marginBottom: 16 }}>TestPilot <span style={{ color: theme.accent }}>Blog.</span></h1>
          <p style={{ fontSize: 18, color: theme.textMuted }}>Latest news, engineering insights, and product updates.</p>
        </section>

        {/* FEATURED POST */}
        <section style={{ marginBottom: 100 }}>
          <div style={{ 
            background: `linear-gradient(rgba(200, 240, 105, 0.05), transparent), ${theme.surface}`, 
            border: `1px solid ${theme.border}`, 
            borderRadius: 32, 
            overflow: 'hidden', 
            display: 'flex',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }} className="featured-card mobile-col">
            <div style={{ flex: 1.2, padding: '40px 60px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'inline-flex', padding: '4px 12px', borderRadius: 100, border: `1px solid ${theme.accent}30`, color: theme.accent, fontSize: 12, fontWeight: 700, marginBottom: 24, width: 'fit-content' }}>FEATURED POST</div>
              <h2 style={{ fontSize: 36, fontWeight: 700, marginBottom: 24, lineHeight: 1.2 }}>Automating the Impossible: How AI is transforming edge case detection.</h2>
              <p style={{ color: theme.textMuted, fontSize: 18, lineHeight: 1.6, marginBottom: 32 }}>We've spent the last 6 months training our flagship model on over 100 million recorded user sessions. Here's what we learned about real-world user intent.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: theme.accent, color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>MG</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Meet Ghelani</div>
                  <div style={{ fontSize: 12, color: theme.textMuted }}>CEO & Founder</div>
                </div>
              </div>
            </div>
            <div style={{ flex: 0.8, background: '#080C09', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.1, fontSize: 160 }}>📰</div>
            </div>
          </div>
        </section>

        {/* LATEST POSTS GRID */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 40 }}>
          {posts.map((post, i) => (
            <article key={i} style={{ cursor: 'pointer' }} className="blog-item">
              <div style={{ width: '100%', aspectRatio: '16/9', background: theme.surface, borderRadius: 24, border: `1px solid ${theme.border}`, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(45deg, rgba(255,255,255,0.02), transparent)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: theme.accent, letterSpacing: 1.5 }}>{post.category.toUpperCase()}</span>
                <span style={{ fontSize: 12, color: theme.textMuted }}>{post.date}</span>
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, lineHeight: 1.4 }}>{post.title}</h3>
              <p style={{ color: theme.textMuted, fontSize: 14, lineHeight: 1.6 }}>Discover how we leveraged deep learning to predict where your application is most likely to break before your users do.</p>
            </article>
          ))}
        </section>
      </div>

      <Footer onSwitchTab={onSwitchTab} />

      <style>{`
        .featured-card:hover { transform: translateY(-4px); border-color: rgba(200, 240, 105, 0.4); box-shadow: 0 30px 60px rgba(0,0,0,0.5); }
        .blog-item { transition: all 0.3s; }
        .blog-item:hover { transform: translateY(-4px); }
        .blog-item:hover h3 { color: ${theme.accent}; }
        @media (max-width: 768px) { .mobile-col { flex-direction: column !important; } }
      `}</style>
    </div>
  );
};

export default BlogPage;
