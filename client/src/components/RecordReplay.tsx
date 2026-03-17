import { useState, useEffect, useRef } from 'react'
import type { TestResult } from '../App'
import StepEditor, { EditableStep } from './StepEditor'

interface Step { action: string; target?: string; value?: string; description: string }
interface RecordedTest { id: string; title: string; url: string; recordedAt: string; steps: Step[]; authUser?: string; authPass?: string }

const ICON: Record<string, string> = { navigate: '→', click: '↖', fill: '✎', select: '▾', scroll: '↕', wait: '⏱', screenshot: '⊡', default: '•' }

interface Props { onBusyChange?: (busy: boolean) => void }

export default function RecordReplay({ onBusyChange }: Props = {}) {
  const [url, setUrl] = useState('')
  const [useAuth, setUseAuth] = useState(false)
  const [authUser, setAuthUser] = useState('')
  const [authPass, setAuthPass] = useState('')
  const [title, setTitle] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [liveSteps, setLiveSteps] = useState<Step[]>([])
  const [recordings, setRecordings] = useState<RecordedTest[]>([])
  const [replaying, setReplaying] = useState<string | null>(null)
  const [replayProgress, setReplayProgress] = useState<{ currentStep: number; totalSteps: number; stepResults: any[] } | null>(null)
  const [replayResult, setReplayResult] = useState<TestResult | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [editingRecId, setEditingRecId] = useState<string | null>(null)
  const [editedSteps, setEditedSteps] = useState<EditableStep[]>([])
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const replayPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stepsEndRef = useRef<HTMLDivElement>(null)

  const fetchRecordings = async () => {
    try { const r = await fetch('http://localhost:3001/api/recordings'); setRecordings(await r.json()) } catch {}
  }

  useEffect(() => { fetchRecordings() }, [])
  useEffect(() => { stepsEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [liveSteps])

  useEffect(() => {
    if (isRecording) {
      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch('http://localhost:3001/api/record/status')
          const d = await r.json()
          setLiveSteps(d.steps ?? [])
          if (!d.isRecording) { setIsRecording(false); clearInterval(pollRef.current!) }
        } catch {}
      }, 800)
    } else {
      if (pollRef.current) clearInterval(pollRef.current)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [isRecording])

  const handleStart = async () => {
    if (!url.trim()) return
    setError(null); setMessage(null); setLiveSteps([]); setReplayResult(null)
    try {
      const res = await fetch('http://localhost:3001/api/record/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), authUser: useAuth && authUser.trim() ? authUser.trim() : undefined, authPass: useAuth && authPass.trim() ? authPass.trim() : undefined }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setIsRecording(true); onBusyChange?.(true)
      setMessage('Browser opened — use your site. Steps appear here instantly.')
    } catch (err) { setError(err instanceof Error ? err.message : String(err)) }
  }

  const handleStop = async () => {
    setError(null)
    try {
      const res = await fetch('http://localhost:3001/api/record/stop', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() || `Recording ${new Date().toLocaleString()}` }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setIsRecording(false); setLiveSteps([]); onBusyChange?.(false)
      setMessage(`Saved "${data.title}" — ${data.steps.length} steps.`)
      fetchRecordings()
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); setIsRecording(false) }
  }

  const handleCancel = async () => {
    await fetch('http://localhost:3001/api/record/cancel', { method: 'POST' })
    setIsRecording(false); setLiveSteps([]); setMessage(null); onBusyChange?.(false)
  }

  const handleReplay = async (id: string) => {
    const rec = recordings.find(r => r.id === id)
    if (!rec) return
    setReplaying(id); setError(null); setReplayResult(null); setReplayProgress(null); onBusyChange?.(true)
    replayPollRef.current = setInterval(async () => {
      try {
        const r = await fetch('http://localhost:3001/api/replay/status')
        const d = await r.json()
        if (d.running) setReplayProgress({ currentStep: d.currentStep, totalSteps: d.totalSteps, stepResults: d.stepResults })
      } catch {}
    }, 600)
    try {
      const res = await fetch('http://localhost:3001/api/replay', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steps: rec.steps,
          url: rec.url,
          title: rec.title,
          headless: false,
          authUser: rec.authUser,
          authPass: rec.authPass,
        }),
      })
      const data: TestResult = await res.json()
      if ((data as any).error) throw new Error((data as any).error)
      setReplayResult(data); setReplayProgress(null)
    } catch (err) { setError(err instanceof Error ? err.message : String(err)) }
    finally { setReplaying(null); setReplayProgress(null); if (replayPollRef.current) clearInterval(replayPollRef.current); onBusyChange?.(false) }
  }

  const handleAbort = async () => {
    await fetch('http://localhost:3001/api/replay/abort', { method: 'POST' })
    if (replayPollRef.current) clearInterval(replayPollRef.current)
    setReplaying(null); setReplayProgress(null); setMessage('Test stopped.'); onBusyChange?.(false)
  }

  const handleSaveSteps = async (id: string, steps: EditableStep[]) => {
    await fetch(`http://localhost:3001/api/recordings/${id}/update`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steps }),
    })
    setEditingRecId(null)
    fetchRecordings()
  }

  const handleDelete = (id: string) => setConfirmDelete(id)

  const confirmDeleteRecording = async () => {
    if (!confirmDelete) return
    await fetch(`http://localhost:3001/api/recordings/${confirmDelete}`, { method: 'DELETE' })
    setConfirmDelete(null); fetchRecordings()
  }

  const inp: React.CSSProperties = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontFamily: 'var(--font-sans)', fontSize: 13, outline: 'none' }
  const lbl: React.CSSProperties = { fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, display: 'block' }

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

      {/* ── Left: controls ── */}
      <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400, lineHeight: 1.2 }}>
            Record &amp;<br /><em style={{ color: 'var(--accent)' }}>replay tests</em>
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 12, marginTop: 6 }}>Every action is captured live, one step at a time.</p>
        </div>

        <div>
          <label style={lbl}>Site URL</label>
          <input style={inp} placeholder="https://yoursite.com" value={url} onChange={e => setUrl(e.target.value)} disabled={isRecording} />
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: isRecording ? 'not-allowed' : 'pointer', userSelect: 'none' }} onClick={() => !isRecording && setUseAuth(v => !v)}>
            <div style={{ width: 40, height: 22, borderRadius: 11, background: useAuth ? 'var(--accent)' : 'var(--surface2)', border: `2px solid ${useAuth ? 'var(--accent)' : 'var(--border2)'}`, position: 'relative', transition: 'all 0.2s', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 1, left: useAuth ? 19 : 1, width: 16, height: 16, borderRadius: '50%', background: useAuth ? '#0f0f0f' : 'var(--text3)', transition: 'left 0.2s' }} />
            </div>
            <div>
              <div style={{ fontSize: 13 }}>Site requires Basic Auth</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{useAuth ? 'Enter credentials below' : 'Toggle on for password-protected sites'}</div>
            </div>
          </div>
          {useAuth && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input style={inp} placeholder="Username" value={authUser} onChange={e => setAuthUser(e.target.value)} disabled={isRecording} autoComplete="off" />
              <input style={inp} type="password" placeholder="Password" value={authPass} onChange={e => setAuthPass(e.target.value)} disabled={isRecording} />
              {authUser && <div style={{ fontSize: 11, color: 'var(--pass)', fontFamily: 'var(--font-mono)' }}>✓ Will authenticate as "{authUser}"</div>}
            </div>
          )}
        </div>

        <div>
          <label style={lbl}>Test name</label>
          <input style={inp} placeholder="e.g. Login flow" value={title} onChange={e => setTitle(e.target.value)} disabled={isRecording} />
        </div>

        {!isRecording ? (
          <button onClick={handleStart} disabled={!url.trim()} style={{ padding: '12px 0', background: url.trim() ? 'var(--accent)' : 'var(--surface2)', border: 'none', borderRadius: 10, color: url.trim() ? '#0f0f0f' : 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, cursor: url.trim() ? 'pointer' : 'not-allowed', letterSpacing: 1 }}>
            ● START RECORDING
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#f8717111', border: '1px solid #f8717144', borderRadius: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--fail)', animation: 'recpulse 1s ease-in-out infinite', flexShrink: 0 }} />
              <style>{`@keyframes recpulse{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>
              <div>
                <div style={{ fontSize: 12, color: 'var(--fail)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>RECORDING LIVE — {liveSteps.length} steps</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>Browser is open on your screen</div>
              </div>
            </div>
            <button onClick={handleStop} style={{ padding: '12px 0', background: 'var(--pass)', border: 'none', borderRadius: 10, color: '#0f0f0f', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, cursor: 'pointer', letterSpacing: 1 }}>■ STOP &amp; SAVE</button>
            <button onClick={handleCancel} style={{ padding: '8px 0', background: 'transparent', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer' }}>CANCEL</button>
          </div>
        )}

        {error && <div style={{ padding: '10px 12px', background: '#f8717111', border: '1px solid #f8717133', borderRadius: 8, color: 'var(--fail)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{error}</div>}
        {message && <div style={{ padding: '10px 12px', background: '#4ade8011', border: '1px solid #4ade8033', borderRadius: 8, color: 'var(--pass)', fontSize: 12 }}>{message}</div>}
      </div>

      {/* ── Right: recordings + live panels ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Live capture */}
        {(isRecording || liveSteps.length > 0) && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: 1 }}>LIVE CAPTURE</span>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: isRecording ? 'var(--fail)' : 'var(--pass)' }}>{isRecording ? `● ${liveSteps.length} steps` : `✓ ${liveSteps.length} saved`}</span>
            </div>
            <div style={{ maxHeight: 260, overflowY: 'auto', padding: '6px 0' }}>
              {liveSteps.length === 0 ? (
                <div style={{ padding: '14px', color: 'var(--text3)', fontSize: 12, fontStyle: 'italic' }}>Waiting for your first action...</div>
              ) : liveSteps.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 14px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', minWidth: 18 }}>{ICON[s.action] ?? ICON.default}</span>
                  <div>
                    <div style={{ fontSize: 13 }}>{s.description}</div>
                    {s.target && <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>{s.target}</div>}
                  </div>
                </div>
              ))}
              {isRecording && <div style={{ padding: '6px 14px', fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>… waiting for next action</div>}
              <div ref={stepsEndRef} />
            </div>
          </div>
        )}

        {/* Replay progress */}
        {replaying && replayProgress && (
          <div style={{ background: 'var(--surface)', border: '1px solid #c8f06933', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#c8f069', animation: 'recpulse 1s ease-in-out infinite' }} />
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#c8f069' }}>REPLAYING — step {replayProgress.currentStep}/{replayProgress.totalSteps}</span>
              </div>
              <button onClick={handleAbort} style={{ padding: '4px 12px', background: '#f8717122', border: '1px solid #f8717144', borderRadius: 6, color: 'var(--fail)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}>■ STOP</button>
            </div>
            <div style={{ height: 3, background: 'var(--border)' }}>
              <div style={{ height: '100%', background: '#c8f069', width: `${(replayProgress.currentStep / replayProgress.totalSteps) * 100}%`, transition: 'width 0.4s' }} />
            </div>
            <div style={{ padding: '8px 0', maxHeight: 180, overflowY: 'auto' }}>
              {replayProgress.stepResults.map((r: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '5px 14px', fontSize: 12 }}>
                  <span style={{ color: r.status === 'passed' ? 'var(--pass)' : 'var(--fail)', minWidth: 14 }}>{r.status === 'passed' ? '✓' : '✗'}</span>
                  <span style={{ color: r.status === 'failed' ? 'var(--fail)' : 'var(--text2)' }}>{r.step.description}</span>
                  <span style={{ color: 'var(--text3)', marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{r.durationMs}ms</span>
                </div>
              ))}
              <div style={{ padding: '5px 14px', fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>▶ Running next step...</div>
            </div>
          </div>
        )}

        {/* Replay result */}
        {replayResult && (
          <div style={{ background: 'var(--surface)', border: `1px solid ${replayResult.status === 'passed' ? '#4ade8033' : '#f8717133'}`, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>Result — {replayResult.plan.title}</span>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: replayResult.status === 'passed' ? 'var(--pass)' : 'var(--fail)' }}>{replayResult.status.toUpperCase()}</span>
            </div>
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {replayResult.stepResults.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                  <span style={{ color: r.status === 'passed' ? 'var(--pass)' : r.status === 'failed' ? 'var(--fail)' : 'var(--text3)', minWidth: 14 }}>{r.status === 'passed' ? '✓' : r.status === 'failed' ? '✗' : '–'}</span>
                  <span style={{ color: r.status === 'failed' ? 'var(--fail)' : 'var(--text2)', flex: 1 }}>{r.step.description}</span>
                  <span style={{ color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{r.durationMs}ms</span>
                </div>
              ))}
            </div>
            {replayResult.reportPath && (
              <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)' }}>
                <a href={`http://localhost:3001${replayResult.reportPath}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text2)', textDecoration: 'none', letterSpacing: 1 }}>↓ DOWNLOAD HTML REPORT</a>
              </div>
            )}
          </div>
        )}

        {/* Saved recordings */}
        <div>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: 1, marginBottom: 12 }}>SAVED RECORDINGS ({recordings.length})</div>
          {recordings.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 140, opacity: 0.4 }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontStyle: 'italic', color: 'var(--text3)' }}>empty</div>
              <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 6 }}>Record your first test</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recordings.slice().reverse().map(rec => (
                <div key={rec.id} style={{ background: 'var(--surface)', border: `1px solid ${editingRecId === rec.id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.2s' }}>

                  {/* Recording header */}
                  <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, marginBottom: 4 }}>{rec.title}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)', display: 'flex', gap: 14 }}>
                        <span>{rec.steps.length} steps</span>
                        <span>{new Date(rec.recordedAt).toLocaleString()}</span>
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {rec.steps.slice(0, 4).map((s, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text3)' }}>
                            <span style={{ color: 'var(--accent)', minWidth: 14, fontFamily: 'var(--font-mono)' }}>{ICON[s.action] ?? ICON.default}</span>
                            <span>{s.description}</span>
                          </div>
                        ))}
                        {rec.steps.length > 4 && <div style={{ fontSize: 11, color: 'var(--text3)', paddingLeft: 22 }}>+{rec.steps.length - 4} more steps</div>}
                      </div>
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                      {replaying === rec.id ? (
                        <button onClick={handleAbort} style={{ padding: '7px 14px', background: '#f8717122', border: '1px solid #f8717144', borderRadius: 6, color: 'var(--fail)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>■ STOP</button>
                      ) : (
                        <button onClick={() => handleReplay(rec.id)} disabled={!!replaying || isRecording || editingRecId === rec.id}
                          style={{ padding: '7px 14px', background: 'var(--accent)', border: 'none', borderRadius: 6, color: '#0f0f0f', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, cursor: (replaying || isRecording || editingRecId === rec.id) ? 'not-allowed' : 'pointer', opacity: ((replaying && replaying !== rec.id) || editingRecId === rec.id) ? 0.4 : 1, whiteSpace: 'nowrap' }}>
                          ▶ REPLAY
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (editingRecId === rec.id) {
                            setEditingRecId(null)
                          } else {
                            setEditingRecId(rec.id)
                            setEditedSteps([...rec.steps])
                          }
                        }}
                        style={{ padding: '7px 14px', background: editingRecId === rec.id ? '#c8f06922' : 'transparent', border: `1px solid ${editingRecId === rec.id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 6, color: editingRecId === rec.id ? 'var(--accent)' : 'var(--text2)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}>
                        {editingRecId === rec.id ? 'CLOSE' : '✎ EDIT'}
                      </button>
                      <button onClick={() => handleDelete(rec.id)} disabled={isRecording}
                        style={{ padding: '7px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}>
                        DELETE
                      </button>
                    </div>
                  </div>

                  {/* Step editor — only shown when editing this recording */}
                  {editingRecId === rec.id && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '16px', background: 'var(--surface2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: 1 }}>
                          EDIT STEPS — drag ⠿ to reorder · ✎ to edit · ✕ to delete
                        </span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => handleSaveSteps(rec.id, editedSteps)}
                            style={{ padding: '6px 16px', background: 'var(--accent)', border: 'none', borderRadius: 6, color: '#0f0f0f', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                            SAVE &amp; CLOSE
                          </button>
                          <button onClick={() => setEditingRecId(null)}
                            style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border2)', borderRadius: 6, color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}>
                            DISCARD
                          </button>
                        </div>
                      </div>
                      <StepEditor steps={editedSteps} onChange={setEditedSteps} />
                    </div>
                  )}

                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirm delete popup */}
      {confirmDelete && (
        <div onClick={() => setConfirmDelete(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: '28px 32px', width: 360, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>Delete recording?</div>
            <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6 }}>This will permanently delete the recording and all its steps. This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: '10px 0', background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text2)', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer' }}>CANCEL</button>
              <button onClick={confirmDeleteRecording} style={{ flex: 1, padding: '10px 0', background: '#f8717122', border: '1px solid #f8717144', borderRadius: 8, color: 'var(--fail)', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>DELETE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
