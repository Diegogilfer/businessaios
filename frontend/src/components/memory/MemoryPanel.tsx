'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePoll } from '@/hooks/usePoll'
import { getKnowledgeRecent, getKnowledgeStats, getKnowledgeByAgent } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────
type Entry = {
  id: string
  title: string
  category: string
  source_agent: string | null
  tags: string[]
  created_at: string
}
type Stats = {
  total: number
  today: number
  by_agent: Record<string, number>
}

// ── Agent config ──────────────────────────────────────────────
const AGENTS = [
  { id: 'all',        label: 'Todo',       color: '#8B5CF6', icon: '∞' },
  { id: 'ceo',        label: 'CEO',        color: '#F59E0B', icon: 'C' },
  { id: 'research',   label: 'Research',   color: '#6366F1', icon: 'R' },
  { id: 'commercial', label: 'Commercial', color: '#10B981', icon: 'Co' },
  { id: 'content',    label: 'Content',    color: '#EC4899', icon: 'Ct' },
  { id: 'finance',    label: 'Finance',    color: '#EF4444', icon: 'Fi' },
  { id: 'operations', label: 'Operations', color: '#F59E0B', icon: 'Op' },
]

const CAT_COLORS: Record<string, string> = {
  chat_training:  '#8B5CF6',
  market_research: '#6366F1',
  strategy:       '#F59E0B',
  sales:          '#10B981',
  content:        '#EC4899',
  finance:        '#EF4444',
  operations:     '#64748B',
  general:        '#64748B',
}

