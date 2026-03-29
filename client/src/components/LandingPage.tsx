import { useState, useEffect } from 'react';

export default function LandingPage({ isAuthenticated, isSessionLoading, onGetStarted, onGoToApp }: { isAuthenticated: boolean, isSessionLoading: boolean, onGetStarted: () => void, onGoToApp: () => void }) {
  const [isVisible, setIsVisible] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [auditScore, setAuditScore] = useState(0);

  // Typewriter states
  const [typedWordIndex, setTypedWordIndex] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % 3);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const typedWords = ['Performance.', 'Accessibility.', 'SEO.', 'User Flows.'];
  useEffect(() => {
    const currentWord = typedWords[typedWordIndex];
    if (isDeleting) {
      if (typedText === '') {
        setIsDeleting(false);
        setTypedWordIndex((prev) => (prev + 1) % typedWords.length);
      } else {
        const timeout = setTimeout(() => setTypedText(currentWord.substring(0, typedText.length - 1)), 50);
        return () => clearTimeout(timeout);
      }
    } else {
      if (typedText === currentWord) {
        const timeout = setTimeout(() => setIsDeleting(true), 2000);
        return () => clearTimeout(timeout);
      } else {
        const timeout = setTimeout(() => setTypedText(currentWord.substring(0, typedText.length + 1)), 100);
        return () => clearTimeout(timeout);
      }
    }
  }, [typedText, isDeleting, typedWordIndex]);

  useEffect(() => {
    if (activeStep === 2) {
      const target = 92;
      const stepDuration = 1500 / target;
      let current = 0;
      const timer = setInterval(() => {
        current += 1;
        if (current <= target) {
          setAuditScore(current);
        } else {
          clearInterval(timer);
        }
      }, stepDuration);
      return () => clearInterval(timer);
    } else {
      setAuditScore(0);
    }
  }, [activeStep]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const theme = {
    bg: '#0B0F0C',
    surface: '#121814',
    surfaceGlow: 'rgba(200, 240, 105, 0.03)',
    border: '#1F2922',
    text: '#ffffff',
    textMuted: '#9CA3AF',
    accent: '#c8f069',
    accentHover: '#b5de55',
  };

  const animations = `
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulseGlow {
      0%, 100% { box-shadow: 0 0 40px rgba(200, 240, 105, 0.1); }
      50% { box-shadow: 0 0 80px rgba(200, 240, 105, 0.2); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    .landing-card {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .landing-card:hover {
      transform: translateY(-4px);
      border-color: rgba(200, 240, 105, 0.3);
      background: rgba(200, 240, 105, 0.02);
    }
    .final-cta-btn:hover .arrow-icon {
      transform: translateX(6px);
    }
    .final-cta-btn:hover .btn-shine {
      left: 100% !important;
      transition: all 0.6s ease-out;
    }
    @keyframes typing {
      from { max-width: 0 }
      to { max-width: 26ch }
    }
    @keyframes blink-caret {
      from, to { border-right-color: transparent; opacity: 1; }
      50% { border-right-color: #c8f069; opacity: 0; }
    }
    @keyframes cursorSequence {
      0%, 55% { transform: translate(200px, 80px) scale(1); opacity: 0; }
      60% { transform: translate(200px, 80px) scale(1); opacity: 1; }
      77% { transform: translate(530px, 34px) scale(1); opacity: 1; }
      80% { transform: translate(530px, 34px) scale(0.85); opacity: 1; }
      84% { transform: translate(530px, 34px) scale(1); opacity: 1; }
      90%, 100% { transform: translate(530px, 34px) scale(1); opacity: 0; }
    }
    @keyframes buttonClickFlash {
      0%, 78% { transform: scale(1); filter: brightness(1); box-shadow: none; }
      80% { transform: scale(0.95); filter: brightness(1.2); box-shadow: 0 0 20px rgba(200,240,105,0.6); }
      85%, 100% { transform: scale(1); filter: brightness(1); box-shadow: none; }
    }
    @keyframes scanLine {
      0% { transform: scaleX(0); opacity: 0; }
      50% { transform: scaleX(1); opacity: 1; }
      100% { transform: scaleX(0); opacity: 0; }
    }
    @keyframes checkPop {
      0% { transform: scale(0); }
      80% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
    @keyframes staggerIn {
      from { opacity: 0; transform: translateX(-10px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes fillProgress {
      from { width: 0; }
    }
    @keyframes numberPop {
      0%, 100% { transform: scale(0.6); opacity: 0; filter: blur(10px); }
      15%, 80% { transform: scale(1); opacity: 1; filter: blur(0); }
    }
    @keyframes shineEffect {
      0% { left: -100%; }
      100% { left: 100%; }
    }
    @keyframes cardFloat {
      0%, 100% { transform: translateY(0) rotateX(0deg) rotateY(0deg); }
      50% { transform: translateY(-15px) rotateX(2deg) rotateY(1deg); }
    }
    @keyframes lineDraw {
      0% { stroke-dashoffset: 117; }
      80%, 100% { stroke-dashoffset: 0; }
    }
    @keyframes dataPointPulse {
      0% { transform: scale(1); opacity: 0.6; }
      100% { transform: scale(2.5); opacity: 0; }
    }
    @keyframes moveNode {
      0% { offset-distance: 0%; }
      80%, 100% { offset-distance: 100%; }
    }
    @keyframes revealArea {
      0% { clip-path: inset(0 100% 0 0); }
      80%, 100% { clip-path: inset(0 0 0 0); }
    }
    @keyframes ringFill {
      from { stroke-dashoffset: 527; }
      to { stroke-dashoffset: 60; }
    }
    @keyframes glowPulse {
      0%, 100% { transform: scale(1); opacity: 0.4; }
      50% { transform: scale(1.1); opacity: 0.7; }
    }
    @keyframes insightTagPop {
      from { opacity: 0; transform: translateY(10px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes recDot {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.4); opacity: 0.5; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes shineSweep {
      0% { transform: translateX(-100%) skewX(-20deg); }
      20%, 100% { transform: translateX(200%) skewX(-20deg); }
    }
    @keyframes featureCardHover {
      0% { border-color: #1F2922; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
      100% { border-color: rgba(200, 240, 105, 0.4); box-shadow: 0 0 30px rgba(200, 240, 105, 0.1); }
    }
    .feature-card {
      position: relative;
      overflow: hidden;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .feature-card:hover {
      transform: translateY(-8px);
      background: rgba(105, 240, 188, 0.06) !important;
    }
    .feature-card:hover .shine-element {
      animation: shineSweep 2s infinite;
    }
    /*.feature-card:hover .preview-container {
      transform: translateY(-4px) scale(1.02);
      border-color: rgba(200, 240, 105, 0.3);
    }*/
    .hero-pill {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    @keyframes speedBarGrow {
      from { width: 0%; }
      to { width: 92%; }
    }
    .diff-card {
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .diff-card-tp:hover {
      background: rgba(200, 240, 105, 0.03) !important;
      border-color: rgba(200, 240, 105, 0.4) !important;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(200, 240, 105, 0.1) !important;
      transform: translateY(-8px) scale(1.02) !important;
    }
    @keyframes ctaPulse {
      0%, 100% { box-shadow: 0 0 20px rgba(200,240,105,0.3); transform: scale(1); }
      50% { box-shadow: 0 0 40px rgba(200,240,105,0.6); transform: scale(1.02); }
    }
    @keyframes gridFlow {
      0% { background-position: 0 0; }
      100% { background-position: 40px 40px; }
    }
    .footer-btn-primary:hover {
      background: #d9f99d !important;
      box-shadow: 0 0 40px rgba(200,240,105,0.6) !important;
      transform: translateY(-2px) scale(1.05) !important;
    }
    .footer-btn-secondary:hover {
      background: rgba(255,255,255,0.05) !important;
      border-color: rgba(255,255,255,0.2) !important;
      transform: translateY(-2px) !important;
    }
    .scroll-top-btn:hover {
      background: rgba(200, 240, 105, 0.1) !important;
      border-color: rgba(200, 240, 105, 0.4) !important;
      transform: translateY(-4px) scale(1.1) !important;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(200, 240, 105, 0.1) !important;
    }
    
    /* Hide Scrollbar */
    ::-webkit-scrollbar {
      display: none;
    }
    * {
      -ms-overflow-style: none; /* IE and Edge */
      scrollbar-width: none; /* Firefox */
    }
  `;

  return (
    <div style={{ background: theme.bg, color: theme.text, minHeight: '100vh', fontFamily: 'var(--font-sans)', overflowX: 'hidden' }}>
      <style>{animations}</style>

      {/* Hero Background Glows */}
      <div style={{ position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)', width: 800, height: 800, background: 'radial-gradient(circle, rgba(200,240,105,0.05) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>

        {/* HERO SECTION */}
        <section style={{ padding: '120px 0 80px', display: 'flex', alignItems: 'center', gap: 60, minHeight: '80vh', opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.8s ease-out' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="hero-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1px solid ${theme.border}`, padding: '6px 16px', borderRadius: 100, fontSize: 13, fontWeight: 600, color: theme.accent, marginBottom: 24, background: theme.surfaceGlow, backdropFilter: 'blur(10px)', cursor: 'pointer' }}>
              <span className="hero-pill-sparkle">✨</span> Introducing TestPilot AI 2.0
            </div>
            <h1 style={{ fontSize: 'clamp(48px, 5vw, 64px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 0 24px 0', minHeight: '3.3em' }}>
              Automate QA. <br />
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ color: theme.textMuted }}>Audit&nbsp;</span>
                <span style={{ color: theme.accent, position: 'relative' }}>
                  {typedText}
                  <span style={{ position: 'absolute', right: -6, top: '10%', height: '80%', width: 3, background: theme.accent, animation: 'blink-caret 0.8s step-end infinite' }} />
                </span>
              </div>
              Ship Faster.
            </h1>
            <p style={{ fontSize: 18, color: theme.textMuted, lineHeight: 1.6, maxWidth: 480, marginBottom: 40 }}>
              The developer-first AI QA platform. Record flows, instantly generate test coverage, and deeply audit your site's SEO, Accessibility, and Performance—all in one place.
            </p>
            <div style={{ display: 'flex', gap: 16 }}>
              <button onClick={isAuthenticated ? onGoToApp : onGetStarted} disabled={isSessionLoading} style={{ background: theme.accent, color: '#000', border: 'none', padding: '16px 32px', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: isSessionLoading ? 'wait' : 'pointer', transition: 'all 0.2s', boxShadow: '0 0 20px rgba(200,240,105,0.3)', opacity: isSessionLoading ? 0.7 : 1 }}
                onMouseEnter={e => { if (!isSessionLoading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(200,240,105,0.5)'; } }}
                onMouseLeave={e => { if (!isSessionLoading) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(200,240,105,0.3)'; } }}>
                {isSessionLoading ? 'Loading...' : isAuthenticated ? 'Go to Dashboard' : 'Start Testing Free'}
              </button>
              <button style={{ background: 'transparent', color: theme.text, border: `1px solid ${theme.border}`, padding: '16px 32px', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(10px)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                Watch Demo
              </button>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0, position: 'relative', perspective: '1200px' }}>
            {/* Background Glow behind card */}
            <div style={{ position: 'absolute', top: '10%', left: '10%', width: '80%', height: '80%', background: 'radial-gradient(circle, rgba(200,240,105,0.1) 0%, transparent 70%)', filter: 'blur(60px)', zIndex: 0 }} />

            <div style={{
              background: 'rgba(11, 15, 12, 0.7)',
              border: `1px solid ${theme.border}`,
              borderRadius: 32,
              padding: '32px 0 0 0',
              boxShadow: '0 40px 100px rgba(0,0,0,0.8), inset 0 0 40px rgba(255,255,255,0.02)',
              position: 'relative',
              zIndex: 1,
              backdropFilter: 'blur(32px)',
              animation: 'cardFloat 8s ease-in-out infinite',
              overflow: 'hidden'
            }}>
              {/* Shine Effect */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden', borderRadius: 32 }}>
                <div style={{ position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)', transform: 'skewX(-20deg)', animation: 'shineEffect 10s infinite ease-in-out' }} />
              </div>

              {/* DASHBOARD HEADER */}
              <div style={{ padding: '0 32px 24px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ height: 14, width: 60, background: 'rgba(255,255,255,0.05)', borderRadius: 100 }} />
                  <div style={{ height: 14, width: 14, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                </div>
              </div>

              <div style={{ padding: 32 }}>
                {/* 1. TEST EXECUTION BAR */}
                <div style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${theme.border}`, borderRadius: 20, padding: '20px 24px', marginBottom: 32 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ position: 'relative', width: 10, height: 10, flexShrink: 0, marginTop: 1 }}>
                        <div style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', background: theme.accent, opacity: 0.8 }} />
                        <div style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', background: theme.accent, animation: 'dataPointPulse 2s linear infinite' }} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 900, color: theme.accent, letterSpacing: 2 }}>RUNNING AI AUDIT v2.0</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: theme.text, background: 'rgba(200,240,105,0.1)', padding: '4px 10px', borderRadius: 6, border: `1px solid rgba(200,240,105,0.2)` }}>STABLE</span>
                  </div>
                  <div style={{ height: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 100, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ height: '100%', background: `linear-gradient(90deg, ${theme.accent}, #fff)`, borderRadius: 100, width: '100%', animation: 'fillProgress 4s cubic-bezier(0.65, 0, 0.35, 1) forwards infinite' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                  {/* 2. TEST STEPS PANEL (Refined with Icons) */}
                  <div style={{ flex: 1.1, minWidth: 220 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: theme.textMuted, marginBottom: 20, letterSpacing: 1.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: theme.textMuted }} />
                      AUTOMATED WORKFLOW
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        { text: 'Analyze Landing DOM', delay: '0.8s', color: theme.text },
                        { text: 'Click "Pricing" Anchor', delay: '1.2s', color: theme.text },
                        { text: 'Validate Checkout Flow', delay: '1.6s', color: theme.text },
                        { text: 'Generate Audit Report', delay: '2.0s', color: theme.accent }
                      ].map((step, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 14,
                          background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.05)`,
                          padding: '12px 16px', borderRadius: 16, fontSize: 13, color: step.color,
                          animation: `staggerIn 0.5s ease-out ${step.delay} forwards`, opacity: 0,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(200,240,105,0.08)', color: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, border: '1px solid rgba(200,240,105,0.15)' }}>✓</div>
                          {step.text}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. AUDIT SCORE & IMPROVED GRAPH */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{
                      background: 'rgba(255,255,255,0.015)',
                      border: `1px solid ${theme.border}`,
                      borderRadius: 24,
                      padding: 24,
                      textAlign: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                      marginBottom: 24
                    }}>
                      <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ fontSize: 72, fontWeight: 950, color: theme.accent, lineHeight: 1, animation: 'numberPop 4s ease-in-out infinite', opacity: 0, letterSpacing: -2 }}>98</div>
                        <div style={{ fontSize: 10, fontWeight: 900, color: theme.text, marginTop: 4, letterSpacing: 2 }}>CORE WEB VITALS</div>
                      </div>
                      {/* Subtle internal grid for the score card */}
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: `radial-gradient(${theme.border} 1px, transparent 1px)`, backgroundSize: '16px 16px', opacity: 0.2, pointerEvents: 'none' }} />
                    </div>

                    {/* 4. PROFESSIONAL AREA CHART */}
                    <div style={{ padding: '4px 8px' }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: theme.textMuted, marginBottom: 12, letterSpacing: 1 }}>AUDIT PERFORMANCE TREND</div>
                      <div style={{ position: 'relative', height: 80 }}>
                        <svg width="100%" height="100%" viewBox="0 0 100 40" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                          <defs>
                            <linearGradient id="area-bg" x1="1" y1="1" x2="0" y2="1">
                              <stop offset="0%" stopColor={theme.accent} />
                              <stop offset="100%" stopColor="transparent" />
                            </linearGradient>
                          </defs>

                          {/* Chart Grid Lines */}
                          {[10, 20, 30].map(y => (
                            <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                          ))}

                          {/* Area Fill */}
                          <path
                            d="M0 35 L 10 32 L 25 36 L 40 28 L 55 31 L 75 12 L 90 18 L 100 8 L 100 40 L 0 40 Z"
                            fill="url(#area-bg)"
                            opacity="0.15"
                            style={{ animation: 'revealArea 4s ease-in-out infinite' }}
                          />

                          {/* Main Stroke */}
                          <path
                            d="M0 35 L 10 32 L 25 36 L 40 28 L 55 31 L 75 12 L 90 18 L 100 8"
                            fill="none"
                            stroke={theme.accent}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ strokeDasharray: 117, strokeDashoffset: 117, animation: 'lineDraw 4s ease-in-out infinite' }}
                          />

                          {/* Pulsing Data Node Following the Line */}
                          <g style={{
                            offsetPath: 'path("M0 35 L 10 32 L 25 36 L 40 28 L 55 31 L 75 12 L 90 18 L 100 8")',
                            animation: 'moveNode 4s ease-in-out infinite',
                            position: 'absolute'
                          }}>
                            <circle cx="0" cy="0" r="3" fill="#fff" />
                            <circle cx="0" cy="0" r="3" fill={theme.accent} style={{ animation: 'dataPointPulse 2s linear infinite', transformBox: 'fill-box', transformOrigin: 'center' }} />
                          </g>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CORE FEATURES */}
        <section style={{ padding: '150px 0', position: 'relative' }}>
          {/* Background Glow */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', height: '80%', background: 'radial-gradient(circle, rgba(200, 240, 105, 0.03) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />

          <div style={{ textAlign: 'center', marginBottom: 80, position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 100, border: `1px solid ${theme.border}`, background: theme.surfaceGlow, color: theme.accent, fontSize: 13, fontWeight: 700, marginBottom: 20 }}>
              ✨ Core Features
            </div>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, margin: '0 0 20px 0', letterSpacing: '-0.02em' }}>The ultimate QA toolkit</h2>
            <p style={{ color: theme.textMuted, fontSize: 18, maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>Everything you need to ensure your application is fast, accessible, and reliable.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 32, position: 'relative', zIndex: 1 }}>
            {/* CARD 1: RECORD & REPLAY */}
            <div className="feature-card" style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 24, padding: 40, display: 'flex', flexDirection: 'column', gap: 32 }}>
              <div className="shine-element" style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '50%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)', pointerEvents: 'none' }} />

              <div style={{ position: 'relative', height: 180, background: '#080C09', borderRadius: 16, border: `1px solid ${theme.border}`, padding: 20, overflow: 'hidden' }} className="preview-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f56' }} />
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffbd2e' }} />
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#27c93f' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', animation: 'recDot 1.5s infinite' }} />
                    <span style={{ fontSize: 10, fontWeight: 900, color: '#EF4444', letterSpacing: 1 }}>REC</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { cmd: 'CLICK', target: 'Login Button', color: theme.accent },
                    { cmd: 'TYPE', target: '"user@test.ai"', color: theme.text },
                    { cmd: 'ASSERT', target: 'Dashboard Visible', color: '#10B981' }
                  ].map((step, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)', opacity: 0, animation: `staggerIn 0.5s ease-out ${i * 0.2}s forwards` }}>
                      <span style={{ fontSize: 9, fontWeight: 900, color: step.color, background: `${step.color}15`, padding: '2px 6px', borderRadius: 4, width: 45, textAlign: 'center' }}>{step.cmd}</span>
                      <span style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'monospace' }}>{step.target}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ width: 48, height: 48, background: 'rgba(200,240,105,0.1)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 20, border: '1px solid rgba(200,240,105,0.2)' }}>🎥</div>
                <h3 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 12px 0' }}>Record & Replay</h3>
                <p style={{ color: theme.textMuted, fontSize: 16, lineHeight: 1.6, margin: 0 }}>Capture real user flows and turn them into reliable automated tests.</p>
              </div>
            </div>

            {/* CARD 2: SMART SUGGESTIONS */}
            <div className="feature-card" style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 24, padding: 40, display: 'flex', flexDirection: 'column', gap: 32 }}>
              <div className="shine-element" style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '50%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)', pointerEvents: 'none' }} />

              <div style={{ position: 'relative', height: 180, background: '#080C09', borderRadius: 16, border: `1px solid ${theme.border}`, padding: 20, overflow: 'hidden' }} className="preview-container">

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: theme.accent, animation: 'recDot 1.5s infinite' }} />
                  <span style={{ fontSize: 10, fontWeight: 900, color: theme.accent, letterSpacing: 1 }}>AI SCANNING...</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>  {[
                  { label: 'Checkout flow edge cases', tag: 'Logic', color: '#8B5CF6' },
                  { label: 'Broken auth recovery path', tag: 'Auth', color: '#F59E0B' },
                  { label: 'Missing alt text on hero', tag: 'A11y', color: '#10B981' }
                ].map((sug, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: 0, animation: `staggerIn 0.5s ease-out ${i * 0.3}s forwards` }}>
                    <span style={{ fontSize: 12, color: theme.text }}>{sug.label}</span>
                    <span style={{ fontSize: 9, fontWeight: 800, color: sug.color, border: `1px solid ${sug.color}40`, padding: '2px 8px', borderRadius: 100 }}>{sug.tag}</span>
                  </div>
                ))}
                </div>
              </div>

              <div>
                <div style={{ width: 48, height: 48, background: 'rgba(200,240,105,0.1)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 20, border: '1px solid rgba(200,240,105,0.2)' }}>🧠</div>
                <h3 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 12px 0' }}>Smart Suggestions</h3>
                <p style={{ color: theme.textMuted, fontSize: 16, lineHeight: 1.6, margin: 0 }}>AI generates critical test cases and edge scenarios instantly.</p>
              </div>
            </div>

            {/* CARD 3: SITE AUDIT ENGINE */}
            <div className="feature-card" style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 24, padding: 40, display: 'flex', flexDirection: 'column', gap: 32 }}>
              <div className="shine-element" style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '50%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)', pointerEvents: 'none' }} />

              <div style={{ position: 'relative', height: 180, background: '#080C09', borderRadius: 16, border: `1px solid ${theme.border}`, padding: 20, overflow: 'hidden' }} className="preview-container">
                <div style={{ display: 'flex', gap: 20, height: '100%', alignItems: 'center' }}>
                  <div style={{ flex: '0 0 80px', height: 80, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="80" height="80" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
                      <circle cx="40" cy="40" r="34" stroke="rgba(200,240,105,0.1)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke={theme.accent} strokeWidth="6" fill="none" strokeDasharray="195" strokeDashoffset="21" strokeLinecap="round" style={{ transition: 'stroke-dashoffset 2s' }} />
                    </svg>
                    <div style={{ fontSize: 24, fontWeight: 900, color: theme.accent }}>81</div>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { label: 'Perf', val: 80, color: '#10B981' },
                      { label: 'Acc', val: 64, color: theme.accent },
                      { label: 'SEO', val: 100, color: '#3B82F6' }
                    ].map((m, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontWeight: 800, color: theme.textMuted, marginBottom: 4 }}>
                          <span>{m.label}</span>
                          <span style={{ color: m.color }}>{m.val}%</span>
                        </div>
                        <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 100, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${m.val}%`, background: m.color, borderRadius: 100, animation: 'fillProgress 2s ease-out forwards' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ width: 48, height: 48, background: 'rgba(200,240,105,0.1)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 20, border: '1px solid rgba(200,240,105,0.2)' }}>⚙️</div>
                <h3 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 12px 0' }}>Site Audit Engine</h3>
                <p style={{ color: theme.textMuted, fontSize: 16, lineHeight: 1.6, margin: 0 }}>Analyze performance, accessibility, and SEO with actionable insights.</p>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section style={{ padding: '80px 0', borderTop: `1px solid ${theme.border}` }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, margin: '0 0 16px 0' }}>How it works</h2>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
            {/* Base line */}
            <div style={{ position: 'absolute', top: 24, left: '16.6%', right: '16.6%', height: 2, background: theme.border, zIndex: 0 }} />
            {/* Progress line */}
            <div style={{ position: 'absolute', top: 24, left: '16.6%', width: `${activeStep * 33.33}%`, height: 2, background: theme.accent, zIndex: 0, transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 0 10px rgba(200,240,105,0.5)' }} />

            {[
              { step: '1', title: 'Connect App', desc: 'Enter your target URL or localhost port.' },
              { step: '2', title: 'Engage Engine', desc: 'Run smart scanners or click through your flows.' },
              { step: '3', title: 'Get Insights', desc: 'Instantly view test results, audits, and fixes.' },
            ].map((w, i) => {
              const isActive = activeStep === i;
              const isPast = activeStep > i;

              return (
                <div key={i} style={{ flex: 1, textAlign: 'center', position: 'relative', zIndex: 1, padding: '0 20px', transition: 'all 0.5s' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: isActive ? theme.accent : theme.bg,
                    border: `2px solid ${isActive || isPast ? theme.accent : theme.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, fontWeight: 800,
                    color: isActive ? '#000' : isActive || isPast ? theme.accent : theme.textMuted,
                    margin: '0 auto 20px',
                    boxShadow: isActive ? `0 0 25px rgba(200,240,105,0.5)` : 'none',
                    transform: isActive ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}>
                    {isPast ? '✓' : w.step}
                  </div>
                  <h4 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px 0', color: isActive ? theme.accent : theme.text, transition: 'color 0.3s' }}>{w.title}</h4>
                  <p style={{ fontSize: 14, color: isActive ? theme.text : theme.textMuted, margin: 0, transition: 'color 0.3s' }}>{w.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Interactive Visuals Container */}
          <div style={{ marginTop: 60, height: 320, background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 24, padding: 32, position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

            {/* STEP 0: Connect App */}
            <div style={{ position: 'absolute', opacity: activeStep === 0 ? 1 : 0, transform: activeStep === 0 ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.6s', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 600 }}>
              <div style={{ width: '100%', height: 56, background: theme.bg, borderRadius: 28, border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', padding: '0 8px 0 24px', gap: 16 }}>
                <div style={{ color: theme.textMuted, fontSize: 18 }}>🔒</div>
                <div style={{ flex: 1, display: 'flex' }}>
                  <div style={{ color: theme.accent, fontFamily: 'monospace', fontSize: 18, overflow: 'hidden', whiteSpace: 'nowrap', borderRight: `2px solid ${theme.accent}`, width: 'max-content', maxWidth: activeStep === 0 ? '26ch' : '0', animation: activeStep === 0 ? 'typing 2.5s steps(30, end) forwards' : 'none' }}>
                    https://app.testpilot.ai
                  </div>
                </div>
                <div style={{ background: theme.accent, color: '#000', padding: '8px 24px', borderRadius: 20, fontSize: 14, fontWeight: 700, animation: activeStep === 0 ? 'buttonClickFlash 4.5s infinite' : 'none', flexShrink: 0 }}>
                  Run Test
                </div>
              </div>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ position: 'absolute', top: 0, left: 0, zIndex: 10, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))', animation: activeStep === 0 ? 'cursorSequence 4.5s infinite' : 'none', opacity: 0 }}>
                <path d="M19.5 12h-1.5v-3.5C18 7.12 16.88 6 15.5 6s-2.5 1.12-2.5 2.5V9h-1V5.5C12 4.12 10.88 3 9.5 3s-2.5 1.12-2.5 2.5v7.26l-1.78-.36a2.022 2.022 0 0 0-2.31.84L2.5 14.28 6.92 20C8.28 21.03 9.5 22 11.11 22h4.89c2.31 0 4.25-1.68 4.47-3.97l.5-5.51C21.11 11.14 20.07 10 18.69 10h-.19z" fill="white" stroke="black" strokeWidth="1" strokeLinejoin="round" />
              </svg>
              <div style={{ marginTop: 40, display: 'flex', gap: 24 }}>
                <div style={{ width: 140, height: 90, background: 'rgba(200,240,105,0.03)', borderRadius: 16, border: `1px solid ${theme.border}` }} />
                <div style={{ width: 140, height: 90, background: 'rgba(200,240,105,0.03)', borderRadius: 16, border: `1px solid ${theme.border}` }} />
                <div style={{ width: 140, height: 90, background: 'rgba(200,240,105,0.03)', borderRadius: 16, border: `1px solid ${theme.border}` }} />
              </div>
            </div>

            {/* STEP 1: Engage Engine */}
            <div style={{ position: 'absolute', opacity: activeStep === 1 ? 1 : 0, transform: activeStep === 1 ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.6s', width: '100%', maxWidth: 700, pointerEvents: 'none' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { name: 'Auth Flow', stats: '24 nodes checked', score: 100, delay: '0s' },
                  { name: 'Checkout Flow', stats: '8 interactables found', score: 98, delay: '0.4s' },
                  { name: 'Hero Header', stats: 'LCP: 1.2s (Passed)', score: 99, delay: '0.8s' },
                  { name: 'SEO Audit', stats: 'Meta tags optimized', score: 100, delay: '1.2s' }
                ].map((test, i) => (
                  <div key={i} style={{
                    padding: '16px 20px',
                    background: 'rgba(255,255,255,0.02)',
                    border: `1px solid ${theme.border}`,
                    borderRadius: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    position: 'relative',
                    overflow: 'hidden',
                    animation: activeStep === 1 ? `staggerIn 0.5s ease-out ${test.delay} forwards` : 'none',
                    opacity: 0
                  }}>
                    {/* Scanning pulse */}
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      height: 1,
                      width: '100%',
                      background: theme.accent,
                      animation: activeStep === 1 ? `scanLine 2s ease-in-out ${test.delay} infinite` : 'none',
                      transformOrigin: 'left'
                    }} />

                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: theme.accent, color: '#000',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 800,
                      animation: activeStep === 1 ? `checkPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${parseFloat(test.delay) + 0.5}s forwards` : 'none',
                      transform: 'scale(0)'
                    }}>
                      ✓
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>{test.name}</div>
                      <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2, fontFamily: 'monospace' }}>{test.stats}</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: theme.accent, opacity: 0.8 }}>
                      {test.score}%
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: theme.textMuted, fontStyle: 'italic' }}>
                AI Model generating Playwright scripts... ⚡
              </div>
            </div>

            {/* STEP 3: Get Insights */}
            <div style={{ position: 'absolute', top: -32, left: -32, width: 'calc(100% + 64px)', height: 'calc(100% + 64px)', opacity: activeStep === 2 ? 1 : 0, transition: 'all 0.6s', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'rgba(11, 15, 12, 0.3)', backdropFilter: 'blur(12px)', zIndex: 10 }}>

              {/* Inner Card (Centered with margins) */}
              <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 40, alignItems: 'center', width: '90%', maxWidth: 660, height: 260, padding: '24px 32px', position: 'relative', background: 'rgba(0, 0, 0, 0)', border: `none` }}>

                {/* Background Glass Sparkle */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', background: 'linear-gradient(rgba(200, 240, 105, 0.05), transparent 80%)', borderRadius: 28 }} />

                {/* 1. LEFT: SCORE RING */}
                <div style={{ flex: '0 0 160px', textAlign: 'center', position: 'relative' }}>
                  <div style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Outer Pulsing Glow */}
                    <div style={{ position: 'absolute', width: '90%', height: '90%', borderRadius: '50%', background: `radial-gradient(circle, ${theme.accent}22 0%, transparent 70%)`, animation: 'glowPulse 3s infinite', pointerEvents: 'none' }} />

                    {/* SVG Ring */}
                    <svg style={{ position: 'absolute', top: 0, left: 0, width: 160, height: 160, transform: 'rotate(-90deg)' }}>
                      {/* Ring Path bg */}
                      <circle cx="80" cy="80" r="68" stroke="rgba(255,255,255,0.05)" strokeWidth="10" fill="none" />
                      {/* Progress Circle */}
                      <circle cx="80" cy="80" r="68" stroke={theme.accent} strokeWidth="10" fill="none" strokeDasharray="427" strokeDashoffset={activeStep === 2 ? 427 - (427 * 0.92) : 427} style={{ transition: 'stroke-dashoffset 2s cubic-bezier(0.4, 0, 0.2, 1) 0.5s', strokeLinecap: 'round' }} />
                    </svg>

                    {/* Score Content */}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <div style={{ fontSize: 48, fontWeight: 950, color: theme.accent, lineHeight: 1 }}>{auditScore}</div>
                      <div style={{ fontSize: 8, fontWeight: 900, color: theme.textMuted, letterSpacing: 2, marginTop: 4 }}>TOTAL</div>
                    </div>
                  </div>

                  {/* Status Label below ring */}
                  <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 100, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981' }} />
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#10B981' }}>GOOD STATUS</span>
                  </div>
                </div>

                {/* 2. RIGHT: METRICS PANEL */}
                <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
                  {/* Subtle Background Trend Graph */}
                  <svg width="100%" height="80" style={{ position: 'absolute', top: 20, left: 0, opacity: 0.08, pointerEvents: 'none', filter: 'blur(2px)' }}>
                    <path
                      d="M0 60 Q 30 40, 60 50 T 120 20 T 180 30 T 240 10"
                      fill="none" stroke={theme.accent} strokeWidth="2"
                      strokeDasharray="400" strokeDashoffset={activeStep === 2 ? 0 : 400}
                      style={{ transition: 'stroke-dashoffset 4s ease-out 0.5s', strokeLinecap: 'round' }}
                    />
                  </svg>
                  {/* Mini Trend Line (Animated Background) */}
                  <div style={{ position: 'relative', marginBottom: 16, paddingBottom: 8, borderBottom: `1px solid ${theme.border}` }}>
                    <div style={{ fontSize: 10, fontWeight: 900, color: theme.textMuted, letterSpacing: 1.5, marginBottom: 8 }}>REAL-TIME ANALYSIS</div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[
                        { label: 'Performance', icon: '⚡', val: 95, color: '#10B981', micro: 'Fast', delay: '0.1s' },
                        { label: 'Accessibility', icon: '♿', val: 100, color: theme.accent, micro: 'Pass', delay: '0.3s' },
                        { label: 'SEO Speed', icon: '🔍', val: 82, color: '#F59E0B', micro: 'Alert', delay: '0.5s' }
                      ].map(metric => (
                        <div key={metric.label}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 11 }}>{metric.icon}</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: theme.text }}>{metric.label}</span>
                              <span style={{ fontSize: 8, fontWeight: 900, color: theme.textMuted, background: 'rgba(255,255,255,0.03)', padding: '1px 5px', borderRadius: 3 }}>{metric.micro.toUpperCase()}</span>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 800, color: metric.color }}>{activeStep === 2 ? metric.val : 0}</span>
                          </div>
                          <div style={{ height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 100, overflow: 'hidden' }}>
                            <div style={{ width: activeStep === 2 ? `${metric.val}%` : '0%', height: '100%', background: metric.color, borderRadius: 100, transition: `width 1.5s cubic-bezier(0.4, 0, 0.2, 1) ${metric.delay}` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. INSIGHT TAGS */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {[
                      { text: 'Access: Pass', type: 'success', delay: '1s' },
                      { text: 'Images: Optz', type: 'warn', delay: '1.2s' },
                      { text: 'FCP: 1.2s', type: 'success', delay: '1.4s' }
                    ].map((tag, i) => (
                      <div key={i} style={{
                        fontSize: 9, fontWeight: 800,
                        padding: '4px 10px', borderRadius: 6,
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: tag.type === 'success' ? 'rgba(200, 240, 105, 0.05)' : 'rgba(245, 158, 11, 0.05)',
                        border: `1px solid ${tag.type === 'success' ? 'rgba(200, 240, 105, 0.1)' : 'rgba(245, 158, 11, 0.1)'}`,
                        color: tag.type === 'success' ? theme.accent : '#F59E0B',
                        animation: activeStep === 2 ? `insightTagPop 0.5s ease-out ${tag.delay} forwards` : 'none',
                        opacity: 0
                      }}>
                        {tag.type === 'success' ? '✔' : '⚠'} {tag.text}
                      </div>
                    ))}
                  </div>

                  {/* Mini Actions */}
                  <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 9, color: theme.textMuted, fontStyle: 'italic', opacity: 0.6 }}>Live Snapshot v2.0</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: theme.accent, display: 'flex', alignItems: 'center', gap: 4, opacity: 0.8 }}>
                      View full report <span>→</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DIFFERENTIATOR */}
        <section style={{ padding: '150px 0', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', height: '100%', background: 'radial-gradient(circle, rgba(200, 240, 105, 0.02) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, margin: '0 0 20px 0', letterSpacing: '-0.02em' }}>
              Stop fighting your <span style={{ color: theme.accent }}>QA tools.</span>
            </h2>
            <p style={{ color: theme.textMuted, fontSize: 18, maxWidth: 650, margin: '0 auto', lineHeight: 1.6 }}>
              Traditional QA setups are fragile, expensive, and slow. TestPilot AI replaces them with an intelligent, zero-maintenance system that ships with you.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 0, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>

            {/* TRADITIONAL QA CARD */}
            <div style={{
              flex: '1',
              minWidth: 340,
              maxWidth: 440,
              background: 'rgba(255, 255, 255, 0.01)',
              border: `1px solid rgba(255, 255, 255, 0.05)`,
              borderRadius: '24px',
              padding: 48,
              opacity: 0.6,
              filter: 'grayscale(0.5)'
            }}>
              <div style={{ color: '#EF4444', fontSize: 12, fontWeight: 900, letterSpacing: 1.5, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} /> TRADITIONAL QA
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 32 }}>Fragmented & Fragile</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {[
                  'Weeks of manual setup',
                  'Flaky element selectors',
                  'High maintenance overhead',
                  'Multiple tools required'
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, color: theme.textMuted }}>
                    <span style={{ color: '#EF4444', fontSize: 14 }}>✕</span>
                    <span style={{ fontSize: 16 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* DIVIDER TRANSFORM */}
            <div style={{
              width: 120,
              height: 120,
              background: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: '50%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 10,
              margin: '0 -30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: theme.accent }}>10x</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: theme.textMuted }}>FASTER</div>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ marginTop: 4 }}>
                <path d="M5 12h14m-7-7l7 7-7 7" stroke={theme.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* TESTPILOT AI CARD */}
            <div className="diff-card diff-card-tp" style={{
              flex: '1',
              minWidth: 360,
              maxWidth: 480,
              background: 'rgba(200, 240, 105, 0.02)',
              border: `1px solid ${theme.accent}33`,
              borderRadius: 24,
              padding: 48,
              position: 'relative',
              boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
              zIndex: 1
            }}>
              <div style={{ color: theme.accent, fontSize: 12, fontWeight: 900, letterSpacing: 1.5, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.accent, boxShadow: `0 0 10px ${theme.accent}` }} /> TESTPILOT AI
              </div>
              <h3 style={{ fontSize: 28, fontWeight: 800, marginBottom: 32 }}>Intelligent & Unified</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 40 }}>
                {[
                  'Ready in seconds (Zero Config)',
                  'AI auto-healing element selectors',
                  'Unified Testing, Audit & SEO',
                  'Automated Playwright generation'
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ color: theme.accent, fontSize: 14 }}>✔</span>
                    <span style={{ fontSize: 16, fontWeight: 500 }}>{item}</span>
                  </div>
                ))}
              </div>

              {/* MINI SPEED VISUAL */}
              <div style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${theme.border}`, borderRadius: 16, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800, color: theme.textMuted, marginBottom: 12 }}>
                  <span>SETUP TIME</span>
                  <span style={{ color: theme.accent }}>92% FASTER</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 100, overflow: 'hidden' }}>
                  <div style={{ width: '0%', height: '100%', background: theme.accent, borderRadius: 100, animation: 'speedBarGrow 3s ease-out forwards' }} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '6px 20px', borderRadius: 100, border: `1px solid ${theme.border}`, background: theme.surfaceGlow,letterSpacing: 1.5, color: theme.accent, fontSize: 13, fontWeight: 500, margin: '50px auto 0', width: 'fit-content', opacity: 0.6 }}>
            Built for modern developers and fast-moving teams.
          </div>
        </section>
      </main>

      {/* FINAL CTA SECTION */}
      <section style={{ 
        position: 'relative', 
        padding: '160px 24px 100px', 
        textAlign: 'center', 
        overflow: 'hidden',
        background: `radial-gradient(circle at center, rgba(200,240,105,0.08) 0%, transparent 70%)`
      }}>
        {/* Animated Grid Background */}
        <div style={{ 
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundImage: `linear-gradient(rgba(200,240,105,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(200,240,105,0.03) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at center, black, transparent 80%)',
          animation: 'gridFlow 20s linear infinite',
          zIndex: 0
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto' }}>
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 100, 
            background: 'rgba(200,240,105,0.1)', border: '1px solid rgba(200,240,105,0.2)',
            color: theme.accent, fontSize: 13, fontWeight: 700, letterSpacing: 1.5, marginBottom: 32, textTransform: 'uppercase'
          }}>
            ⚡ Ready to elevate your QA?
          </div>
          
          <h2 style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 800, lineHeight: 1.1, margin: '0 0 32px 0', letterSpacing: '-0.03em' }}>
            Stop guessing.<br />
            <span style={{ color: theme.accent }}>Start testing.</span>
          </h2>
          
          <p style={{ fontSize: 'clamp(18px, 1.5vw, 22px)', color: theme.textMuted, marginBottom: 48, lineHeight: 1.6, maxWidth: 600, margin: '0 auto 48px' }}>
            Automate your QA, uncover issues instantly, and ship with confidence — all in one platform.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button 
                onClick={isAuthenticated ? onGoToApp : onGetStarted}
                className="footer-btn-primary"
                style={{ 
                  background: theme.accent, color: '#000', border: 'none', padding: '18px 40px', borderRadius: 100, 
                  fontSize: 18, fontWeight: 700, cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 0 20px rgba(200,240,105,0.3)', display: 'flex', alignItems: 'center', gap: 8
                }}>
                {isAuthenticated ? 'Go to Dashboard' : 'Start Testing Free'} <span>&rarr;</span>
              </button>
              
              <button 
                className="footer-btn-secondary"
                style={{ 
                  background: 'transparent', color: theme.text, border: `1px solid ${theme.border}`, padding: '18px 40px', borderRadius: 100, 
                  fontSize: 18, fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s', backdropFilter: 'blur(10px)'
                }}>
                Watch Demo
              </button>
            </div>
            
            <p style={{ fontSize: 14, color: theme.textMuted, opacity: 0.8 }}>
              {isAuthenticated ? 'Welcome back! Your dashboard is ready.' : 'No signup required • Works instantly on any URL'}
            </p>
          </div>

          <div style={{ 
            marginTop: 80, display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center',
            padding: '24px', borderRadius: 24, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)'
          }}>
            {['No setup required', 'Works with any website', 'Instant results'].map((text, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: theme.text }}>
                <span style={{ color: theme.accent }}>✔</span> {text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MINI FOOTER */}
      <footer style={{ borderTop: `1px solid ${theme.border}`, padding: '60px 24px 40px', background: theme.bg }}>
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
                    <a key={item} href="#" style={{ fontSize: 14, color: theme.textMuted, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = theme.accent} onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}>{item}</a>
                  ))}
                </div>
              </div>
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: theme.text, marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1 }}>Company</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {['About', 'Blog', 'Contact', 'Privacy'].map(item => (
                    <a key={item} href="#" style={{ fontSize: 14, color: theme.textMuted, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = theme.accent} onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}>{item}</a>
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

      {/* SCROLL TO TOP */}
      <button 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="scroll-top-btn"
        style={{
          position: 'fixed',
          bottom: 90,
          right: 90,
          width: 50,
          height: 50,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(15px)',
          border: `1px solid ${theme.border}`,
          color: theme.accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 100,
          opacity: showScrollTop ? 1 : 0,
          visibility: showScrollTop ? 'visible' : 'hidden',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m18 15-6-6-6 6"/>
        </svg>
      </button>
    </div>
  );
}
