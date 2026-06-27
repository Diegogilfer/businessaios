'use client'
import { useCallback } from 'react'
import { usePoll } from '@/hooks/usePoll'
import { getAnalyticsHealth, getAgentPerformance } from '@/lib/api'

function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 10 }}>
      {children}
    </p>
  )
}

const AGENTS_DEF = [
  { id: 'research',   label: 'Research',   color: '#6366F1', task: 'Analizando tendencias moda IA' },
  { id: 'commercial', label: 'Commercial', color: '#10B981', task: 'Calificando leads landing page' },
  { id: 'content',    label: 'Content',    color: '#EC4899', task: 'Redactando hilo viral Twitter' },
  { id: 'finance',    label: 'Finance',    color: '#EF4444', task: 'Proyectando escenario Q3' },
  { id: 'operations', label: 'Operations', color: '#F59E0B', task: 'Optimizando flujo de onboarding' },
]

const PRIORITIES = [
  { p: 'P1', text: 'Lanzar landing page de predicciones hoy',    color: '#EF4444' },
  { p: 'P1', text: 'Activar afiliados Spocket + AliExpress',     color: '#EF4444' },
  { p: 'P2', text: 'Publicar hilo semanal en LinkedIn/Twitter',  color: '#F59E0B' },
  { p: 'P2', text: 'Revisar conversión free → premium ($29)',    color: '#F59E0B' },
  { p: 'P3', text: 'Configurar Telegram Bot Token en .env',      color: '#6366F1' },
]

export default function CeoDashboard({ accent }: { accent: string }) {
  const hf = useCallback(() => getAnalyticsHealth(), [])
  const af = useCallback(() => getAgentPerformance(), [])
  const { data: h } = usePoll(hf, 12000)
  const { data: a } = usePoll(af, 20000)
  const hd = h as Record<string, unknown> | null
  const ad = a as Record<string, unknown> | null

  const agentPerf = (ad?.agents as Record<string, { score?: number; executions?: number }> | null) ?? {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Command KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { l: 'Agentes activos',  v: '5/5',  sub: 'Todos operativos',   c: accent },
          { l: 'Tareas hoy',       v: '12',   sub: '10 completadas',      c: accent },
          { l: 'Score sistema',    v: `${Math.round((hd?.health_score as number) ?? 91)}%`, sub: 'Excelente', c: '#10B981' },
          { l: 'Alertas activas',  v: '2',    sub: 'No críticas',         c: 'var(--text-1)' },
        ].map(k => (
          <div key={k.l} style={{
            background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-md)', padding: '18px 20px',
            transition: 'var(--transition)',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${accent}35` }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--glass-border)' }}
          >
            <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{k.l}</p>
            <p style={{ fontSize: 26, fontWeight: 600, color: k.c, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 4 }}>{k.v}</p>
            <p style={{ fontSize: 11, color: '#10B981' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Agents + Priorities */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Agent status */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '18px 20px' }}>
          <SLabel>Estado de agentes — tiempo real</SLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {AGENTS_DEF.map(ag => {
              const perf = agentPerf[ag.id]
              const score = perf?.score ?? Math.floor(70 + Math.random() * 25)
              return (
                <div key={ag.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid transparent',
                  transition: 'var(--transition)',
                  cursor: 'default',
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
                    ;(e.currentTarget as HTMLElement).style.borderColor = `${ag.color}25`
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'transparent'
                  }}
                >
                  {/* Status dot */}
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: ag.color, flexShrink: 0,
                    boxShadow: `0 0 6px ${ag.color}`,
                  }} />
                  {/* Agent info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)' }}>{ag.label}</span>
                      <span style={{ fontSize: 10, color: ag.color, fontWeight: 500 }}>{score}%</span>
                    </div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${score}%`, borderRadius: 99,
                        background: `linear-gradient(90deg, ${ag.color}55, ${ag.color})`,
                        transition: 'width 1s var(--ease)',
                      }} />
                    </div>
                    <p style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ag.task}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4, flexShrink: 0,
                    background: 'rgba(16,185,129,0.12)', color: '#10B981',
                  }}>ACTIVO</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Strategic priorities */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '18px 20px' }}>
          <SLabel>Prioridades estratégicas</SLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PRIORITIES.map((pr, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                padding: '9px 10px', borderRadius: 8,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                transition: 'var(--transition)', cursor: 'default',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
                  ;(e.currentTarget as HTMLElement).style.borderColor = `${pr.color}25`
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.04)'
                }}
              >
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                  background: `${pr.color}18`, color: pr.color, flexShrink: 0, marginTop: 1,
                }}>{pr.p}</span>
                <span style={{ fontSize: 11, color: 'var(--text-1)', lineHeight: 1.5 }}>{pr.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cross-area performance */}
      <div style={{ background: 'var(--bg-card)', border: `1px solid ${accent}20`, borderRadius: 'var(--radius-md)', padding: '20px' }}>
        <SLabel>Rendimiento por área — snapshot</SLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            { label: 'E-commerce', val: '$1,247', sub: '↑ 18%', color: '#6366F1' },
            { label: 'Marketing',  val: '48.2K',  sub: 'alcance', color: '#EC4899' },
            { label: 'Finanzas',   val: '62%',    sub: 'margen', color: '#10B981' },
            { label: 'Seguridad',  val: '94/100', sub: 'score', color: '#64748B' },
          ].map(area => (
            <div key={area.label} style={{
              background: `${area.color}08`,
              border: `1px solid ${area.color}25`,
              borderRadius: 10, padding: '14px 16px', textAlign: 'center',
              transition: 'var(--transition)',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${area.color}14` }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${area.color}08` }}
            >
              <p style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.06em' }}>{area.label.toUpperCase()}</p>
              <p style={{ fontSize: 22, fontWeight: 600, color: area.color, letterSpacing: '-0.03em', marginBottom: 3 }}>{area.val}</p>
              <p style={{ fontSize: 10, color: '#10B981' }}>{area.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
