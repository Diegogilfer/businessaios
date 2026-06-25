'use client'
import { useState, useCallback } from 'react'
import LoginGate from '@/components/auth/LoginGate'
import { usePoll } from '@/hooks/usePoll'
import { useWebSocket } from '@/hooks/useWebSocket'
import { getAnalyticsHealth, getAnalyticsExecs, getAnalyticsKnowledge } from '@/lib/api'
import KpiCard from '@/components/ui/KpiCard'
import Tooltip from '@/components/ui/Tooltip'
import { LiveFeedMini } from '@/components/dashboard/LiveFeed'
import TaskExecutor from '@/components/tasks/TaskExecutor'
import ProjectsView from '@/components/tasks/ProjectsView'
import AgentGrid from '@/components/agents/AgentGrid'
import ArbitrageTable from '@/components/arbitrage/ArbitrageTable'
import KnowledgeExplorer from '@/components/knowledge/KnowledgeExplorer'
import SaasDashboard from '@/components/saas/SaasDashboard'
import NeuroDashboard from '@/components/neuro/NeuroDashboard'
import SecurityDashboard from '@/components/security/SecurityDashboard'
import CompanionModal from '@/components/companion/CompanionModal'
import CompanionPanel from '@/components/companion/CompanionPanel'
import { AgentThemeProvider, useAgentTheme } from '@/contexts/AgentThemeContext'
import { AGENTS } from '@/lib/constants'

type Tab = 'overview' | 'execute' | 'projects' | 'agents' | 'arbitrage' | 'knowledge' | 'neuro' | 'saas' | 'security'

// ── Navigation ────────────────────────────────────────────────
const NAV: { label: string; items: { id: Tab; label: string; desc: string }[] }[] = [
  {
    label: 'Principal',
    items: [
      { id: 'overview',  label: 'Overview',      desc: 'Dashboard ejecutivo' },
      { id: 'execute',   label: 'Ejecutar',       desc: 'Nueva tarea' },
      { id: 'projects',  label: 'Proyectos',      desc: 'Historial de tareas' },
    ],
  },
  {
    label: 'Inteligencia',
    items: [
      { id: 'agents',    label: 'Agentes',        desc: 'Estado y performance' },
      { id: 'arbitrage', label: 'Arbitraje',      desc: 'Oportunidades ROI' },
      { id: 'knowledge', label: 'Conocimiento',   desc: 'Base de datos' },
      { id: 'neuro',     label: 'NeuroIA',        desc: 'Predicciones' },
    ],
  },
  {
    label: 'Plataforma',
    items: [
      { id: 'saas',      label: 'SaaS',           desc: 'Planes y billing' },
      { id: 'security',  label: 'Seguridad',      desc: 'Auditoría activa' },
    ],
  },
]

const PAGE_META: Record<Tab, { title: string; desc: string; howto: string }> = {
  overview:  { title: 'Dashboard',       desc: 'Resumen ejecutivo del sistema autónomo',                              howto: 'Visualiza métricas clave y lanza acciones desde los atajos rápidos.' },
  execute:   { title: 'Ejecutar Tarea',  desc: 'Los 6 agentes colaboran en paralelo → CEO consolida el resultado',   howto: 'Escribe título y descripción de lo que necesitas. Elige tu agente acompañante. El CEO consolida y el agente te guía paso a paso.' },
  projects:  { title: 'Proyectos',       desc: 'Historial de todas las tareas ejecutadas',                           howto: 'Aquí viven todos tus proyectos. Puedes ver el resultado completo de cada ejecución.' },
  agents:    { title: 'Agentes',         desc: 'Estado y performance de los 6 agentes especializados',              howto: 'Cada agente tiene un rol. Haz clic en uno para ver sus últimas ejecuciones.' },
  arbitrage: { title: 'Arbitraje',       desc: 'Oportunidades de importación detectadas automáticamente',           howto: 'Escanea categorías para encontrar productos con alto ROI entre Amazon y AliExpress.' },
  knowledge: { title: 'Conocimiento',    desc: 'Base de conocimiento generada y curada por los agentes',            howto: 'Busca análisis, estrategias y aprendizajes anteriores generados por tus agentes.' },
  neuro:     { title: 'NeuroIA',         desc: 'Predicciones de tendencias y análisis de patrones',                 howto: 'El sistema analiza patrones de tus ejecuciones y predice las mejores oportunidades.' },
  saas:      { title: 'SaaS',           desc: 'Planes, facturación y gestión de tenants',                          howto: 'Gestiona tu suscripción, revisa límites de uso y administra tenants.' },
  security:  { title: 'Seguridad',      desc: 'Auditoría activa y alertas del SecurityAgent',                      howto: 'El SecurityAgent monitorea el sistema. Revisa alertas y score de seguridad.' },
}

