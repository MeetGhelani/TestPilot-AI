import { useState, useEffect } from 'react'

interface SelectorMap { [key: string]: string }

interface Props {
  defaultUrl?: string
}

const ELEMENT_LABELS: Record<string, string> = {
  header: 'Header',
  footer: 'Footer',
  navigation: 'Navigation menu',
  logo: 'Logo',
  login_button: 'Login button',
  search_bar: 'Search bar',
  cart_icon: 'Cart icon',
  product_grid: 'Product grid',
  hero_banner: 'Hero / banner',
}

export default function SiteScanner({ defaultUrl = '' }: Props) {
  const [url, setUrl] = useState(defaultUrl)
  const [scanning, setScanning] = useState(false)
  const [useAuth, setUseAuth] = useState(false)
  const [authUser, setAuthUser] = useState('')
  const [authPass, setAuthPass] = useState('')
  const [selectors, setSelectors] = useState<SelectorMap>({})
  const [scannedAt, setScannedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('http://localhost:3001/api/selectors')
      .then(r => r.json())
      .then(data => { if (Object.keys(data).length) setSelectors(data) })
      .catch(() => {})
  }, [])

  const handleScan = async () => {
    if (!url.trim()) return
    setScanning(true)
    setError(null)
    try {
      const res = await fetch('http://localhost:3001/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), authUser: useAuth ? authUser : undefined, authPass: useAuth ? authPass : undefined }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSelectors(data.selectors)
      setScannedAt(data.scannedAt)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setScanning(false)
    }
  }

  const found = Object.keys(selectors).length
  const label: React.CSSProperties = { fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, display: 'block' }
  const input: React.CSSProperties = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontFamily: 'var(--font-sans)', fontSize: 13, outline: 'none' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400, lineHeight: 1.2 }}>
          Scan your<br /><em style={{ color: 'var(--accent)' }}>site selectors</em>
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 8 }}>
          Playwright visits your site and finds the real CSS selectors for each element automatically.
        </p>
      </div>

      <div>
        <label style={label}>Site URL</label>
        <input
          style={input}
          placeholder="https://username:password@yoursite.com"
          value={url}
          onChange={e => setUrl(e.target.value)}
        />
        <p style={{ color: 'var(--text3)', fontSize: 11, marginTop: 5 }}>Enter the site URL</p>
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: useAuth ? 12 : 0 }}>
          <div onClick={() => setUseAuth(!useAuth)} style={{ width: 36, height: 20, borderRadius: 10, background: useAuth ? 'var(--accent)' : 'var(--surface2)', border: '1px solid var(--border2)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: 2, left: useAuth ? 17 : 2, width: 14, height: 14, borderRadius: '50%', background: useAuth ? '#0f0f0f' : 'var(--text3)', transition: 'left 0.2s' }} />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>Site requires Basic Auth</span>
        </div>
        {useAuth && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 8 }}>
            <input style={input} placeholder="Username" value={authUser} onChange={e => setAuthUser(e.target.value)} />
            <input style={input} type="password" placeholder="Password" value={authPass} onChange={e => setAuthPass(e.target.value)} />
          </div>
        )}
      </div>

      <button
        onClick={handleScan}
        disabled={scanning || !url.trim()}
        style={{ padding: '13px 0', background: scanning ? 'var(--surface2)' : 'var(--accent)', border: 'none', borderRadius: 10, color: scanning ? 'var(--text3)' : '#0f0f0f', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, cursor: scanning ? 'not-allowed' : 'pointer', letterSpacing: 1, transition: 'all 0.2s' }}>
        {scanning ? '● SCANNING SITE...' : '⌕ SCAN SITE'}
      </button>

      {error && (
        <div style={{ padding: '10px 14px', background: '#f8717111', border: '1px solid #f8717133', borderRadius: 8, color: 'var(--fail)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
          {error}
        </div>
      )}

      {found > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: 1, textTransform: 'uppercase' }}>
              {found} elements found
            </span>
            {scannedAt && (
              <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
                {new Date(scannedAt).toLocaleTimeString()}
              </span>
            )}
          </div>

          {Object.entries(ELEMENT_LABELS).map(([key, label]) => {
            const selector = selectors[key]
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface)', border: `1px solid ${selector ? '#4ade8033' : 'var(--border)'}`, borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: selector ? 'var(--pass)' : 'var(--text3)', minWidth: 16 }}>
                  {selector ? '✓' : '–'}
                </span>
                <span style={{ fontSize: 13, minWidth: 130 }}>{label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: selector ? 'var(--text2)' : 'var(--text3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selector ?? 'not found'}
                </span>
              </div>
            )
          })}

          <div style={{ padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
            <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
              These selectors are saved and automatically used in all future tests. In your test description you can now say <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: 11 }}>"verify header is visible"</span> and the tool will use the exact selector found on your site.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
