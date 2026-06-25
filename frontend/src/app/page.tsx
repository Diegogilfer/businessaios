'use client'
import { useState, useCallback } from 'react'
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

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview',   label: 'Overview',    icon: '◈' },
  { id: 'execute',    label: 'Execute',     icon: '▶' },
  { id: 'agents',     label: 'Agents',      icon: '⬡' },
  { id: 'arbitrage',  label: 'Arbitrage',   icon: '◆' },
  { id: 'knowledge',  label: 'Knowledge',   icon: '◎' },
  { id: 'live',       label: 'Live',        icon: '◉' },
  { id: 'chat',       label: 'Chat',        icon: '◷' },
  { id: 'saas',       label: 'SaaS',        icon: '▲' },
  { id: 'neuro',      label: 'NeuroIA',     icon: '◈' },
  { id: 'skills',     label: 'Skills',      icon: '◇' },
  { id: 'security',   label: 'Security',    icon: '⬡' },
]

const AGENT_COLORS: Record<string, string> = {
  ceo:        '#00E5CC',
  research:   '#7B5CFF',
  commercial: '#3B8EFF',
  content:    '#FF9A3C',
  finance:    '#00C896',
  operations: '#FF4566',
}

function AgentBar({ role }: { role: string }) {
  const ag = AGENTS[role as keyof typeof AGENTS]
  const color = AGENT_COLORS[role] ?? ag.color
  const width = 65 + Math.floor(Math.random() * 28)
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color, fontSize: 13 }}>{ag.icon}</span>
          <span style={{ fontWeight: 500 }}>{ag.label}</span>
        </span>
        <span style={{ fontSize: 10, color, fontFamily: 'JetBrains Mono', fontWeight: 500 }}>{width}%</span>
      </div>
      <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${width}%`, background: `linear-gradient(90deg, ${color}88, ${color})`,
          borderRadius: 2, transition: 'width 1.4s cubic-bezier(.16,1,.3,1)',
          boxShadow: `0 0 8px ${color}55`,
        }} />
      </div>
    </div>
  )
}

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: connected ? 'var(--primary)' : 'var(--red)',
        boxShadow: connected ? '0 0 8px var(--primary-glow)' : 'none',
        display: 'inline-block',
        animation: connected ? 'pulse-glow 2s ease infinite' : 'none',
      }} />
      <span style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 500 }}>
        {connected ? 'Live' : 'Offline'}
      </span>
    </div>
  )
}

function Overview() {
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
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 300, color: 'var(--text-1)', letterSpacing: '-0.03em', marginBottom: 4 }}>
          Executive Dashboard
        </h1>
        <p style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 400 }}>
          Sistema autónomo multi-agente · actualización cada 10s
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        <KpiCard label="Health Score"   value={hd?.health_score}  suffix="%" accent="var(--primary)" sub="Sistema operativo" />
        <KpiCard label="Completadas"    value={ed?.completed}               accent="var(--violet)"  sub={`de ${ed?.total_executions ?? 0} totales`} />
        <KpiCard label="Quality Score"  value={ed?.avg_quality}   decimals={2} accent="var(--blue)"  sub="promedio 7 días" />
        <KpiCard label="Conocimiento"   value={kd?.total_entries}           accent="var(--amber)"  sub={`+${kd?.new_this_week ?? 0} esta semana`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="glass" style={{ borderRadius: 'var(--radius-lg)', padding: 24 }}>
          <p style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 22, fontWeight: 600 }}>
            Performance de Agentes
          </p>
          {Object.keys(AGENTS).map(r => <AgentBar key={r} role={r} />)}
        </div>
        <LiveFeedMini />
      </div>
    </div>
  )
}

function Dashboard({ accessKey }: { accessKey: string }) {
  const [tab, setTab] = useState<Tab>('overview')
  const { connected } = useWebSocket()

  function logout() {
    localStorage.removeItem('baios_access_key')
    window.location.reload()
  }

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', color: 'var(--text-1)', position: 'relative', zIndex: 1 }}>

      {/* Header */}
      <div style={{
        borderBottom: '1px solid var(--glass-border)',
        padding: '0 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        position: 'sticky',
        top: 0,
        background: 'rgba(4, 9, 26, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 180 }}>
          <div style={{
            width: 30, height: 30,
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: '#000', fontWeight: 700,
            boxShadow: '0 0 16px var(--primary-glow)',
          }}>⬡</div>
          <div>
            <span style={{ fontWeight: 700, letterSpacing: '0.08em', fontSize: 12, color: 'var(--text-1)' }}>BUSINESSAIOS</span>
            <span style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.15em', marginLeft: 8 }}>v1.3.0</span>
          </div>
        </div>

        {/* Tabs */}
        <nav style={{ display: 'flex', gap: 2 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: tab === t.id ? 'rgba(0,229,204,0.08)' : 'transparent',
                border: tab === t.id ? '1px solid rgba(0,229,204,0.2)' : '1px solid transparent',
                color: tab === t.id ? 'var(--primary)' : 'var(--text-3)',
                padding: '5px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 10,
                cursor: 'pointer',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                transition: 'var(--transition)',
                fontFamily: 'inherit',
                fontWeight: tab === t.id ? 600 : 400,
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <span style={{ fontSize: 10, opacity: 0.7 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 180, justifyContent: 'flex-end' }}>
          <StatusBadge connected={connected} />
          <span style={{
            fontSize: 10, color: 'var(--text-3)',
            fontFamily: "'JetBrains Mono', monospace",
            background: 'rgba(255,255,255,0.04)',
            padding: '4px 10px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--glass-border)',
          }}>
            {accessKey.slice(0, 14)}…
          </span>
          <button
            onClick={logout}
            style={{
              background: 'transparent',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-3)',
              padding: '4px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 9,
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              transition: 'var(--transition)',
              fontWeight: 500,
            }}
          >
            Salir
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '32px 28px', maxWidth: 1240, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {tab === 'overview'   && <Overview />}
        {tab === 'execute'    && (
          <div className="animate-fade-in" style={{ maxWidth: 680 }}>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 20, fontWeight: 300, color: 'var(--text-1)', marginBottom: 4 }}>Ejecutar Tarea</h2>
              <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Los 6 agentes colaboran en paralelo → CEO consolida el resultado</p>
            </div>
            <TaskExecutor onSuccess={() => setTab('overview')} />
          </div>
        )}
        {tab === 'agents'     && <AgentGrid />}
        {tab === 'arbitrage'  && <ArbitrageTable />}
        {tab === 'knowledge'  && <KnowledgeExplorer />}
        {tab === 'live'       && <LiveFeedFull />}
        {tab === 'chat'       && <AgentChat />}
        {tab === 'saas'       && <SaasDashboard />}
        {tab === 'neuro'      && <NeuroDashboard />}
        {tab === 'skills'     && <SkillsMarketplace />}
        {tab === 'security'   && <SecurityDashboard />}
      </div>
    </div>
  )
}

export default function App() {
  const [accessKey, setAccessKey] = useState<string | null>(null)
  if (!accessKey) return <LoginGate onAuth={setAccessKey} />
  return <Dashboard accessKey={accessKey} />
}