function agentColor(role: string | null): string {
  return AGENTS.find(a => a.id === role)?.color ?? '#64748B'
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// ── Entry card ────────────────────────────────────────────────
function EntryCard({ entry, isNew }: { entry: Entry; isNew: boolean }) {
  const color = agentColor(entry.source_agent)
  const catColor = CAT_COLORS[entry.category] ?? '#64748B'

  return (
    <div style={{
      padding: '10px 14px',
      borderRadius: 10,
      border: `1px solid ${isNew ? `${color}40` : 'rgba(255,255,255,0.05)'}`,
      background: isNew ? `${color}06` : 'rgba(255,255,255,0.02)',
      display: 'flex', gap: 10, alignItems: 'flex-start',
      animation: isNew ? 'fadeUp 0.35s var(--ease) both' : 'none',
      transition: 'border-color 0.3s',
    }}>
      {/* Agent dot */}
      <div style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        background: `${color}18`, border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 700, color,
        marginTop: 1,
      }}>
        {AGENTS.find(a => a.id === entry.source_agent)?.icon ?? '?'}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
          <p style={{
            fontSize: 11, fontWeight: 500, color: 'var(--text-1)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {entry.title}
          </p>
          <span style={{ fontSize: 9, color: 'var(--text-3)', flexShrink: 0 }}>
            {timeAgo(entry.created_at)}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 8, fontWeight: 600, padding: '1px 6px', borderRadius: 3,
            background: `${catColor}15`, color: catColor,
          }}>{entry.category.replace('_', ' ')}</span>
          {entry.tags?.slice(0, 2).map(t => (
            <span key={t} style={{
              fontSize: 8, padding: '1px 5px', borderRadius: 3,
              background: 'rgba(255,255,255,0.05)', color: 'var(--text-3)',
            }}>{t}</span>
          ))}
          {isNew && (
            <span style={{
              fontSize: 8, fontWeight: 700, padding: '1px 6px', borderRadius: 3,
              background: `${color}20`, color,
            }}>NUEVO</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Agent stats bar ───────────────────────────────────────────
function AgentStatBar({
  agent, count, total, selected, onClick,
}: {
  agent: typeof AGENTS[0]; count: number; total: number
  selected: boolean; onClick: () => void
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 10px', borderRadius: 8, width: '100%',
        background: selected ? `${agent.color}12` : 'transparent',
        border: `1px solid ${selected ? `${agent.color}40` : 'transparent'}`,
        cursor: 'pointer', fontFamily: 'inherit',
        transition: 'var(--transition)', textAlign: 'left',
      }}
      onMouseEnter={e => {
        if (!selected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
      }}
      onMouseLeave={e => {
        if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: 5, flexShrink: 0,
        background: `${agent.color}18`, border: `1px solid ${agent.color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 8, fontWeight: 700, color: agent.color,
      }}>{agent.icon}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 10, color: selected ? agent.color : 'var(--text-1)', fontWeight: 500 }}>{agent.label}</span>
          <span style={{ fontSize: 10, color: agent.color, fontWeight: 600 }}>{count}</span>
        </div>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`, background: agent.color, borderRadius: 99,
            transition: 'width 0.8s var(--ease)',
          }} />
        </div>
      </div>
    </button>
  )
}

// ── Main panel ────────────────────────────────────────────────
export default function MemoryPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selectedAgent, setSelectedAgent] = useState('all')
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set())
  const feedRef = useRef<HTMLDivElement>(null)

  // Stats poll (30s)
  const statsFn = useCallback(() => getKnowledgeStats(), [])
  const { data: statsRaw } = usePoll(statsFn, 30000)
  const stats = statsRaw as Stats | null

  // Feed poll (5s)
  const feedFn = useCallback(
    () => selectedAgent === 'all'
      ? getKnowledgeRecent(25)
      : getKnowledgeByAgent(selectedAgent, 25),
    [selectedAgent]
  )
  const { data: feedRaw } = usePoll(feedFn, 5000)
  const entries = (feedRaw as Entry[] | null) ?? []

  // Track new entries for animation
  useEffect(() => {
    if (!entries.length) return
    const newIds = new Set(entries.map(e => e.id))
    setKnownIds(prev => {
      const merged = new Set(prev)
      newIds.forEach(id => merged.add(id))
      return merged
    })
  }, [entries])

  const total = stats?.total ?? 0
  const agentsForStats = AGENTS.filter(a => a.id !== 'all')

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 998,
          background: 'rgba(2,6,23,0.6)',
          backdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 480, zIndex: 999,
        background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--glass-border)',
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s var(--ease)',
        boxShadow: open ? '-24px 0 80px rgba(2,6,23,0.7)' : 'none',
      }}>

        {/* Header */}
        <div style={{
          padding: '18px 20px',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex', alignItems: 'center', gap: 12,
          flexShrink: 0,
        }}>
          {/* Live dot */}
          <div style={{ position: 'relative', width: 10, height: 10, flexShrink: 0 }}>
            <div className="pulse-ring" style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: '1.5px solid #10B981', opacity: 0.5 }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
          </div>

          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
              Memoria en Vivo
            </p>
            <p style={{ fontSize: 10, color: 'var(--text-3)' }}>
              {total} entradas · {stats?.today ?? 0} hoy · actualiza cada 5s
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-2)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontFamily: 'inherit', flexShrink: 0,
            }}
          >×</button>
        </div>

        {/* Agent stats sidebar */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--glass-border)',
          flexShrink: 0,
        }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 8 }}>
            Por agente
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* All button */}
            <button
              onClick={() => setSelectedAgent('all')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', borderRadius: 7, width: '100%',
                background: selectedAgent === 'all' ? 'rgba(139,92,246,0.12)' : 'transparent',
                border: `1px solid ${selectedAgent === 'all' ? 'rgba(139,92,246,0.35)' : 'transparent'}`,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: 5, flexShrink: 0,
                background: 'rgba(139,92,246,0.18)', color: '#8B5CF6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700,
              }}>∞</div>
              <span style={{ fontSize: 10, color: selectedAgent === 'all' ? '#8B5CF6' : 'var(--text-1)', fontWeight: 500 }}>
                Todos los agentes
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: '#8B5CF6', fontWeight: 600 }}>{total}</span>
            </button>

            {agentsForStats.map(ag => (
              <AgentStatBar
                key={ag.id}
                agent={ag}
                count={stats?.by_agent?.[ag.id] ?? 0}
                total={total}
                selected={selectedAgent === ag.id}
                onClick={() => setSelectedAgent(ag.id)}
              />
            ))}
          </div>
        </div>

        {/* Feed */}
        <div
          ref={feedRef}
          style={{
            flex: 1, overflowY: 'auto', padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}
        >
          {entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 8 }}>Sin entradas todavía</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)' }}>
                Empieza a chatear con cualquier agente y su conocimiento aparecerá aquí en tiempo real
              </p>
            </div>
          ) : (
            entries.map(entry => (
              <EntryCard
                key={entry.id}
                entry={entry}
                isNew={!knownIds.has(entry.id)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--glass-border)',
          display: 'flex', alignItems: 'center', gap: 8,
          flexShrink: 0,
        }}>
          <div style={{
            flex: 1, height: 4, borderRadius: 99,
            background: 'rgba(255,255,255,0.05)', overflow: 'hidden',
            display: 'flex',
          }}>
            {agentsForStats.map(ag => {
              const pct = total > 0 ? ((stats?.by_agent?.[ag.id] ?? 0) / total) * 100 : 0
              return (
                <div key={ag.id} style={{
                  height: '100%', width: `${pct}%`,
                  background: ag.color, transition: 'width 0.8s var(--ease)',
                }} />
              )
            })}
          </div>
          <span style={{ fontSize: 9, color: 'var(--text-3)', flexShrink: 0 }}>
            Conocimiento circulatorio activo
          </span>
        </div>
      </div>
    </>
  )
}