const QUICK_ACTIONS: { label: string; sub: string; tab: Tab; cta: string }[] = [
  { label: 'Ejecutar Tarea',    sub: 'Los 6 agentes colaboran en paralelo y el CEO consolida el resultado final con tu agente acompañante.',                  tab: 'execute',   cta: 'Ejecutar ahora' },
  { label: 'Ver Proyectos',     sub: 'Revisa el historial completo de tareas ejecutadas, sus resultados y el progreso de cada una.',                          tab: 'projects',  cta: 'Ver historial' },
  { label: 'Escanear Arbitraje',sub: 'Detecta productos con alto margen de importación entre Amazon y AliExpress. Resultado rankeado por ROI.',               tab: 'arbitrage', cta: 'Ver oportunidades' },
  { label: 'Base de Conocimiento', sub: 'Explora análisis, estrategias y aprendizajes acumulados por los agentes en ejecuciones anteriores.',                 tab: 'knowledge', cta: 'Explorar' },
]

const AGENT_PERF: Record<string, number> = {
  ceo: 88, research: 76, commercial: 83, content: 71, finance: 79, operations: 74,
}

function AgentBar({ role }: { role: string }) {
  const { theme } = useAgentTheme()
  const ag    = AGENTS[role as keyof typeof AGENTS]
  const width = AGENT_PERF[role] ?? 70
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Tooltip text={ag?.desc ?? ''} position="right">
          <span style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'default' }}>
            <span style={{ color: ag?.color, fontSize: 12 }}>{ag?.icon}</span>
            <span style={{ fontWeight: 500 }}>{ag?.label}</span>
          </span>
        </Tooltip>
        <span style={{ fontSize: 10, color: ag?.color, fontFamily: "'JetBrains Mono', monospace" }}>{width}%</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${width}%`,
          background: `linear-gradient(90deg, ${ag?.color}55, ${ag?.color}cc)`,
          borderRadius: 99, transition: 'width 1.4s cubic-bezier(.16,1,.3,1)',
        }} />
      </div>
    </div>
  )
}

// ── Overview ──────────────────────────────────────────────────
function Overview({ setTab }: { setTab: (t: Tab) => void }) {
  const { theme } = useAgentTheme()
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
          {QUICK_ACTIONS.map(a => (
            <div
              key={a.tab}
              style={{
                background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                borderRadius: 10, padding: '22px 20px',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                minHeight: 190, transition: 'border-color 0.2s, background 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${theme.color}35`; (e.currentTarget as HTMLElement).style.background = `${theme.color}04` }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--glass-border)'; (e.currentTarget as HTMLElement).style.background = 'var(--glass-bg)' }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 8, letterSpacing: '-0.01em' }}>
                  {a.label}
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.65 }}>{a.sub}</p>
              </div>
              <Tooltip text={`Ir a ${a.label}`} position="bottom">
                <button
                  onClick={() => setTab(a.tab)}
                  style={{
                    marginTop: 16, background: `${theme.color}10`, border: `1px solid ${theme.color}25`,
                    color: theme.color, padding: '8px 14px', borderRadius: 7,
                    fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    letterSpacing: '0.04em', width: '100%', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => ((e.target as HTMLElement).style.background = `${theme.color}1e`)}
                  onMouseLeave={e => ((e.target as HTMLElement).style.background = `${theme.color}10`)}
                >
                  {a.cta} →
                </button>
              </Tooltip>
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
          <Tooltip text="Ver estado detallado de cada agente" position="top">
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
          </Tooltip>
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
  const { theme, openModal } = useAgentTheme()

  return (
    <aside style={{
      width: 220, minHeight: '100vh',
      background: '#060A18',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: 0, bottom: 0,
      zIndex: 100, overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ padding: '26px 22px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 7, flexShrink: 0,
            background: `linear-gradient(135deg, ${theme.color}cc, ${theme.secondary}aa)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, color: '#000',
          }}>
            B
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-1)', lineHeight: 1.3 }}>
              BUSINESSAIOS
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.08em' }}>v1.3.0</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '18px 10px' }}>
        {NAV.map(group => (
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
                <Tooltip key={item.id} text={item.desc} position="right">
                  <button
                    onClick={() => setTab(item.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 7, border: 'none',
                      background: active ? `${theme.color}0d` : 'transparent',
                      cursor: 'pointer', transition: 'background 0.15s',
                      textAlign: 'left', fontFamily: 'inherit',
                      position: 'relative', marginBottom: 2,
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    {active && (
                      <div style={{
                        position: 'absolute', left: 0, top: '22%', bottom: '22%',
                        width: 2.5, background: theme.color, borderRadius: 2,
                      }} />
                    )}
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{
                        fontSize: 12, fontWeight: active ? 600 : 400,
                        color: active ? theme.color : 'var(--text-2)',
                        lineHeight: 1.3, whiteSpace: 'nowrap',
                      }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-3)', lineHeight: 1.2, marginTop: 1, whiteSpace: 'nowrap' }}>
                        {item.desc}
                      </div>
                    </div>
                  </button>
                </Tooltip>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Companion indicator */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <button
          onClick={openModal}
          style={{
            width: '100%', padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
            background: `${theme.color}09`, border: `1px solid ${theme.color}20`,
            display: 'flex', alignItems: 'center', gap: 9, fontFamily: 'inherit',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = `${theme.color}16`)}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = `${theme.color}09`)}
        >
          <span style={{ fontSize: 14, color: theme.color }}>{theme.icon}</span>
          <div style={{ textAlign: 'left', overflow: 'hidden' }}>
            <div style={{ fontSize: 10, color: theme.color, fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
              {theme.name}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-3)', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
              Cambiar agente
            </div>
          </div>
        </button>
      </div>

      {/* Footer */}
      <div style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: connected ? theme.color : 'var(--red)',
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
          background: 'rgba(255,255,255,0.03)', padding: '5px 9px', borderRadius: 5,
          border: '1px solid rgba(255,255,255,0.06)',
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
  const { theme }     = useAgentTheme()
  const meta          = PAGE_META[tab]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <CompanionModal />
      <Sidebar tab={tab} setTab={setTab} accessKey={accessKey} connected={connected} />

      <main style={{ marginLeft: 220, flex: 1, minHeight: '100vh', position: 'relative', zIndex: 1 }}>

        {/* Page header */}
        <div style={{
          padding: '30px 48px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          position: 'sticky', top: 0,
          background: 'rgba(4, 9, 26, 0.94)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          zIndex: 40,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        }}>
          <div>
            <h1 style={{
              fontSize: 22, fontWeight: 500, color: 'var(--text-1)',
              letterSpacing: '-0.02em', marginBottom: 4,
            }}>
              {meta.title}
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-2)' }}>{meta.desc}</p>
          </div>

          {/* Right: how-to widget + context CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* How-to tooltip */}
            <Tooltip text={meta.howto} position="bottom" maxWidth={280}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.09)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'default', color: 'var(--text-3)', fontSize: 11, fontWeight: 600,
              }}>
                ?
              </div>
            </Tooltip>

            {/* Context CTAs */}
            {tab === 'overview' && (
              <Tooltip text="Crear y ejecutar una nueva tarea con los 6 agentes" position="bottom">
                <button
                  onClick={() => setTab('execute')}
                  style={{
                    background: theme.color, color: '#000', border: 'none',
                    padding: '9px 20px', borderRadius: 7,
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'inherit', letterSpacing: '0.04em', transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.85')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                >
                  Nueva Tarea
                </button>
              </Tooltip>
            )}
            {tab === 'projects' && (
              <Tooltip text="Ejecutar una nueva tarea" position="bottom">
                <button
                  onClick={() => setTab('execute')}
                  style={{
                    background: `${theme.color}12`, color: theme.color,
                    border: `1px solid ${theme.color}28`, padding: '8px 16px',
                    borderRadius: 7, fontSize: 10, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.05em',
                  }}
                >
                  + Nueva tarea
                </button>
              </Tooltip>
            )}
            {tab === 'arbitrage' && (
              <Tooltip text="Analizar oportunidades con los agentes" position="bottom">
                <button
                  onClick={() => setTab('execute')}
                  style={{
                    background: 'rgba(240,164,74,0.10)', color: 'var(--amber)',
                    border: '1px solid rgba(240,164,74,0.25)', padding: '8px 16px',
                    borderRadius: 7, fontSize: 10, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Analizar con agentes →
                </button>
              </Tooltip>
            )}
            {tab === 'knowledge' && (
              <Tooltip text="Generar nuevo conocimiento ejecutando una tarea" position="bottom">
                <button
                  onClick={() => setTab('execute')}
                  style={{
                    background: 'rgba(74,156,240,0.10)', color: 'var(--blue)',
                    border: '1px solid rgba(74,156,240,0.25)', padding: '8px 16px',
                    borderRadius: 7, fontSize: 10, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Generar conocimiento →
                </button>
              </Tooltip>
            )}
            {(tab === 'agents' || tab === 'neuro') && (
              <Tooltip text="Asignar una tarea a un agente específico" position="bottom">
                <button
                  onClick={() => setTab('execute')}
                  style={{
                    background: `${theme.color}10`, color: theme.color,
                    border: `1px solid ${theme.color}25`, padding: '8px 16px',
                    borderRadius: 7, fontSize: 10, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Ejecutar tarea →
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '40px 48px', maxWidth: 1100 }}>
          {tab === 'overview'  && <Overview setTab={setTab} />}
          {tab === 'execute'   && <TaskExecutor />}
          {tab === 'projects'  && <ProjectsView />}
          {tab === 'agents'    && <AgentGrid />}
          {tab === 'arbitrage' && <ArbitrageTable />}
          {tab === 'knowledge' && <KnowledgeExplorer />}
          {tab === 'neuro'     && <NeuroDashboard />}
          {tab === 'saas'      && <SaasDashboard />}
          {tab === 'security'  && <SecurityDashboard />}
        </div>
      </main>

      {/* Companion floating panel */}
      <CompanionPanel currentTab={tab} />
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────
export default function App() {
  const [accessKey, setAccessKey] = useState<string | null>(null)
  if (!accessKey) return <LoginGate onAuth={setAccessKey} />
  return (
    <AgentThemeProvider>
      <Dashboard accessKey={accessKey} />
    </AgentThemeProvider>
  )
}
