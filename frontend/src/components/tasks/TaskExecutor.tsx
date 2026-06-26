'use client'
import { useState } from 'react'
import { createTask, executeTask, createConversation, sendChatMessage, TaskCreate } from '@/lib/api'
import { AGENTS, CATEGORIES } from '@/lib/constants'
import AgentBadge from '@/components/ui/AgentBadge'
import { useWebSocket } from '@/hooks/useWebSocket'

type Step = { text: string; done: boolean }

function parseSteps(text: string): Step[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const steps: Step[] = []
  for (const line of lines) {
    const m = line.match(/^(?:\*{0,2})(\d+)[.)]\s+(?:\*{0,2})(.+?)(?:\*{0,2})$/)
    if (m) steps.push({ text: m[2].trim(), done: false })
  }
  if (steps.length === 0) {
    const blocks = text.split(/\n\n+/).filter(b => b.trim().length > 10)
    return blocks.slice(0, 6).map(b => ({ text: b.replace(/\n/g, ' ').trim(), done: false }))
  }
  return steps
}

const COMPANION_LABELS: Record<string, string> = {
  ceo:        'CEO — Estrategia completa',
  research:   'Research — Análisis profundo',
  commercial: 'Commercial — Plan de ventas',
  content:    'Content — Estrategia de contenido',
  finance:    'Finance — Proyección financiera',
  operations: 'Operations — Plan operativo',
}

