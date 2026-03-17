import { useState } from 'react'
import type { TestResult } from '../App'
import ScreenshotViewer from './ScreenshotViewer'

interface Props {
  result: TestResult | null
  running: boolean
}

export default function ResultPanel({ result, running }: Props) {
  if (running) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '2px solid var(--border2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <p style={{ color: 'var(--text2)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Running test...</p>
    </div>
  )

  if (!result) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, opacity: 0.4 }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 48, fontStyle: 'italic', color: 'var(--text3)' }}>ready</div>
      <p style={{ color: 'var(--text3)', fontSize: 12 }}>Fill the form and click Run Test</p>
    </div>
  )

  const passed = result.stepResults.filter(r => r.status === 'passed').length
  const failed = result.stepResults.filter(r => r.status === 'failed').length
  const skipped = result.stepResults.filter(r => r.status === 'skipped').length
  const statusColor = result.status === 'passed' ? 'var(--pass)' : 'var(--fail)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18 }}>{result.plan.title}</div>
          <div style={{ color: 'var(--text2)', fontSize: 11, fontFamily: 'var(--font-mono)', marginTop: 3 }}>
            {result.plan.platform} · {(result.totalDurationMs / 1000).toFixed(2)}s · {new Date(result.startedAt).toLocaleTimeString()}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--pass)' }}>{passed}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>PASS</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--fail)' }}>{failed}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>FAIL</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--skip)' }}>{skipped}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>SKIP</div>
          </div>
          <div style={{ padding: '4px 12px', borderRadius: 20, background: result.status === 'passed' ? '#4ade8022' : '#f8717122', color: statusColor, fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
            {result.status.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {result.stepResults.map((r, i) => {
          const icon = r.status === 'passed' ? '✓' : r.status === 'failed' ? '✗' : '–'
          const color = r.status === 'passed' ? 'var(--pass)' : r.status === 'failed' ? 'var(--fail)' : 'var(--skip)'
          return (
            <div key={i} style={{ background: 'var(--surface)', border: `1px solid ${r.status === 'failed' ? '#f8717133' : 'var(--border)'}`, borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color, fontFamily: 'var(--font-mono)', fontSize: 13, minWidth: 16, marginTop: 1 }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 13 }}>{i + 1}. {r.step.description}{r.step.optional && <span style={{ color: 'var(--text3)', marginLeft: 8, fontSize: 11, fontStyle: 'italic' }}>(Optional)</span>}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginLeft: 12 }}>{r.durationMs}ms</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
                    {r.step.action}{r.step.target ? ` › ${r.step.target}` : ''}{r.step.value ? ` = "${r.step.value}"` : ''}
                  </div>
                  {r.error && (
                    <div style={{ marginTop: 8, padding: '8px 10px', background: '#f8717111', borderLeft: '2px solid var(--fail)', borderRadius: '0 4px 4px 0', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fail)' }}>
                      {r.error}
                    </div>
                  )}
                  {r.screenshotPath && (
                    <ScreenshotViewer src={`http://localhost:3001${r.screenshotPath}`} />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Download report */}
      {result.reportPath && (
        <a href={`http://localhost:3001${result.reportPath}`} target="_blank" rel="noreferrer"
          style={{ display: 'block', textAlign: 'center', padding: '10px 0', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text2)', fontSize: 12, fontFamily: 'var(--font-mono)', textDecoration: 'none', letterSpacing: 1 }}>
          ↓ DOWNLOAD HTML REPORT
        </a>
      )}


    </div>
  )
}
