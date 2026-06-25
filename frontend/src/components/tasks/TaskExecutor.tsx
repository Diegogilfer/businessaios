'use client'
import { useState } from 'react'
import { createTask, executeTask, TaskCreate } from '@/lib/api'
import { AGENTS, CATEGORIES } from '@/lib/constants'
import AgentBadge from '@/components/ui/AgentBadge'
import { useWebSocket } from '@/hooks/useWebSocket'

export default function TaskExecutor({ onSuccess }: { onSuccess?: () => void }) {
  const [form, setForm] = useState<TaskCreate>({ title: '', description: '', category: 'general', priority: 1 })
  const [agentRole, setAgentRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [taskId, setTaskId]   = useState<string | null>(null)
  const [result, setResult]   = useState<Record<string, unknown> | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const { events, connected } = useWebSocket(taskId ?? undefined)

  const inputStyle = {
    width: '100%', background: '#0a0a0a', border: '1px solid #1e1e1e',
    color: '#ccc', padding: '10px 12px', borderRadius: 2,
    fontSize: 12, outline: 'none', fontFamily: 'inherit', transition: 'border-color .2s',
  }

  async function handleSubmit() {
    if (!form.title || !form.description) return
    setLoading(true); setResult(null); setError(null); setTaskId(null)
    try {
      const task = await createTask({ ...form, agent_id: agentRole || undefined }) as { id: string }
      setTaskId(task.id)
      const exec = await executeTask(task.id, true) as Record<string, unknown>
      setResult(exec)
      onSuccess?.()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    }
    setLoading(false)
  }

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

        {result && (
          <div style={{ marginTop: 12, padding: 18, background: '#0a110a', border: '1px solid #c8f04a22', borderRadius: 2, animation: 'fadeIn .4s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: '#c8f04a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>✓ Completado</span>
              <span style={{ fontSize: 10, color: '#333', fontFamily: 'DM Mono, monospace' }}>
                {String(result.execution_time_seconds ?? '?')}s · quality {String(result.quality_score ?? '?')}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
              {((result.agents_contributed ?? []) as string[]).map(a => <AgentBadge key={a} role={a} />)}
            </div>
            <p style={{ fontSize: 12, color: '#777', lineHeight: 1.7, maxHeight: 220, overflowY: 'auto', margin: 0 }}>
              {String(result.result ?? result.final_result ?? 'Sin resultado')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
