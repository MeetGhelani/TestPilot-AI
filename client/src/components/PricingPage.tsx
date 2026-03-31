import { useState } from 'react';

interface PricingPageProps {
  onGetStarted: () => void;
  onUpgradePro: () => void;
}

const CHECK = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CROSS = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const faqs = [
  { q: 'Can I cancel anytime?', a: 'Yes, absolutely. You can cancel your subscription at any time with no questions asked. You\'ll continue to have access until the end of your billing period.' },
  { q: 'What happens after I hit my limit?', a: 'On the Free plan, test runs will be paused until the next billing cycle. You\'ll receive an in-app notification before you reach your limit so you can upgrade proactively.' },
  { q: 'Do unused test runs roll over?', a: 'No, unused test runs do not roll over to the next month. We recommend choosing a plan that fits your typical monthly usage.' },
  { q: 'Is there a free trial for Pro?', a: 'Yes! You get a 7-day free trial of the Pro plan when you sign up. No credit card required to start. You\'ll be prompted to add billing details before the trial ends.' },
  { q: 'Can I upgrade or downgrade anytime?', a: 'Yes. You can switch plans at any time. Upgrades take effect immediately and you\'ll be charged a prorated amount. Downgrades take effect at the next billing cycle.' },
];

const comparisonRows = [
  { feature: 'Test runs / month', free: '10', pro: '500', team: 'Unlimited' },
  { feature: 'Saved tests', free: '5', pro: 'Unlimited', team: 'Unlimited' },
  { feature: 'Site audit', free: 'Basic', pro: 'Full (Perf + A11y + SEO)', team: 'Full + Custom' },
  { feature: 'Test history & reports', free: false, pro: true, team: true },
  { feature: 'Screenshots', free: false, pro: true, team: true },
  { feature: 'Priority execution', free: false, pro: true, team: true },
  { feature: 'Team collaboration', free: false, pro: false, team: true },
  { feature: 'Shared test library', free: false, pro: false, team: true },
  { feature: 'API access', free: false, pro: false, team: true },
  { feature: 'Priority support', free: false, pro: false, team: true },
];

const values = [
  { icon: '⚡', title: 'Faster, reliable testing', desc: 'Automated test execution means zero manual overhead. Run hundreds of tests in minutes.' },
  { icon: '🔍', title: 'Deeper app insights', desc: 'Go beyond pass/fail. Understand performance, accessibility violations, and SEO gaps in one report.' },
  { icon: '🤖', title: 'Save time with AI', desc: 'Let AI suggest edge cases, generate Playwright scripts, and surface risks you might have missed.' },
  { icon: '🛡️', title: 'Catch bugs before users do', desc: 'Shift quality left. Find regressions in CI/CD before they ever reach production.' },
];

