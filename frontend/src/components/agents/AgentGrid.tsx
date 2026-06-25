'use client'
import { usePoll } from '@/hooks/usePoll'
import { getAnalyticsAgents } from '@/lib/api'
import { AGENTS } from '@/lib/constants'

export default function AgentGrid() {
  const { data } = usePoll(getAnalyticsAgents, 15000)
  const agentsMap = (data as Record<string, Record<string, unknown>>)?.agents ?? {}

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 300, color: '#eee' }}>Agentes del Sistema</h2>
        <p style={{ fontSize: 11, color: '#2a2a2a', marginTop: 3 }}>6 agentes especializados con system prompts únicos y memoria persistente</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {Object.entries(AGENTS).map(([role, ag]) => {
          const p = agentsMap[role] as Record<string, number> | undefined
          const quality  = p?.avg_quality  ?? 0
          const tasks    = p?.total_tasks  ?? 0
          const success  = p?.success_rate ?? 0
          const pct      = Math.round(quality * 100)

          return (
            <div key={role} style={{
              background: '#0d0d0d',
              border: `1px solid ${ag.color}15`,
              borderTop: `2px solid ${ag.color}`,
              borderRadius: 2, padding: 20,
              transition: 'border-color .2s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${ag.color}40` }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `${ag.color}15` }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <span style={{ fontSize: 20, color: ag.color }}>{ag.icon}</span>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#ddd', marginTop: 4 }}>{ag.label} Agent</p>
                  <p style={{ fontSize: 9, color: '#2a2a2a', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>{role}</p>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: ag.color, fontFamily: 'DM Mono, monospace' }}>
                  {pct}%
                </div>
              </div>
              <p style={{ fontSize: 10, color: '#333', marginBottom: 8, lineHeight: 1.5 }}>{ag.desc}</p>
              <div style={{ height: 2, background: '#141414', borderRadius: 1, marginBottom: 14 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: ag.color, borderRadius: 1, boxShadow: `0 0 6px ${ag.color}44`, transition: 'width 1s cubic-bezier(.16,1,.3,1)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {([['Tareas', tasks], ['Éxito', `${success}%`], ['Completadas', Math.round(tasks * quality)], ['Fallidas', Math.round(tasks * (1 - quality))]] as [string, number | string][]).map(([l, v]) => (
                  <div key={l} style={{ background: '#0a0a0a', padding: '7px 9px', borderRadius: 2 }}>
                    <p style={{ fontSize: 9, color: '#333' }}>{l}</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#888', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