export default function TaskExecutor() {
  const [form, setForm] = useState<TaskCreate>({ title: '', description: '', category: 'general', priority: 1 })
  const [agentRole, setAgentRole]             = useState('')
  const [companion, setCompanion]             = useState('ceo')
  const [loading, setLoading]                 = useState(false)
  const [guidanceLoading, setGuidanceLoading] = useState(false)
  const [taskId, setTaskId]                   = useState<string | null>(null)
  const [result, setResult]                   = useState<Record<string, unknown> | null>(null)
  const [steps, setSteps]                     = useState<Step[]>([])
  const [convId, setConvId]                   = useState<string | null>(null)
  const [followUp, setFollowUp]               = useState('')
  const [followUpLoading, setFollowUpLoading] = useState(false)
  const [followUpReply, setFollowUpReply]     = useState<string | null>(null)
  const [error, setError]                     = useState<string | null>(null)
  const { events, connected }                 = useWebSocket(taskId ?? undefined)

  const inputStyle = {
    width: '100%', background: '#0a0a0a', border: '1px solid #1e1e1e',
    color: '#ccc', padding: '10px 12px', borderRadius: 2,
    fontSize: 12, outline: 'none', fontFamily: 'inherit', transition: 'border-color .2s',
  }

  async function handleSubmit() {
    if (!form.title || !form.description) return
    setLoading(true); setResult(null); setError(null); setTaskId(null)
    setSteps([]); setConvId(null); setFollowUpReply(null)
    try {
      const task = await createTask({ ...form, agent_id: agentRole || undefined }) as { id: string }
      setTaskId(task.id)
      const exec = await executeTask(task.id, true) as Record<string, unknown>
      setResult(exec)
      await generateGuidance(exec, form.title)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error ejecutando la tarea')
    }
    setLoading(false)
  }

  async function generateGuidance(exec: Record<string, unknown>, taskTitle: string) {
    setGuidanceLoading(true)
    try {
      const finalResult = String(exec.final_result ?? exec.result ?? '')
      const prompt =
        `Soy el agente ${COMPANION_LABELS[companion] ?? companion} y acabo de completar esta tarea:\n\n` +
        `TÍTULO: ${taskTitle}\n\n` +
        `RESULTADO GENERADO:\n${finalResult.slice(0, 2000)}\n\n` +
        `Dame exactamente 5 pasos de acción inmediata y concretos que el usuario debe ejecutar AHORA ` +
        `para implementar este resultado en su negocio. ` +
        `Habla en primera persona como su asesor personal. ` +
        `Formato obligatorio: lista numerada del 1 al 5. Sin introducción, sin conclusión. Solo los 5 pasos.`

      const conv = await createConversation(companion, `Guía: ${taskTitle.slice(0, 40)}`)
      const cid = (conv as Record<string, unknown>).conversation_id as string
      setConvId(cid)

      const reply = await sendChatMessage(cid, companion, prompt)
      const responseText = (reply as Record<string, unknown>).response as string
      setSteps(parseSteps(responseText))
    } catch {
      // guidance failure is non-fatal
    }
    setGuidanceLoading(false)
  }

  async function handleFollowUp() {
    if (!followUp.trim() || !convId) return
    setFollowUpLoading(true); setFollowUpReply(null)
    try {
      const reply = await sendChatMessage(convId, companion, followUp)
      setFollowUpReply((reply as Record<string, unknown>).response as string)
      setFollowUp('')
    } catch {
      setFollowUpReply('Error al responder. Intenta de nuevo.')
    }
    setFollowUpLoading(false)
  }

  function toggleStep(i: number) {
    setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, done: !s.done } : s))
  }

  const doneCount = steps.filter(s => s.done).length
  const companionAg = AGENTS[companion as keyof typeof AGENTS]

  return (
    <div>
      {/* Agent badges */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {Object.keys(AGENTS).map(r => <AgentBadge key={r} role={r} />)}
      </div>

      <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 2, padding: 22 }}>
        <div style={{ display: 'grid', gap: 10 }}>
          <input
            style={inputStyle}
            placeholder="Título de la tarea..."
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            onFocus={e => (e.target.style.borderColor = '#c8f04a')}
            onBlur={e => (e.target.style.borderColor = '#1e1e1e')}
          />
          <textarea
            style={{ ...inputStyle, resize: 'vertical', minHeight: 90 }}
            placeholder="Descripción detallada de lo que necesitas analizar o ejecutar..."
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            onFocus={e => (e.target.style.borderColor = '#c8f04a')}
            onBlur={e => (e.target.style.borderColor = '#1e1e1e')}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 10 }}>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={agentRole} onChange={e => setAgentRole(e.target.value)}>
              <option value="">Colaboración (todos los agentes)</option>
              {Object.entries(AGENTS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: +e.target.value }))}>
              {[1,2,3,4,5].map(p => <option key={p} value={p}>P{p}</option>)}
            </select>
          </div>

          {/* Companion selector */}
          <div style={{ padding: '12px 14px', background: '#080808', border: '1px solid #1a1a1a', borderRadius: 2 }}>
            <p style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
              Agente acompañante — te guía paso a paso después de ejecutar
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(COMPANION_LABELS).map(([role, label]) => {
                const ag = AGENTS[role as keyof typeof AGENTS]
                const active = companion === role
                return (
                  <button
                    key={role}
                    onClick={() => setCompanion(role)}
                    style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: 10,
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                      background: active ? `${ag?.color ?? '#888'}18` : 'transparent',
                      color: active ? (ag?.color ?? '#888') : '#444',
                      border: `1px solid ${active ? (ag?.color ?? '#888') + '60' : '#1e1e1e'}`,
                      fontWeight: active ? 700 : 400,
                    }}
                  >
                    {ag?.icon ?? '○'} {label}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !form.title || !form.description}
            style={{
              background: loading ? '#1a1a1a' : '#c8f04a',
              color: '#000', border: 'none', padding: '12px 24px',
              borderRadius: 2, fontSize: 12, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              transition: 'all .2s', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading
              ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>◌</span> Ejecutando agentes...</>
              : '▶  Ejecutar Tarea'
            }
          </button>
        </div>

        {/* WS Events durante ejecución */}
        {taskId && loading && events.length > 0 && (
          <div style={{ marginTop: 14, padding: 12, background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 2 }}>
            <p style={{ fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              Flujo en tiempo real · {connected ? 'conectado' : 'reconectando...'}
            </p>
            {events.slice(0, 6).map((ev, i) => {
              const c = ({ task_completed: '#c8f04a', agent_started: '#f0a44a', task_failed: '#f04a6c' } as Record<string,string>)[ev.event] ?? '#4af0c8'
              return (
                <div key={i} style={{ fontSize: 10, color: c, fontFamily: 'DM Mono, monospace', marginBottom: 3 }}>
                  → {ev.event} {ev.data ? `· ${JSON.stringify(ev.data).slice(0,40)}` : ''}
                </div>
              )
            })}
          </div>
        )}

        {error && (
          <div style={{ marginTop: 12, padding: 12, background: '#1a0a0a', border: '1px solid #f04a6c33', borderRadius: 2, fontSize: 11, color: '#f04a6c', fontFamily: 'DM Mono, monospace' }}>
            ✗ {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{ marginTop: 12, padding: 18, background: '#0a110a', border: '1px solid #c8f04a22', borderRadius: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: '#c8f04a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>✓ Resultado del CEO</span>
              <span style={{ fontSize: 10, color: '#333', fontFamily: 'DM Mono, monospace' }}>
                {String(result.execution_time_seconds ?? '?')}s · quality {String(result.quality_score ?? '?')}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
              {((result.agents_contributed ?? []) as string[]).map(a => <AgentBadge key={a} role={a} />)}
            </div>
            <p style={{ fontSize: 12, color: '#777', lineHeight: 1.7, maxHeight: 200, overflowY: 'auto', margin: 0 }}>
              {String(result.final_result ?? result.result ?? 'Sin resultado')}
            </p>
          </div>
        )}

        {/* Companion guidance panel */}
        {(guidanceLoading || steps.length > 0) && (
          <div style={{ marginTop: 12, background: '#08090d', border: '1px solid #1a2540', borderRadius: 2, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '12px 18px', borderBottom: '1px solid #1a2540', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#060810' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{companionAg?.icon ?? '○'}</span>
                <div>
                  <p style={{ fontSize: 12, color: '#7eb8f0', fontWeight: 700, margin: 0 }}>
                    {COMPANION_LABELS[companion]}
                  </p>
                  <p style={{ fontSize: 9, color: '#334', margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Tu plan de acción paso a paso
                  </p>
                </div>
              </div>
              {steps.length > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 13, color: '#7eb8f0', fontWeight: 700 }}>{doneCount}/{steps.length}</span>
                  <p style={{ fontSize: 9, color: '#334', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>pasos</p>
                </div>
              )}
            </div>

            {/* Steps list */}
            <div style={{ padding: '14px 18px 4px' }}>
              {guidanceLoading && steps.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0 14px' }}>
                  <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', color: '#7eb8f0', fontSize: 16 }}>◌</span>
                  <span style={{ fontSize: 12, color: '#445' }}>
                    {companionAg?.icon} {COMPANION_LABELS[companion].split('—')[0].trim()} preparando tu plan de acción...
                  </span>
                </div>
              )}
              {steps.map((step, i) => (
                <div
                  key={i}
                  onClick={() => toggleStep(i)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '11px 0', cursor: 'pointer',
                    borderBottom: i < steps.length - 1 ? '1px solid #0d1420' : 'none',
                    opacity: step.done ? 0.4 : 1, transition: 'opacity .2s',
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 1,
                    border: `2px solid ${step.done ? '#7eb8f0' : '#2a3a50'}`,
                    background: step.done ? '#7eb8f015' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all .15s',
                  }}>
                    {step.done && <span style={{ fontSize: 11, color: '#7eb8f0', lineHeight: 1 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 9, color: '#7eb8f040', fontFamily: 'DM Mono, monospace', marginRight: 6, letterSpacing: '0.1em' }}>
                      PASO {i + 1}
                    </span>
                    <br />
                    <span style={{
                      fontSize: 12, color: step.done ? '#334' : '#aab', lineHeight: 1.65,
                      textDecoration: step.done ? 'line-through' : 'none',
                    }}>
                      {step.text}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            {steps.length > 0 && (
              <div style={{ height: 2, background: '#0d1420', margin: '4px 0 0' }}>
                <div style={{
                  height: '100%', background: '#7eb8f0',
                  width: `${(doneCount / steps.length) * 100}%`,
                  transition: 'width .5s ease',
                }} />
              </div>
            )}

            {/* Follow-up input */}
            {convId && steps.length > 0 && (
              <div style={{ padding: '14px 18px', borderTop: '1px solid #0d1420' }}>
                {followUpReply && (
                  <div style={{ marginBottom: 10, padding: '12px 14px', background: '#060810', borderRadius: 2, border: '1px solid #1a2540' }}>
                    <p style={{ fontSize: 9, color: '#7eb8f040', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                      {companionAg?.icon} {COMPANION_LABELS[companion].split('—')[0].trim()} responde
                    </p>
                    <p style={{ fontSize: 12, color: '#7ab', lineHeight: 1.7, margin: 0 }}>{followUpReply}</p>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    style={{ ...inputStyle, flex: 1, fontSize: 11 }}
                    placeholder={`Pregúntale al ${COMPANION_LABELS[companion].split('—')[0].trim()} cómo avanzar...`}
                    value={followUp}
                    onChange={e => setFollowUp(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !followUpLoading) handleFollowUp() }}
                    onFocus={e => (e.target.style.borderColor = '#7eb8f0')}
                    onBlur={e => (e.target.style.borderColor = '#1e1e1e')}
                  />
                  <button
                    onClick={handleFollowUp}
                    disabled={followUpLoading || !followUp.trim()}
                    style={{
                      padding: '0 16px', background: followUpLoading ? '#0d1420' : '#7eb8f010',
                      border: '1px solid #7eb8f030', borderRadius: 2, color: '#7eb8f0',
                      fontSize: 11, cursor: followUpLoading ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all .15s',
                    }}
                  >
                    {followUpLoading
                      ? <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>◌</span>
                      : 'Preguntar →'
                    }
                  </button>
                </div>
                <p style={{ fontSize: 9, color: '#1e2a3a', marginTop: 6, letterSpacing: '0.06em' }}>
                  Pregunta dudas sobre cualquier paso · Enter para enviar
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
