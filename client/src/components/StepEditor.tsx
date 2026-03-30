import { useState } from 'react'

export interface EditableStep {
  action: string
  target?: string | { primary: string; fallback: string[] }
  value?: string
  description: string
}

const ACTIONS = ['navigate', 'click', 'fill', 'select', 'hover', 'scroll', 'wait', 'assert_visible', 'assert_text', 'assert_url', 'assert_title', 'screenshot']

const ACTION_ICON: Record<string, string> = {
  navigate: '→', click: '↖', fill: '✎', select: '▾', hover: '◎',
  scroll: '↕', wait: '⏱', assert_visible: '👁', assert_text: '✦',
  assert_url: '🔗', assert_title: '📄', screenshot: '⊡'
}

const ACTION_COLOR: Record<string, string> = {
  navigate: '#378ADD', click: '#c8f069', fill: '#EF9F27',
  assert_visible: '#4ade80', assert_text: '#4ade80', assert_url: '#4ade80',
  assert_title: '#4ade80', screenshot: '#888', scroll: '#888',
  wait: '#888', hover: '#888', select: '#EF9F27'
}

const NEEDS_TARGET = ['click', 'fill', 'select', 'hover', 'assert_visible', 'assert_text']
const NEEDS_VALUE = ['navigate', 'fill', 'select', 'wait', 'assert_text', 'assert_url', 'assert_title']

interface ValidationIssue { stepIndex: number; message: string; severity: 'error' | 'warning' }

