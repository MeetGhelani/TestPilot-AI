import { useState } from 'react'
import type { Platform } from '../App'

interface Props {
  onRun: (platform: Platform, url: string, test: string, headless: boolean, authUser?: string, authPass?: string) => void
  running: boolean
}

const EXAMPLES = [
  'verify header is visible, verify footer is visible, scroll to bottom, take screenshot',
  'verify email field is visible, fill email with "user@test.com", fill password with "pass123", click sign in, take screenshot',
  'verify navigation is visible, verify logo is visible, take screenshot',
]

export default function TestForm({ onRun, running }: Props) {
  const [platform, setPlatform] = useState<Platform>('web')
  const [url, setUrl] = useState('')
  const [test, setTest] = useState('')
  const [headless, setHeadless] = useState(true)
  const [useAuth, setUseAuth] = useState(false)
  const [authUser, setAuthUser] = useState('')
  const [authPass, setAuthPass] = useState('')

  const handleSubmit = () => {
    if (!url.trim() || !test.trim()) return
    onRun(platform, url.trim(), test.trim(), headless, useAuth ? authUser : undefined, useAuth ? authPass : undefined)
  }

  const label: React.CSSProperties = { fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, display: 'block' }
  const input: React.CSSProperties = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontFamily: 'var(--font-sans)', fontSize: 13, outline: 'none' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400, lineHeight: 1.2 }}>
          What do you<br /><em style={{ color: 'var(--accent)' }}>want to test?</em>
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 8 }}>Describe your test in plain English</p>
      </div>

      {/* Platform */}
      <div>
        <label style={label}>Platform</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['web', 'mobile', 'desktop'] as Platform[]).map(p => (
            <button key={p} onClick={() => setPlatform(p)} style={{ flex: 1, padding: '8px 0', background: platform === p ? 'var(--accent)' : 'var(--surface2)', border: `1px solid ${platform === p ? 'var(--accent)' : 'var(--border2)'}`, borderRadius: 8, color: platform === p ? '#0f0f0f' : 'var(--text2)', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer', fontWeight: platform === p ? 500 : 400, transition: 'all 0.15s' }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* URL */}
      <div>
        <label style={label}>URL / Target</label>
        <input
          style={input}
          placeholder="https://username:password@yoursite.com"
          value={url}
          onChange={e => setUrl(e.target.value)}
        />
        <p style={{ color: 'var(--text3)', fontSize: 11, marginTop: 5 }}>Enter the site URL — no need to include credentials here</p>
      </div>

      {/* Basic Auth toggle */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: useAuth ? 12 : 0 }}>
          <div onClick={() => setUseAuth(!useAuth)} style={{ width: 36, height: 20, borderRadius: 10, background: useAuth ? 'var(--accent)' : 'var(--surface2)', border: '1px solid var(--border2)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: 2, left: useAuth ? 17 : 2, width: 14, height: 14, borderRadius: '50%', background: useAuth ? '#0f0f0f' : 'var(--text3)', transition: 'left 0.2s' }} />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>Site requires login / Basic Auth</span>
        </div>
        {useAuth && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 8 }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: 1, marginBottom: 2 }}>BASIC AUTH CREDENTIALS</div>
            <input style={{ ...input, marginBottom: 0 }} placeholder="Username" value={authUser} onChange={e => setAuthUser(e.target.value)} />
            <input style={{ ...input, marginBottom: 0 }} type="password" placeholder="Password" value={authPass} onChange={e => setAuthPass(e.target.value)} />
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>These are sent securely and never stored in the URL</p>
          </div>
        )}
      </div>

      {/* Test description */}
      <div>
        <label style={label}>Test description</label>
        <textarea
          style={{ ...input, minHeight: 120, resize: 'vertical', lineHeight: 1.6 }}
          placeholder="verify header is visible, scroll to bottom, take screenshot..."
          value={test}
          onChange={e => setTest(e.target.value)}
        />
      </div>

      {/* Examples */}
      <div>
        <label style={label}>Examples — click to use</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {EXAMPLES.map((ex, i) => (
            <button key={i} onClick={() => setTest(ex)} style={{ textAlign: 'left', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', color: 'var(--text3)', fontFamily: 'var(--font-sans)', fontSize: 11, cursor: 'pointer', lineHeight: 1.5, transition: 'all 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Headless toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div onClick={() => setHeadless(!headless)} style={{ width: 36, height: 20, borderRadius: 10, background: headless ? 'var(--accent)' : 'var(--surface2)', border: '1px solid var(--border2)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 2, left: headless ? 17 : 2, width: 14, height: 14, borderRadius: '50%', background: headless ? '#0f0f0f' : 'var(--text3)', transition: 'left 0.2s' }} />
        </div>
        <span style={{ color: 'var(--text2)', fontSize: 12 }}>Run headless (no browser window)</span>
      </div>

      {/* Run button */}
      <button
        onClick={handleSubmit}
        disabled={running || !url.trim() || !test.trim()}
        style={{ padding: '13px 0', background: running ? 'var(--surface2)' : 'var(--accent)', border: 'none', borderRadius: 10, color: running ? 'var(--text3)' : '#0f0f0f', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, cursor: running ? 'not-allowed' : 'pointer', letterSpacing: 1, transition: 'all 0.2s' }}>
        {running ? '● RUNNING...' : '▶ RUN TEST'}
      </button>
    </div>
  )
}
