import { useState } from 'react'

interface Props {
  src: string
  alt?: string
}

export default function ScreenshotViewer({ src, alt = 'screenshot' }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <div
        onClick={() => setExpanded(true)}
        style={{ marginTop: 10, cursor: 'zoom-in', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}
      >
        <img
          src={src}
          alt={alt}
          style={{ width: '100%', display: 'block', transition: 'opacity 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        />
        <div style={{ padding: '5px 10px', background: 'var(--surface2)', borderTop: '1px solid var(--border)', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: 1 }}>
          CLICK TO EXPAND
        </div>
      </div>

      {expanded && (
        <div
          onClick={() => setExpanded(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000, cursor: 'zoom-out', padding: 24 }}
        >
          <img
            src={src}
            alt={alt}
            style={{ maxWidth: '92vw', maxHeight: '88vh', borderRadius: 8, border: '1px solid var(--border2)', boxShadow: '0 0 60px rgba(0,0,0,0.8)' }}
          />
          <p style={{ marginTop: 14, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: 1 }}>
            CLICK ANYWHERE TO CLOSE
          </p>
        </div>
      )}
    </>
  )
}
