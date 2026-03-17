import { useState } from 'react'
import type { TestResult, AuditResult, HistoryItem } from '../App'
import ScreenshotViewer from './ScreenshotViewer'

interface Props {
  history: HistoryItem[]
  onClear: () => void
}

export default function HistoryPanel({ history, onClear }: Props) {
  const [selected, setSelected] = useState<HistoryItem | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  if (history.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, opacity: 0.4 }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 48, fontStyle: 'italic', color: 'var(--text3)' }}>empty</div>
      <p style={{ color: 'var(--text3)', fontSize: 12 }}>No entries yet</p>
    </div>
  )

  const isAudit = (item: HistoryItem): item is AuditResult => 'type' in item && item.type === 'audit'

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

      {/* ── Left: history list ── */}
      <div style={{ width: 380, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>History</h2>
          <button
            onClick={() => setConfirmClear(true)}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 12px', color: 'var(--text3)', fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer', letterSpacing: 1 }}>
            CLEAR ALL
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...history].reverse().map((r, i) => {
            const isSelected = selected === r
            const audit = isAudit(r)
            const statusColor = r.status === 'passed' ? 'var(--pass)' : 'var(--fail)'
            const title = audit ? r.title : (r as TestResult).plan.naturalLanguageInput

            return (
              <div
                key={i}
                onClick={() => setSelected(isSelected ? null : r)}
                style={{ background: 'var(--surface)', border: `1px solid ${isSelected ? 'var(--border2)' : 'var(--border)'}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', transition: 'border-color 0.15s', borderLeft: isSelected ? `3px solid var(--accent)` : `1px solid var(--border)` }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--border2)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {audit && <span style={{ fontSize: 10, background: '#333', color: 'var(--accent)', padding: '1px 4px', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>AUDIT</span>}
                      {title.slice(0, 50)}{title.length > 50 ? '…' : ''}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {!audit && <span>{(r as TestResult).plan.platform}</span>}
                      {audit ? <span>Score: {r.totalScore}</span> : <span>{(r.totalDurationMs / 1000).toFixed(2)}s</span>}
                      <span>{new Date(audit ? r.timestamp : (r as TestResult).startedAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <div style={{ padding: '3px 10px', borderRadius: 20, background: r.status === 'passed' ? '#4ade8022' : '#f8717122', color: statusColor, fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 500, marginLeft: 10, flexShrink: 0 }}>
                    {r.status.toUpperCase()}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Right: selected result detail ── */}
      <div style={{ flex: 1 }}>
        {!selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, opacity: 0.35 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontStyle: 'italic', color: 'var(--text3)' }}>select an entry</div>
            <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 8 }}>Click any item on the left to view details</p>
          </div>
        ) : isAudit(selected) ? (
          /* Audit Detail View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
             <div style={{ padding: '20px 24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, marginBottom: 4 }}>{selected.title}</div>
                <div style={{ color: 'var(--text2)', fontSize: 12, display: 'flex', gap: 16 }}>
                  <span>Health Score: <b style={{ color: 'var(--accent)' }}>{selected.totalScore}</b></span>
                  <span>{new Date(selected.timestamp).toLocaleString()}</span>
                </div>
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {Object.entries(selected.categories).map(([name, cat]) => (
                  <div key={name} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                      <span style={{ textTransform: 'capitalize', color: 'var(--text2)' }}>{name}</span>
                      <span style={{ color: cat.score > 80 ? 'var(--pass)' : cat.score > 50 ? '#fbbf24' : 'var(--fail)', fontWeight: 600 }}>{cat.score}</span>
                    </div>
                    
                    {cat.metrics && Object.keys(cat.metrics).length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginBottom: 8 }}>
                        {Object.entries(cat.metrics).map(([label, val]) => (
                          <div key={label} style={{ fontSize: 10, color: 'var(--text3)' }}>
                            <span style={{ opacity: 0.7 }}>{label}:</span> {val}
                          </div>
                        ))}
                      </div>
                    )}

                    {cat.issues.length > 0 ? (
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{cat.issues.length} {cat.issues.length === 1 ? 'issue' : 'issues'} detected</div>
                    ) : (
                      <div style={{ fontSize: 11, color: 'var(--pass)' }}>All checks passed</div>
                    )}
                  </div>
                ))}
             </div>

             {Object.entries(selected.categories).map(([name, cat]) => (
               cat.issues.length > 0 && (
                 <div key={name} style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                   <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>{name} Issues</div>
                   {cat.issues.map((iss: any, i) => (
                     <div key={i} style={{ 
                       fontSize: 13, 
                       color: 'var(--text2)', 
                       background: '#111', 
                       padding: 12, 
                       borderRadius: 8, 
                       border: '1px solid #1a1a1a',
                       display: 'flex',
                       flexDirection: 'column',
                       gap: 6
                     }}>
                       <div style={{ display: 'flex', gap: 8, fontWeight: 600, color: 'var(--text)' }}>
                         <span style={{ color: iss.type === 'error' ? 'var(--fail)' : '#fbbf24' }}>●</span>
                         {iss.message}
                       </div>
                       {iss.impact && (
                         <div style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 18 }}>
                           <b>Impact:</b> {iss.impact}
                         </div>
                       )}
                       {iss.recommendation && (
                         <div style={{ fontSize: 12, color: 'var(--accent)', marginLeft: 18, background: '#1a1a1a', padding: '4px 8px', borderRadius: 4 }}>
                           <b>Fix:</b> {iss.recommendation}
                         </div>
                       )}
                     </div>
                   ))}
                 </div>
               )
             ))}
          </div>
        ) : (
          /* Test Detail View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Summary */}
            <div style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18 }}>{selected.plan.title}</div>
                  <div style={{ color: 'var(--text2)', fontSize: 11, fontFamily: 'var(--font-mono)', marginTop: 4, display: 'flex', gap: 14 }}>
                    <span>{selected.plan.platform}</span>
                    <span>{(selected.totalDurationMs / 1000).toFixed(2)}s</span>
                    <span>{new Date(selected.startedAt).toLocaleString()}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  {[
                    { label: 'PASS', val: selected.stepResults.filter(r => r.status === 'passed').length, color: 'var(--pass)' },
                    { label: 'FAIL', val: selected.stepResults.filter(r => r.status === 'failed').length, color: 'var(--fail)' },
                    { label: 'SKIP', val: selected.stepResults.filter(r => r.status === 'skipped').length, color: 'var(--text3)' },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 500, color }}>{val}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {selected.stepResults.map((r, i) => {
                const icon = r.status === 'passed' ? '✓' : r.status === 'failed' ? '✗' : '–'
                const color = r.status === 'passed' ? 'var(--pass)' : r.status === 'failed' ? 'var(--fail)' : 'var(--text3)'
                return (
                  <div key={i} style={{ background: 'var(--surface)', border: `1px solid ${r.status === 'failed' ? '#f8717133' : 'var(--border)'}`, borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span style={{ color, fontFamily: 'var(--font-mono)', minWidth: 14, marginTop: 1 }}>{icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13 }}>{i + 1}. {r.step.description}{r.step.optional && <span style={{ color: 'var(--text3)', marginLeft: 8, fontSize: 11, fontStyle: 'italic' }}>(Optional)</span>}</span>
                          <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{r.durationMs}ms</span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                          {r.step.action}{r.step.target ? ` › ${r.step.target}` : ''}{r.step.value ? ` = "${r.step.value}"` : ''}
                        </div>
                        {r.error && (
                          <div style={{ marginTop: 6, padding: '6px 10px', background: '#f8717111', borderLeft: '2px solid var(--fail)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fail)' }}>
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
            {selected.reportPath && (
              <a href={`http://localhost:3001${selected.reportPath}`} target="_blank" rel="noreferrer"
                style={{ display: 'block', textAlign: 'center', padding: '10px 0', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text2)', fontSize: 12, fontFamily: 'var(--font-mono)', textDecoration: 'none', letterSpacing: 1 }}>
                ↓ DOWNLOAD HTML REPORT
              </a>
            )}
          </div>
        )}
      </div>

      {/* ── Confirm clear all popup ── */}
      {confirmClear && (
        <div
          onClick={() => setConfirmClear(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: '28px 32px', width: 360, display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>Clear history?</div>
            <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6 }}>
              This will permanently delete entries. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmClear(false)}
                style={{ flex: 1, padding: '10px 0', background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text2)', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer' }}>
                CANCEL
              </button>
              <button
                onClick={() => { onClear(); setConfirmClear(false); setSelected(null) }}
                style={{ flex: 1, padding: '10px 0', background: '#f8717122', border: '1px solid #f8717144', borderRadius: 8, color: 'var(--fail)', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                DELETE ALL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