export default function PricingPage({ onGetStarted, onUpgradePro }: PricingPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const accent = '#a3e635';
  const accentDim = 'rgba(163,230,53,0.12)';
  const accentBorder = 'rgba(163,230,53,0.25)';
  const bg = '#0B0F0C';
  const surface = '#111714';
  const border = '#1a2118';
  const text = '#f0f4ed';
  const muted = '#6b7c69';
  const muted2 = '#9aad97';

  const animations = `
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(24px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes glowPulse {
      0%, 100% { box-shadow: 0 0 20px rgba(163,230,53,0.15), 0 0 40px rgba(163,230,53,0.05); }
      50%       { box-shadow: 0 0 40px rgba(163,230,53,0.25), 0 0 60px rgba(163,230,53,0.08); }
    }
    @keyframes shimmer {
      0%   { transform: translateX(-100%) skewX(-12deg); }
      100% { transform: translateX(200%)  skewX(-12deg); }
    }
    .pricing-card {
      transition: transform 0.35s cubic-bezier(0.4,0,0.2,1), box-shadow 0.35s cubic-bezier(0.4,0,0.2,1), border-color 0.35s;
    }
    .pricing-card:hover {
      transform: translateY(-6px);
    }
    .pricing-card-free:hover {
      box-shadow: 0 24px 60px rgba(0,0,0,0.5);
      border-color: rgba(163,230,53,0.2) !important;
    }
    .pricing-card-team:hover {
      box-shadow: 0 24px 60px rgba(0,0,0,0.5);
      border-color: var(--info) !important;
    }
    .faq-item {
      transition: background 0.2s, border-color 0.2s;
    }
    .faq-item:hover {
      background: rgba(163,230,53,0.03) !important;
      border-color: rgba(163,230,53,0.2) !important;
    }
    .value-card {
      transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), background 0.3s, border-color 0.3s;
    }
    .value-card:hover {
      transform: translateY(-4px);
      background: rgba(163,230,53,0.03) !important;
      border-color: rgba(163,230,53,0.2) !important;
    }
    .cta-btn-primary {
      transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
    }
    .cta-btn-primary:hover {
      transform: translateY(-2px) scale(1.03);
      box-shadow: 0 0 40px rgba(163,230,53,0.5) !important;
    }
    .cta-btn-secondary {
      transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
    }
    .cta-btn-secondary:hover {
      transform: translateY(-2px);
      background: rgba(255,255,255,0.07) !important;
      border-color: rgba(255,255,255,0.25) !important;
    }
    .comparison-row {
      transition: background 0.15s;
    }
    .comparison-row:hover {
      background: rgba(163,230,53,0.025) !important;
    }
  `;

  const renderCell = (val: string | boolean) => {
    if (val === true) return <span style={{ color: accent, display: 'flex', justifyContent: 'center' }}>{CHECK}</span>;
    if (val === false) return <span style={{ color: muted, display: 'flex', justifyContent: 'center' }}>{CROSS}</span>;
    return <span style={{ fontSize: 13, color: muted2, textAlign: 'center', display: 'block' }}>{val}</span>;
  };

  return (
    <div style={{ background: bg, color: text, minHeight: '100vh', fontFamily: 'var(--font-sans)', overflowX: 'hidden' }}>
      <style>{animations}</style>

      {/* Background radial glows */}
      <div style={{ position: 'fixed', top: -300, left: '50%', transform: 'translateX(-50%)', width: 900, height: 900, background: 'radial-gradient(circle, rgba(163,230,53,0.04) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: -200, right: -200, width: 600, height: 600, background: 'radial-gradient(circle, rgba(0, 167, 209, 0.040) 0%, transparent 50%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>

        {/* ── HERO ── */}
        <section style={{ textAlign: 'center', padding: '96px 0 72px', animation: 'fadeUp 0.7s ease-out' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1px solid ${accentBorder}`, padding: '6px 18px', borderRadius: 100, fontSize: 12, fontWeight: 700, color: accent, marginBottom: 28, background: accentDim, letterSpacing: 1 }}>
            💳 SIMPLE, TRANSPARENT PRICING
          </div>
          <h1 style={{ fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', margin: '0 0 20px' }}>
            Simple pricing for<br />
            <span style={{ background: `linear-gradient(135deg, ${accent}, #86efac)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              powerful testing
            </span>
          </h1>
          <p style={{ fontSize: 18, color: muted2, maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.65 }}>
            Start free. Scale as your testing grows. No hidden fees, no surprise bills.
          </p>
          <button
            className="cta-btn-primary"
            onClick={onGetStarted}
            style={{ background: accent, color: '#000', border: 'none', padding: '14px 36px', borderRadius: 100, fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 24px rgba(163,230,53,0.3)' }}
          >
            Get Started Free →
          </button>
        </section>

        {/* ── PRICING CARDS ── */}
        <section style={{ padding: '0 0 96px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, alignItems: 'start' }}>

          {/* FREE */}
          <div className="pricing-card pricing-card-free" style={{ background: surface, border: `1px solid ${border}`, borderRadius: 24, padding: 36, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)' }} />
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: muted, letterSpacing: 2, marginBottom: 12 }}>FREE</div>
              <div style={{ fontSize: 48, fontWeight: 800, color: text, letterSpacing: '-0.03em' }}>₹0<span style={{ fontSize: 16, color: muted, fontWeight: 500 }}>/mo</span></div>
              <div style={{ fontSize: 14, color: muted2, marginTop: 6 }}>Perfect for side projects & exploration</div>
            </div>
            <button
              className="cta-btn-secondary"
              onClick={onGetStarted}
              style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'transparent', border: `1px solid ${border}`, color: text, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 32 }}
            >
              Get Started
            </button>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {['10 test runs / month', '5 saved tests', 'Basic site audit', 'Limited history (7 days)'].map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: muted2 }}>
                  <span style={{ color: accent, flexShrink: 0 }}>{CHECK}</span> {f}
                </li>
              ))}
            </ul>
          </div>

          {/* PRO — highlighted */}
          <div
            className="pricing-card"
            style={{
              background: 'linear-gradient(145deg, #0f1a0f, #0d1810)',
              border: `1.5px solid ${accentBorder}`,
              borderRadius: 24, padding: 36,
              position: 'relative', overflow: 'hidden',
              animation: 'glowPulse 4s ease-in-out infinite',
              marginTop: -16,
            }}
          >
            {/* Shimmer */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', borderRadius: 24, pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '40%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(163,230,53,0.04), transparent)', animation: 'shimmer 6s infinite ease-in-out' }} />
            </div>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />

            {/* Badge */}
            <div style={{ position: 'absolute', top: 20, right: 20, background: accent, color: '#000', fontSize: 10, fontWeight: 900, padding: '4px 10px', borderRadius: 100, letterSpacing: 1 }}>
              MOST POPULAR
            </div>

            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: accent, letterSpacing: 2, marginBottom: 12 }}>PRO</div>
              <div style={{ fontSize: 48, fontWeight: 800, color: text, letterSpacing: '-0.03em' }}>₹599<span style={{ fontSize: 16, color: muted, fontWeight: 500 }}>/mo</span></div>
              <div style={{ fontSize: 14, color: muted2, marginTop: 6 }}>For solo developers & power users</div>
            </div>
            <button
              className="cta-btn-primary"
              onClick={onUpgradePro}
              style={{ width: '100%', padding: '13px', borderRadius: 12, background: accent, border: 'none', color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 32, boxShadow: `0 0 20px rgba(163,230,53,0.3)` }}
            >
              Upgrade to Pro →
            </button>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                '500 test runs / month',
                'Unlimited saved tests',
                'Full audit (Perf + A11y + SEO)',
                'Test history & reports',
                'Screenshots on failure',
                'Priority execution queue',
              ].map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: muted2 }}>
                  <span style={{ color: accent, flexShrink: 0 }}>{CHECK}</span> {f}
                </li>
              ))}
            </ul>
          </div>

          {/* TEAM */}
          <div className="pricing-card pricing-card-team" style={{ background: surface, border: `1px solid ${border}`, borderRadius: 24, padding: 36, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, var(--info), transparent)' }} />
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--info)', letterSpacing: 2, marginBottom: 12 }}>TEAM</div>
              <div style={{ fontSize: 48, fontWeight: 800, color: text, letterSpacing: '-0.03em' }}>₹1,999<span style={{ fontSize: 16, color: muted, fontWeight: 500 }}>/mo</span></div>
              <div style={{ fontSize: 14, color: muted2, marginTop: 6 }}>For teams building at scale</div>
            </div>
            <button
              style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'transparent', border: '1px solid var(--info)', color: 'var(--info)', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 32, transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--info)'; e.currentTarget.style.color = '#000'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--info)'; }}
            >
              Contact Sales →
            </button>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                'Everything in Pro',
                'Team collaboration',
                'Shared test library',
                'API access (future-ready)',
                'Priority support',
                'Custom integrations',
              ].map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: muted2 }}>
                  <span style={{ color: 'var(--info)', flexShrink: 0 }}>{CHECK}</span> {f}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── COMPARISON TABLE ── */}
        <section style={{ padding: '0 0 96px' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 100, border: `1px solid ${border}`, color: muted2, fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>
              📊 FULL COMPARISON
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em' }}>Compare plans</h2>
            <p style={{ color: muted2, fontSize: 16 }}>See exactly what's included in each tier.</p>
          </div>

          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 20, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '20px 28px', borderBottom: `1px solid ${border}`, background: 'rgba(163,230,53,0.02)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: muted }}>Feature</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: muted, textAlign: 'center' }}>Free</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: accent, textAlign: 'center' }}>Pro</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--info)', textAlign: 'center' }}>Team</div>
            </div>

            {comparisonRows.map((row, i) => (
              <div
                key={row.feature}
                className="comparison-row"
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  padding: '16px 28px', alignItems: 'center',
                  borderBottom: i < comparisonRows.length - 1 ? `1px solid ${border}` : 'none',
                }}
              >
                <div style={{ fontSize: 14, color: text, fontWeight: 500 }}>{row.feature}</div>
                <div>{renderCell(row.free)}</div>
                <div>{renderCell(row.pro)}</div>
                <div>{renderCell(row.team)}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── VALUE SECTION ── */}
        <section style={{ padding: '0 0 96px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 100, border: `1px solid ${border}`, color: muted2, fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>
              🚀 WHY UPGRADE
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em' }}>Built for developers who care about quality</h2>
            <p style={{ color: muted2, fontSize: 16, maxWidth: 520, margin: '0 auto' }}>TestPilot AI removes the friction between writing code and validating it.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {values.map(v => (
              <div key={v.title} className="value-card" style={{ background: surface, border: `1px solid ${border}`, borderRadius: 20, padding: 28 }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{v.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px', color: text }}>{v.title}</h3>
                <p style={{ fontSize: 14, color: muted2, lineHeight: 1.65, margin: 0 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section style={{ padding: '0 0 96px', maxWidth: 720, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 100, border: `1px solid ${border}`, color: muted2, fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>
              ❓ FAQ
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em' }}>Frequently asked questions</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="faq-item"
                style={{ background: surface, border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px' }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: text }}>{faq.q}</span>
                  <svg
                    width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ color: muted2, flexShrink: 0, marginLeft: 16, transition: 'transform 0.25s', transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0)' }}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
                {openFaq === i && (
                  <div style={{ padding: '0 24px 20px', fontSize: 14, color: muted2, lineHeight: 1.7 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section style={{ padding: '0 0 96px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #0d1a0d, #111c14)',
            border: `1.5px solid ${accentBorder}`,
            borderRadius: 28, padding: '72px 48px',
            textAlign: 'center', position: 'relative', overflow: 'hidden',
          }}>
            {/* Top line */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
            {/* Background glow */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '60%', height: '60%', background: 'radial-gradient(circle, rgba(163,230,53,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.03em' }}>
                Start testing smarter today
              </h2>
              <p style={{ fontSize: 17, color: muted2, margin: '0 auto 40px', maxWidth: 480, lineHeight: 1.6 }}>
                Join developers who ship with confidence. Free forever. Upgrade when you need more.
              </p>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  className="cta-btn-primary"
                  onClick={onGetStarted}
                  style={{ background: accent, color: '#000', border: 'none', padding: '16px 40px', borderRadius: 100, fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 24px rgba(163,230,53,0.35)' }}
                >
                  Get Started Free
                </button>
                <button
                  className="cta-btn-secondary"
                  onClick={onUpgradePro}
                  style={{ background: 'rgba(255,255,255,0.04)', color: text, border: `1px solid ${border}`, padding: '16px 40px', borderRadius: 100, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
                >
                  Upgrade to Pro
                </button>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
