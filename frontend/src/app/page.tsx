'use client'
import { useState, useCallback, useMemo } from 'react'
import LoginGate from '@/components/auth/LoginGate'
import { usePoll } from '@/hooks/usePoll'
import { useWebSocket } from '@/hooks/useWebSocket'
import { getAnalyticsHealth, getAnalyticsExecs, getAnalyticsKnowledge } from '@/lib/api'
import KpiCard from '@/components/ui/KpiCard'
import { LiveFeedMini, LiveFeedFull } from '@/components/dashboard/LiveFeed'
import TaskExecutor from '@/components/tasks/TaskExecutor'
import AgentGrid from '@/components/agents/AgentGrid'
import ArbitrageTable from '@/components/arbitrage/ArbitrageTable'
import KnowledgeExplorer from '@/components/knowledge/KnowledgeExplorer'
import AgentChat from '@/components/chat/AgentChat'
import SaasDashboard from '@/components/saas/SaasDashboard'
import NeuroDashboard from '@/components/neuro/NeuroDashboard'
import SkillsMarketplace from '@/components/skills/SkillsMarketplace'
import SecurityDashboard from '@/components/security/SecurityDashboard'
import { AGENTS } from '@/lib/constants'

type Tab = 'overview' | 'execute' | 'agents' | 'arbitrage' | 'knowledge' | 'live' | 'chat' | 'saas' | 'neuro' | 'skills' | 'security'

// ── Navigation structure ──────────────────────────────────────
const NAV_GROUPS: { label: string; items: { id: Tab; icon: string; label: string; desc: string }[] }[] = [
  {
    label: 'Principal',
    items: [
      { id: 'overview',  icon: '◈', label: 'Overview',     desc: 'Dashboard ejecutivo' },
      { id: 'execute',   icon: '▶', label: 'Ejecutar',     desc: 'Nueva tarea' },
      { id: 'chat',      icon: '◷', label: 'Chat',         desc: 'Hablar con agentes' },
    ],
  },
  {
    label: 'Inteligencia',
    items: [
      { id: 'agents',    icon: '⬡', label: 'Agentes',      desc: 'Estado y performance' },
      { id: 'arbitrage', icon: '◆', label: 'Arbitraje',    desc: 'Oportunidades ROI' },
      { id: 'knowledge', icon: '◎', label: 'Conocimiento', desc: 'Base de datos' },
      { id: 'neuro',     icon: '◈', label: 'NeuroIA',      desc: 'Predicciones' },
    ],
  },
  {
    label: 'Plataforma',
    items: [
      { id: 'live',      icon: '◉', label: 'Live Feed',    desc: 'Tiempo real' },
      { id: 'saas',      icon: '▲', label: 'SaaS',         desc: 'Planes y billing' },
      { id: 'skills',    icon: '◇', label: 'Skills',       desc: 'Capacidades' },
      { id: 'security',  icon: '⬡', label: 'Seguridad',    desc: 'Auditoría' },
    ],
  },
]

const PAGE_META: Record<Tab, { title: string; desc: string }> = {
  overview:  { title: 'Dashboard',          desc: 'Resumen ejecutivo del sistema autónomo' },
  execute:   { title: 'Ejecutar Tarea',     desc: 'Los 6 agentes colaboran en paralelo → CEO consolida el resultado final' },
  chat:      { title: 'Chat con Agentes',   desc: 'Conversa directamente con cualquier agente especializado' },
  agents:    { title: 'Agentes',            desc: 'Estado y performance de los 6 agentes especializados' },
  arbitrage: { title: 'Arbitraje',          desc: 'Oportunidades de importación detectadas automáticamente' },
  knowledge: { title: 'Conocimiento',       desc: 'Base de conocimiento generada y curada por los agentes' },
  neuro:     { title: 'NeuroIA',            desc: 'Predicciones de tendencias y análisis de patrones' },
  live:      { title: 'Feed en Vivo',       desc: 'Eventos del sistema en tiempo real vía WebSocket' },
  saas:      { title: 'SaaS',              desc: 'Planes, facturación y gestión de tenants' },
  skills:    { title: 'Skills',            desc: 'Capacidades disponibles para los agentes' },
  security:  { title: 'Seguridad',         desc: 'Auditoría activa y alertas del SecurityAgent' },
}

