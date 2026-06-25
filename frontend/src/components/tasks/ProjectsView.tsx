'use client'
import { useCallback } from 'react'
import { usePoll } from '@/hooks/usePoll'
import { listTasks } from '@/lib/api'
import { useAgentTheme } from '@/contexts/AgentThemeContext'

type Task = {
  id: string
  title: string
  description?: string
  category?: string
  priority?: number
  status: string
  result?: string
  created_at: string
}

type TasksResponse = { tasks: Task[] }

const STATUS: Record<string, { label: string; color: string }> = {
  completed: { label: 'Completado', color: '#00C896' },
  running:   { label: 'Ejecutando', color: '#f0a44a' },
  pending:   { label: 'Pendiente',  color: '#7B8CFF' },
  failed:    { label: 'Fallido',    color: '#f04a6c' },
}

export default function ProjectsView() {
  const { theme } = useAgentTheme()
  const fn   = useCallback(() => listTasks() as Promise<TasksResponse>, [])
  const { data } = usePoll<TasksResponse>(fn, 15000)
  const tasks = data?.tasks ?? []

  if (tasks.length === 0) {
    return (
      <div className="animate-fade-in" style={{ textAlign: 'center', padding: '100px 0' }}>
        <div style={{ fontSize: 36, color: theme.color, opacity: 0.2, marginBottom: 16 }}>{theme.icon}</div>
        <p style={{ fontSize: 14, color: 'var(--text-2)', fontWeight: 400 }}>No hay proyectos aún</p>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.6 }}>
          Ejecuta tu primera tarea en la sección <strong style={{ color: theme.color }}>Ejecutar</strong>.
        </p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {tasks.map((task) => {
        const st = STATUS[task.status] ?? { label: task.status, color: '#888' }
        return (
          <div
            key={task.id}
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: 10, padding: '20px 24px',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = `${theme.color}28`)}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--glass-border)')}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 9, padding: '2px 9px', borderRadius: 20, fontWeight: 600,
                    background: `${st.color}18`, color: st.color,
                    border: `1px solid ${st.color}30`,
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}>
                    {st.label}
                  </span>
                  <span style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {new Date(task.created_at).toLocaleString('es', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                  <span style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {task.category ?? 'general'} · P{task.priority ?? 1}
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                  {task.title}
                </div>
              </div>
            </div>

            {task.description && (
              <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 10, lineHeight: 1.6 }}>
                {task.description.slice(0, 120)}{task.description.length > 120 ? '…' : ''}
              </p>
            )}

            {task.result && (
              <div style={{
                marginTop: 12, padding: '12px 14px',
                background: `${theme.color}07`,
                border: `1px solid ${theme.color}15`,
                borderRadius: 7,
              }}>
                <p style={{ fontSize: 9, color: theme.color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontWeight: 600 }}>
                  Resultado
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.65 }}>
                  {task.result.slice(0, 240)}{task.result.length > 240 ? '…' : ''}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