function validateSteps(steps: EditableStep[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  steps.forEach((step, i) => {
    const targetStr = typeof step.target === 'string' ? step.target : step.target?.primary
    // Missing target
    if (NEEDS_TARGET.includes(step.action) && !targetStr?.trim()) {
      issues.push({ stepIndex: i, message: `"${step.action}" needs a target selector`, severity: 'error' })
    }
    // Missing value
    if (NEEDS_VALUE.includes(step.action) && !step.value?.trim()) {
      issues.push({ stepIndex: i, message: `"${step.action}" needs a value`, severity: 'error' })
    }
    // Placeholder credentials
    if (step.action === 'fill' && step.value && /your@email|yourpassword|placeholder/i.test(step.value)) {
      issues.push({ stepIndex: i, message: 'Replace placeholder credentials with real values', severity: 'warning' })
    }
    // SVG selector
    if (targetStr === 'svg' || targetStr === 'path') {
      issues.push({ stepIndex: i, message: 'SVG selector may fail — use aria-label or parent element', severity: 'warning' })
    }
    // No navigate at start for web tests
    if (i === 0 && step.action !== 'navigate') {
      issues.push({ stepIndex: i, message: 'First step should be "navigate" to open the page', severity: 'warning' })
    }
    // Wait value
    if (step.action === 'wait' && Number(step.value) > 10000) {
      issues.push({ stepIndex: i, message: 'Wait over 10s is very long — consider reducing', severity: 'warning' })
    }
  })

  // No assertions at all
  const hasAssertion = steps.some(s => s.action.startsWith('assert_') || s.action === 'screenshot')
  if (!hasAssertion) {
    issues.push({ stepIndex: -1, message: 'No assertions or screenshots — add at least one to verify the test outcome', severity: 'warning' })
  }

  return issues
}

interface Props {
  steps: EditableStep[]
  onChange: (steps: EditableStep[]) => void
}

export default function StepEditor({ steps, onChange }: Props) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editStep, setEditStep] = useState<EditableStep | null>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newStep, setNewStep] = useState<EditableStep>({ action: 'click', target: '', value: '', description: '' })

  const issues = validateSteps(steps)
  const errors = issues.filter(i => i.severity === 'error')
  const warnings = issues.filter(i => i.severity === 'warning')

  const update = (updated: EditableStep[]) => onChange(updated)

  const deleteStep = (i: number) => update(steps.filter((_, idx) => idx !== i))

  const startEdit = (i: number) => { setEditingIdx(i); setEditStep({ ...steps[i] }) }

  const saveEdit = () => {
    if (editingIdx === null || !editStep) return
    const updated = [...steps]
    // Auto-generate description if blank
    if (!editStep.description.trim()) {
      const targetStr = typeof editStep.target === 'string' ? editStep.target : editStep.target?.primary
      editStep.description = `${editStep.action}${targetStr ? ` on ${targetStr}` : ''}${editStep.value ? ` = "${editStep.value}"` : ''}`
    }
    updated[editingIdx] = editStep
    update(updated)
    setEditingIdx(null); setEditStep(null)
  }

  const addStep = () => {
    const step = { ...newStep }
    if (!step.description.trim()) {
      const targetStr = typeof step.target === 'string' ? step.target : step.target?.primary
      step.description = `${step.action}${targetStr ? ` on ${targetStr}` : ''}${step.value ? ` = "${step.value}"` : ''}`
    }
    update([...steps, step])
    setNewStep({ action: 'click', target: '', value: '', description: '' })
    setShowAdd(false)
  }

  const addScreenshot = () => update([...steps, { action: 'screenshot', description: 'Take screenshot' }])
  const addWait = () => update([...steps, { action: 'wait', value: '1000', description: 'Wait 1 second' }])

  // Drag reorder
  const onDragStart = (i: number) => setDragIdx(i)
  const onDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOverIdx(i) }
  const onDrop = (i: number) => {
    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setDragOverIdx(null); return }
    const updated = [...steps]
    const [moved] = updated.splice(dragIdx, 1)
    updated.splice(i, 0, moved)
    update(updated)
    setDragIdx(null); setDragOverIdx(null)
  }

  const inp: React.CSSProperties = { width: '100%', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 6, padding: '7px 10px', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 12, outline: 'none' }
  const sel: React.CSSProperties = { ...inp, cursor: 'pointer' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Validation banner */}
      {(errors.length > 0 || warnings.length > 0) && (
        <div style={{ padding: '10px 14px', background: errors.length > 0 ? '#f8717111' : '#EF9F2711', border: `1px solid ${errors.length > 0 ? '#f8717133' : '#EF9F2733'}`, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {errors.map((issue, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--fail)', display: 'flex', gap: 6 }}>
              <span>✗</span>
              <span>{issue.stepIndex >= 0 ? `Step ${issue.stepIndex + 1}: ` : ''}{issue.message}</span>
            </div>
          ))}
          {warnings.map((issue, i) => (
            <div key={i} style={{ fontSize: 11, color: '#EF9F27', display: 'flex', gap: 6 }}>
              <span>⚠</span>
              <span>{issue.stepIndex >= 0 ? `Step ${issue.stepIndex + 1}: ` : ''}{issue.message}</span>
            </div>
          ))}
        </div>
      )}

      {errors.length === 0 && warnings.length === 0 && steps.length > 0 && (
        <div style={{ padding: '8px 14px', background: '#4ade8011', border: '1px solid #4ade8033', borderRadius: 8, fontSize: 11, color: 'var(--pass)', display: 'flex', gap: 6 }}>
          <span>✓</span><span>All steps look good — ready to replay</span>
        </div>
      )}

      {/* Steps list */}
      {steps.map((step, i) => {
        const stepIssues = issues.filter(iss => iss.stepIndex === i)
        const isEditing = editingIdx === i
        const isDragging = dragIdx === i
        const isDragOver = dragOverIdx === i && dragIdx !== i

        return (
          <div key={i}
            draggable={!isEditing}
            onDragStart={() => onDragStart(i)}
            onDragOver={e => onDragOver(e, i)}
            onDrop={() => onDrop(i)}
            onDragEnd={() => { setDragIdx(null); setDragOverIdx(null) }}
            style={{
              background: isEditing ? 'var(--surface)' : 'var(--surface)',
              border: `1px solid ${isDragOver ? 'var(--accent)' : stepIssues.some(s => s.severity === 'error') ? '#f8717144' : stepIssues.length > 0 ? '#EF9F2744' : isEditing ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 8, overflow: 'hidden',
              opacity: isDragging ? 0.4 : 1,
              transition: 'border-color 0.15s, opacity 0.15s',
              cursor: isEditing ? 'default' : 'grab',
            }}>

            {isEditing && editStep ? (
              /* ── Edit mode ── */
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--accent)', letterSpacing: 1 }}>EDITING STEP {i + 1}</div>

                {/* Action selector */}
                <div>
                  <label style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>ACTION</label>
                  <select value={editStep.action} onChange={e => setEditStep({ ...editStep, action: e.target.value, target: '', value: '' })} style={sel}>
                    {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                {/* Target */}
                {NEEDS_TARGET.includes(editStep.action) && (
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>
                      SELECTOR <span style={{ color: 'var(--text3)', fontWeight: 400 }}>— e.g. #email, button:has-text("Login"), [aria-label="Search"]</span>
                    </label>
                    <input style={inp} 
                      value={typeof editStep.target === 'string' ? editStep.target : editStep.target?.primary ?? ''} 
                      onChange={e => {
                        const val = e.target.value
                        if (typeof editStep.target === 'object' && editStep.target !== null) {
                          setEditStep({ ...editStep, target: { ...editStep.target, primary: val } })
                        } else {
                          setEditStep({ ...editStep, target: val })
                        }
                      }} 
                      placeholder='e.g. #username or button:has-text("Submit")' 
                    />
                  </div>
                )}

                {/* Value */}
                {NEEDS_VALUE.includes(editStep.action) && (
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>
                      {editStep.action === 'navigate' ? 'URL' : editStep.action === 'wait' ? 'MILLISECONDS' : editStep.action.startsWith('assert') ? 'EXPECTED VALUE' : 'VALUE TO TYPE'}
                    </label>
                    <input style={inp} value={editStep.value ?? ''} onChange={e => setEditStep({ ...editStep, value: e.target.value })}
                      placeholder={editStep.action === 'navigate' ? 'https://...' : editStep.action === 'wait' ? '1000' : editStep.action.startsWith('assert') ? 'expected text or URL part' : 'text to type'} />
                  </div>
                )}

                {/* Description */}
                <div>
                  <label style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>DESCRIPTION (shown in report)</label>
                  <input style={inp} value={editStep.description} onChange={e => setEditStep({ ...editStep, description: e.target.value })} placeholder="What does this step do?" />
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveEdit} style={{ padding: '7px 16px', background: 'var(--accent)', border: 'none', borderRadius: 6, color: '#0f0f0f', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>SAVE STEP</button>
                  <button onClick={() => { setEditingIdx(null); setEditStep(null) }} style={{ padding: '7px 12px', background: 'transparent', border: '1px solid var(--border2)', borderRadius: 6, color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}>CANCEL</button>
                </div>
              </div>
            ) : (
              /* ── View mode ── */
              <div style={{ padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                {/* Drag handle */}
                <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 2, flexShrink: 0, cursor: 'grab' }}>⠿</div>

                {/* Step number + action icon */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginTop: 1 }}>
                  <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)', minWidth: 18 }}>{i + 1}.</span>
                  <span style={{ fontSize: 14, color: ACTION_COLOR[step.action] ?? 'var(--text3)' }}>{ACTION_ICON[step.action] ?? '•'}</span>
                </div>

                {/* Step info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>
                    {step.description || `${step.action}${ (typeof step.target === 'string' ? step.target : step.target?.primary) ? ` › ${typeof step.target === 'string' ? step.target : step.target?.primary}` : ''}`}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ color: ACTION_COLOR[step.action] ?? 'var(--text3)', marginRight: 6 }}>{step.action}</span>
                    {step.target && <span style={{ marginRight: 6 }}>{typeof step.target === 'string' ? step.target : step.target.primary}</span>}
                    {step.value && <span style={{ color: 'var(--text2)' }}>= "{step.value}"</span>}
                  </div>
                  {stepIssues.length > 0 && (
                    <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {stepIssues.map((iss, j) => (
                        <div key={j} style={{ fontSize: 10, color: iss.severity === 'error' ? 'var(--fail)' : '#EF9F27', display: 'flex', gap: 4 }}>
                          <span>{iss.severity === 'error' ? '✗' : '⚠'}</span><span>{iss.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => startEdit(i)} title="Edit step" style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text3)', fontSize: 11, cursor: 'pointer', padding: '3px 8px' }}>✎</button>
                  <button onClick={() => deleteStep(i)} title="Delete step" style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--fail)', fontSize: 11, cursor: 'pointer', padding: '3px 8px' }}>✕</button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Add step UI */}
      {showAdd ? (
        <div style={{ padding: '14px', background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--accent)', letterSpacing: 1 }}>ADD NEW STEP</div>
          <select value={newStep.action} onChange={e => setNewStep({ ...newStep, action: e.target.value, target: '', value: '' })} style={{ ...inp, cursor: 'pointer' }}>
            {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          {NEEDS_TARGET.includes(newStep.action) && (
            <input style={inp} 
              value={typeof newStep.target === 'string' ? newStep.target : newStep.target?.primary ?? ''} 
              onChange={e => setNewStep({ ...newStep, target: e.target.value })} 
              placeholder='Selector e.g. #submit or button:has-text("OK")' 
            />
          )}
          {NEEDS_VALUE.includes(newStep.action) && (
            <input style={inp} value={newStep.value ?? ''} onChange={e => setNewStep({ ...newStep, value: e.target.value })} placeholder={newStep.action === 'navigate' ? 'https://...' : newStep.action === 'wait' ? '1000' : 'value'} />
          )}
          <input style={inp} value={newStep.description} onChange={e => setNewStep({ ...newStep, description: e.target.value })} placeholder="Step description (optional)" />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addStep} style={{ padding: '7px 16px', background: 'var(--accent)', border: 'none', borderRadius: 6, color: '#0f0f0f', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>ADD STEP</button>
            <button onClick={() => setShowAdd(false)} style={{ padding: '7px 12px', background: 'transparent', border: '1px solid var(--border2)', borderRadius: 6, color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}>CANCEL</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setShowAdd(true)} style={{ padding: '6px 14px', background: 'transparent', border: '1px dashed var(--border2)', borderRadius: 6, color: 'var(--text2)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}>+ Add step</button>
          <button onClick={addScreenshot} style={{ padding: '6px 14px', background: 'transparent', border: '1px dashed var(--border2)', borderRadius: 6, color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}>+ Screenshot</button>
          <button onClick={addWait} style={{ padding: '6px 14px', background: 'transparent', border: '1px dashed var(--border2)', borderRadius: 6, color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}>+ Wait</button>
        </div>
      )}
    </div>
  )
}