const QUICK_ACTIONS: { icon: string; title: string; desc: string; tab: Tab; color: string; cta: string }[] = [
  {
    icon: '▶', title: 'Ejecutar Tarea', color: '#00E5CC', tab: 'execute',
    desc: 'Los 6 agentes trabajan en paralelo. El CEO consolida el resultado y tu agente acompañante te guía paso a paso.',
    cta: 'Ejecutar ahora',
  },
  {
    icon: '◷', title: 'Chat con Agentes', color: '#7B5CFF', tab: 'chat',
    desc: 'Conversa directamente con Research, Commercial, Content, Finance u Operations para resolver dudas específicas.',
    cta: 'Abrir chat',
  },
  {
    icon: '◆', title: 'Arbitraje', color: '#FF9A3C', tab: 'arbitrage',
    desc: 'Detecta productos con alto margen entre Amazon y AliExpress. El sistema escanea y rankea por ROI automáticamente.',
    cta: 'Ver oportunidades',
  },
  {
    icon: '◎', title: 'Conocimiento', color: '#3B8EFF', tab: 'knowledge',
    desc: 'Explora la base de conocimiento acumulada por los agentes. Incluye análisis, estrategias y aprendizajes anteriores.',
    cta: 'Explorar',
  },
]

// ── Agent bar (memoized widths so they don't change on re-render) ──
const FIXED_WIDTHS: Record<string, number> = {
  ceo: 88, research: 76, commercial: 82, content: 71, finance: 79, operations: 74,
}

function AgentBar({ role }: { role: string }) {
  const ag    = AGENTS[role as keyof typeof AGENTS]
  const color = ag?.color ?? '#888'
  const width = FIXED_WIDTHS[role] ?? 70
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color, fontSize: 13 }}>{ag?.icon}</span>
          <span style={{ fontWeight: 500 }}>{ag?.label}</span>
        </span>
        <span style={{ fontSize: 10, color, fontFamily: "'JetBrains Mono', monospace" }}>{width}%</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${width}%`,
          background: `linear-gradient(90deg, ${color}55, ${color}cc)`,
          borderRadius: 99,
        }} />
      </div>
    </div>
  )
}

// ── Overview ──────────────────────────────────────────────────
function Overview({ setTab }: { setTab: (t: Tab) => void }) {
  const hf = useCallback(() => getAnalyticsHealth(), [])
  const ef = useCallback(() => getAnalyticsExecs(7), [])
  const kf = useCallback(() => getAnalyticsKnowledge(), [])
  const { data: h } = usePoll(hf, 10000)
  const { data: e } = usePoll(ef, 15000)
  const { data: k } = usePoll(kf, 20000)
  const hd = h as Record<string, unknown> | null
  const ed = e as Record<string, unknown> | null
  const kd = k as Record<string, unknown> | null

  return (
    <div className="animate-fade-in">

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 44 }}>
        <KpiCard label="Health Score"  value={hd?.health_score} suffix="%" accent="var(--primary)" sub="Sistema operativo" />
        <KpiCard label="Completadas"   value={ed?.completed}    accent="var(--violet)"              sub={`de ${ed?.total_executions ?? 0} totales`} />
        <KpiCard label="Quality Score" value={ed?.avg_quality}  decimals={2} accent="var(--blue)"   sub="promedio 7 días" />
        <KpiCard label="Conocimiento"  value={kd?.total_entries} accent="var(--amber)"              sub={`+${kd?.new_this_week ?? 0} esta semana`} />
      </div>

      {/* Quick actions */}
      <div style={{ marginBottom: 44 }}>
        <p style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 600, marginBottom: 18 }}>
          Acciones rápidas
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {QUICK_ACTIONS.map(action => (
            <div
              key={action.tab}
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: 10,
                padding: '22px 20px',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                minHeight: 200,
                transition: 'border-color 0.2s, background 0.2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = `${action.color}35`
                ;(e.currentTarget as HTMLElement).style.background = `${action.color}05`
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--glass-border)'
                ;(e.currentTarget as HTMLElement).style.background = 'var(--glass-bg)'
              }}
            >
              <div>
                <div style={{ fontSize: 20, marginBottom: 12, color: action.color }}>{action.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 8, letterSpacing: '-0.01em' }}>
                  {action.title}
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.65 }}>
                  {action.desc}
                </p>
              </div>
              <button
                onClick={() => setTab(action.tab)}
                style={{
                  marginTop: 18,
                  background: `${action.color}10`,
                  border: `1px solid ${action.color}28`,
                  color: action.color,
                  padding: '8px 14px',
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  letterSpacing: '0.04em',
                  width: '100%',
                  textAlign: 'center',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => ((e.target as HTMLElement).style.background = `${action.color}20`)}
                onMouseLeave={e => ((e.target as HTMLElement).style.background = `${action.color}10`)}
              >
                {action.cta} →
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="glass" style={{ borderRadius: 10, padding: 26 }}>
          <p style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 600, marginBottom: 24 }}>
            Performance de Agentes
          </p>
          {Object.keys(AGENTS).map(r => <AgentBar key={r} role={r} />)}
          <button
            onClick={() => setTab('agents')}
            style={{
              marginTop: 8, width: '100%', padding: '8px', background: 'transparent',
              border: '1px solid var(--glass-border)', borderRadius: 6, color: 'var(--text-3)',
              fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em',
              transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--text-1)'; (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)' }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--text-3)'; (e.target as HTMLElement).style.borderColor = 'var(--glass-border)' }}
          >
            Ver detalle de agentes →
          </button>
        </div>
        <LiveFeedMini />
      </div>
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────
function Sidebar({ tab, setTab, accessKey, connected }: {
  tab: Tab; setTab: (t: Tab) => void; accessKey: string; connected: boolean
}) {
  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: '#060A18',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0, left: 0, bottom: 0,
      zIndex: 100,
      overflowY: 'auto',
    }}>

      {/* Logo */}
      <div style={{ padding: '26px 22px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30,
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, color: '#000', fontWeight: 800,
            flexShrink: 0,
          }}>B</div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-1)', lineHeight: 1.3 }}>
              BUSINESSAIOS
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.08em' }}>v1.3.0</div>
          </div>
        </div>
      </div>

      {/* Nav groups */}
      <nav style={{ flex: 1, padding: '18px 10px' }}>
        {NAV_GROUPS.map(group => (
          <div key={group.label} style={{ marginBottom: 28 }}>
            <div style={{
              fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase',
              letterSpacing: '0.16em', fontWeight: 600, padding: '0 10px', marginBottom: 8,
            }}>
              {group.label}
            </div>
            {group.items.map(item => {
              const active = tab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px',
                    borderRadius: 7,
                    border: 'none',
                    background: active ? 'rgba(0,229,204,0.08)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    position: 'relative',
                    marginBottom: 2,
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  {active && (
                    <div style={{
                      position: 'absolute', left: 0, top: '22%', bottom: '22%',
                      width: 2, background: 'var(--primary)', borderRadius: 2,
                    }} />
                  )}
                  <span style={{ fontSize: 11, width: 16, textAlign: 'center', flexShrink: 0, color: active ? 'var(--primary)' : 'var(--text-3)' }}>
                    {item.icon}
                  </span>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? 'var(--primary)' : 'var(--text-2)', lineHeight: 1.3, whiteSpace: 'nowrap' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-3)', lineHeight: 1.2, whiteSpace: 'nowrap', marginTop: 1 }}>
                      {item.desc}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: connected ? 'var(--primary)' : 'var(--red)',
              display: 'inline-block', flexShrink: 0,
            }} />
            <span style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 500 }}>
              {connected ? 'Conectado' : 'Offline'}
            </span>
          </div>
          <button
            onClick={() => { localStorage.removeItem('baios_access_key'); window.location.reload() }}
            style={{
              fontSize: 9, color: 'var(--text-3)', background: 'transparent', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em',
              textTransform: 'uppercase', transition: 'color 0.15s',
            }}
            onMouseEnter={e => ((e.target as HTMLElement).style.color = 'var(--red)')}
            onMouseLeave={e => ((e.target as HTMLElement).style.color = 'var(--text-3)')}
          >
            Salir
          </button>
        </div>
        <div style={{
          fontSize: 9, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace",
          background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: 5,
          border: '1px solid rgba(255,255,255,0.06)', letterSpacing: '0.04em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {accessKey.slice(0, 18)}…
        </div>
      </div>
    </aside>
  )
}

// ── Dashboard shell ───────────────────────────────────────────
function Dashboard({ accessKey }: { accessKey: string }) {
  const [tab, setTab] = useState<Tab>('overview')
  const { connected } = useWebSocket()
  const meta = PAGE_META[tab]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Sidebar tab={tab} setTab={setTab} accessKey={accessKey} connected={connected} />

      {/* Main */}
      <main style={{ marginLeft: 220, flex: 1, minHeight: '100vh', position: 'relative', zIndex: 1 }}>

        {/* Page header */}
        <div style={{
          padding: '32px 48px 26px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          position: 'sticky', top: 0,
          background: 'rgba(4, 9, 26, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          zIndex: 40,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 500, color: 'var(--text-1)', letterSpacing: '-0.02em', marginBottom: 4 }}>
              {meta.title}
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 400 }}>{meta.desc}</p>
          </div>

          {/* Context actions per tab */}
          {tab === 'overview' && (
            <button
              onClick={() => setTab('execute')}
              style={{
                background: 'var(--primary)', color: '#000',
                border: 'none', padding: '10px 22px', borderRadius: 7,
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit', letterSpacing: '0.04em',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.9')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
            >
              ▶ Nueva Tarea
            </button>
          )}
          {tab === 'agents' && (
            <button
              onClick={() => setTab('execute')}
              style={{
                background: 'rgba(0,229,204,0.1)', color: 'var(--primary)',
                border: '1px solid rgba(0,229,204,0.25)', padding: '8px 18px', borderRadius: 7,
                fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                letterSpacing: '0.06em',
              }}
            >
              Asignar tarea →
            </button>
          )}
          {tab === 'arbitrage' && (
            <button
              onClick={() => setTab('execute')}
              style={{
                background: 'rgba(255,154,60,0.1)', color: '#FF9A3C',
                border: '1px solid rgba(255,154,60,0.25)', padding: '8px 18px', borderRadius: 7,
                fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                letterSpacing: '0.06em',
              }}
            >
              Analizar con agentes →
            </button>
          )}
          {tab === 'knowledge' && (
            <button
              onClick={() => setTab('execute')}
              style={{
                background: 'rgba(59,142,255,0.1)', color: 'var(--blue)',
                border: '1px solid rgba(59,142,255,0.25)', padding: '8px 18px', borderRadius: 7,
                fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                letterSpacing: '0.06em',
              }}
            >
              Generar conocimiento →
            </button>
          )}
          {tab === 'neuro' && (
            <button
              onClick={() => setTab('execute')}
              style={{
                background: 'rgba(0,200,150,0.1)', color: 'var(--green)',
                border: '1px solid rgba(0,200,150,0.25)', padding: '8px 18px', borderRadius: 7,
                fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                letterSpacing: '0.06em',
              }}
            >
              Ejecutar predicción →
            </button>
          )}
        </div>

        {/* Page content */}
        <div style={{ padding: '40px 48px', maxWidth: 1100 }}>
          {tab === 'overview'  && <Overview setTab={setTab} />}
          {tab === 'execute'   && <TaskExecutor />}
          {tab === 'chat'      && <AgentChat />}
          {tab === 'agents'    && <AgentGrid />}
          {tab === 'arbitrage' && <ArbitrageTable />}
          {tab === 'knowledge' && <KnowledgeExplorer />}
          {tab === 'neuro'     && <NeuroDashboard />}
          {tab === 'live'      && <LiveFeedFull />}
          {tab === 'saas'      && <SaasDashboard />}
          {tab === 'skills'    && <SkillsMarketplace />}
          {tab === 'security'  && <SecurityDashboard />}
        </div>
      </main>
    </div>
  )
}

export default function App() {
  const [accessKey, setAccessKey] = useState<string | null>(null)
  if (!accessKey) return <LoginGate onAuth={setAccessKey} />
  return <Dashboard accessKey={accessKey} />
}
