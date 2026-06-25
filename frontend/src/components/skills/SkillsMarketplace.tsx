'use client'
import { useState, useCallback } from 'react'
import { usePoll } from '@/hooks/usePoll'
import { AGENTS } from '@/lib/constants'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

type Skill = {
  name: string; title: string; description: string
  category: string; agent_roles: string[]; tags: string[]
  installs: number; rating: number; price: number; is_premium: boolean
  prompt_template?: string
}
type Stats = { total_skills: number; by_category: Record<string, number>; free_skills: number; premium_skills: number; top_installs: Array<{ name: string; title: string; installs: number }> }

const CAT_COLORS: Record<string, string> = {
  analysis:   '#4af0c8',
  finance:    '#4a9cf0',
  content:    '#c44af0',
  sales:      '#f0a44a',
  operations: '#f04a6c',
  custom:     '#c8f04a',
}
const CAT_ICONS: Record<string, string> = {
  analysis: '◈', finance: '◇', content: '◉', sales: '◆', operations: '◎', custom: '⬡',
}

function SkillCard({ skill, installed, onInstall, onExecute }: {
  skill: Skill
  installed: boolean
  onInstall: () => void
  onExecute: () => void
}) {
  const c = CAT_COLORS[skill.category] ?? '#888'
  const ic = CAT_ICONS[skill.category]  ?? '○'
  return (
    <div style={{
      background: '#0d0d0d',
      border: `1px solid ${c}${installed ? '40' : '18'}`,
      borderTop: `2px solid ${c}`,
      borderRadius: 2, padding: 18,
      transition: 'all .2s', position: 'relative',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${c}44` }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `${c}${installed ? '40' : '18'}` }}
    >
      {installed && (
        <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 9, padding: '1px 7px', borderRadius: 20, background: `${c}20`, color: c, border: `1px solid ${c}40`, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          ✓ Instalado
        </span>
      )}
      {skill.is_premium && !installed && (
        <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 9, padding: '1px 7px', borderRadius: 20, background: '#c8f04a18', color: '#c8f04a', border: '1px solid #c8f04a30' }}>
          ★ Premium
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16, color: c }}>{ic}</span>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#ddd', margin: 0 }}>{skill.title}</p>
          <p style={{ fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{skill.category}</p>
        </div>
      </div>
      <p style={{ fontSize: 11, color: '#555', lineHeight: 1.6, marginBottom: 12 }}>{skill.description}</p>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
        {skill.agent_roles.map(r => {
          const ag = AGENTS[r as keyof typeof AGENTS]
          return ag ? (
            <span key={r} style={{ fontSize: 9, padding: '1px 7px', borderRadius: 20, background: `${ag.color}12`, color: ag.color, border: `1px solid ${ag.color}28` }}>
              {ag.icon} {ag.label}
            </span>
          ) : null
        })}
        {skill.tags.slice(0, 2).map(t => (
          <span key={t} style={{ fontSize: 9, padding: '1px 7px', borderRadius: 20, background: '#111', color: '#333', border: '1px solid #1a1a1a' }}>{t}</span>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 10, color: '#333' }}>↓ {skill.installs.toLocaleString()} instalaciones</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: skill.price > 0 ? '#c8f04a' : '#4af0c8', fontFamily: 'monospace' }}>
          {skill.price > 0 ? `$${skill.price}/mo` : 'Gratis'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button onClick={onInstall} style={{
          background: installed ? '#0a0a0a' : `${c}15`,
          border: `1px solid ${c}${installed ? '20' : '40'}`,
          color: installed ? '#333' : c,
          padding: '7px', borderRadius: 2, fontSize: 10,
          fontWeight: 700, cursor: installed ? 'default' : 'pointer',
          textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'inherit', transition: 'all .2s',
        }}>
          {installed ? '✓ Instalado' : '+ Instalar'}
        </button>
        <button onClick={onExecute} style={{
          background: '#c8f04a15', border: '1px solid #c8f04a30', color: '#c8f04a',
          padding: '7px', borderRadius: 2, fontSize: 10,
          fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'inherit', transition: 'all .2s',
        }}>
          ▶ Ejecutar
        </button>
      </div>
    </div>
  )
}

function ExecuteModal({ skill, onClose }: { skill: Skill; onClose: () => void }) {
  const [params,  setParams]  = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState<string | null>(null)
  const [error,   setError]   = useState('')

  // Extraer parámetros del template
  const paramNames = Array.from(new Set(
    [...(skill.prompt_template?.matchAll(/\{(\w+)\}/g) ?? [])].map(m => m[1])
  ))

  async function execute() {
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await apiFetch<{ result: string }>('/skills/execute', {
        method: 'POST',
        body:   JSON.stringify({ skill_name: skill.name, params }),
      })
      setResult(r.result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    }
    setLoading(false)
  }

  const c = CAT_COLORS[skill.category] ?? '#888'

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000000cc', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#0d0d0d', border: `1px solid ${c}30`, borderRadius: 2, padding: 28, width: '100%', maxWidth: 600, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#eee', margin: 0 }}>{skill.title}</p>
            <p style={{ fontSize: 10, color: '#333', marginTop: 3 }}>{skill.description}</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#555', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        {!result ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {paramNames.map(p => (
              <div key={p}>
                <p style={{ fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{p.replace(/_/g, ' ')}</p>
                <textarea
                  style={{ width: '100%', background: '#0a0a0a', border: '1px solid #1e1e1e', color: '#ccc', padding: '10px 12px', borderRadius: 2, fontSize: 12, outline: 'none', resize: 'vertical', minHeight: 60, fontFamily: 'inherit', transition: 'border-color .2s' }}
                  placeholder={`Ingresa ${p.replace(/_/g, ' ')}...`}
                  value={params[p] ?? ''}
                  onChange={e => setParams(prev => ({ ...prev, [p]: e.target.value }))}
                  onFocus={e => (e.target.style.borderColor = c)}
                  onBlur={e => (e.target.style.borderColor = '#1e1e1e')}
                />
              </div>
            ))}
            {error && <p style={{ fontSize: 11, color: '#f04a6c', fontFamily: 'monospace' }}>{error}</p>}
            <button onClick={execute} disabled={loading} style={{
              background: loading ? '#141414' : c, color: '#000', border: 'none',
              padding: '12px', borderRadius: 2, fontSize: 12, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.08em',
              textTransform: 'uppercase', fontFamily: 'inherit', transition: 'all .2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {loading ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span> Ejecutando...</> : `▶ Ejecutar ${skill.title}`}
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 10, color: c, textTransform: 'uppercase', letterSpacing: '0.1em' }}>✓ Resultado</span>
              <button onClick={() => setResult(null)} style={{ background: 'transparent', border: '1px solid #222', color: '#555', padding: '3px 10px', borderRadius: 2, fontSize: 9, cursor: 'pointer', fontFamily: 'inherit' }}>Volver</button>
            </div>
            <div style={{ background: '#0a110a', border: `1px solid ${c}20`, borderRadius: 2, padding: 18 }}>
              <p style={{ fontSize: 12, color: '#bbb', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{result}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SkillsMarketplace() {
  const [filter,      setFilter]      = useState('all')
  const [search,      setSearch]      = useState('')
  const [installed,   setInstalled]   = useState<Set<string>>(new Set())
  const [executing,   setExecuting]   = useState<Skill | null>(null)
  const [installMsg,  setInstallMsg]  = useState('')

  const catalogFetcher   = useCallback(() => apiFetch<{ skills: Skill[]; stats: Stats }>('/skills/catalog'), [])
  const installedFetcher = useCallback(() => apiFetch<{ installed: Skill[] }>('/skills/installed'), [])

  const { data: catalogData } = usePoll(catalogFetcher, 60000)
  const { data: installedData, refetch: refetchInstalled } = usePoll(installedFetcher, 30000)

  const catalog  = (catalogData  as { skills: Skill[]; stats: Stats } | null)
  const stats    = catalog?.stats
  const allSkills = catalog?.skills ?? []

  // Sincronizar instalados
  const installedNames = new Set((installedData as { installed: Skill[] } | null)?.installed?.map(s => s.name) ?? [])

  const cats = ['all', ...Object.keys(CAT_COLORS)]
  const shown = allSkills.filter(s => {
    const catOk  = filter === 'all' || s.category === filter
    const searchOk = !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase())
    return catOk && searchOk
  })

  async function handleInstall(skill: Skill) {
    const r = await apiFetch<{ success: boolean; message: string }>('/skills/install', {
      method: 'POST', body: JSON.stringify({ skill_name: skill.name }),
    })
    setInstallMsg(r.message ?? '')
    refetchInstalled()
    setTimeout(() => setInstallMsg(''), 3000)
  }

  return (
    <div className="animate-fade-in">
      {executing && <ExecuteModal skill={executing} onClose={() => setExecuting(null)} />}

      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 300, color: '#eee' }}>Skills Marketplace</h2>
          <p style={{ fontSize: 11, color: '#2a2a2a', marginTop: 3 }}>Blueprint Fase 3 — {stats?.total_skills ?? 0} skills · {stats?.free_skills ?? 0} gratis · {stats?.premium_skills ?? 0} premium</p>
        </div>
        {installMsg && <span style={{ fontSize: 11, color: '#c8f04a', fontFamily: 'monospace' }}>{installMsg}</span>}
      </div>

      {/* Stats rápidas */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 20 }}>
          {stats.top_installs.map(s => (
            <div key={s.name} style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 2, padding: '10px 14px' }}>
              <p style={{ fontSize: 9, color: '#333', margin: '0 0 4px' }}>Top</p>
              <p style={{ fontSize: 11, color: '#888', margin: 0, fontWeight: 600 }}>{s.title}</p>
              <p style={{ fontSize: 10, color: '#444', margin: '2px 0 0', fontFamily: 'monospace' }}>↓ {s.installs}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          style={{ background: '#0a0a0a', border: '1px solid #1e1e1e', color: '#ccc', padding: '6px 12px', borderRadius: 2, fontSize: 11, outline: 'none', fontFamily: 'inherit', width: 180 }}
          placeholder="Buscar skill..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
        {cats.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)} style={{
            background: filter === cat ? '#141414' : 'transparent',
            border: filter === cat ? `1px solid ${CAT_COLORS[cat] ?? '#555'}44` : '1px solid transparent',
            color: filter === cat ? (CAT_COLORS[cat] ?? '#c8f04a') : '#444',
            padding: '5px 12px', borderRadius: 2, fontSize: 10,
            cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'inherit',
          }}>
            {cat === 'all' ? 'Todos' : `${CAT_ICONS[cat] ?? '○'} ${cat}`}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {shown.map(skill => (
          <SkillCard
            key={skill.name}
            skill={skill}
            installed={installedNames.has(skill.name)}
            onInstall={() => handleInstall(skill)}
            onExecute={() => setExecuting(skill)}
          />
        ))}
      </div>
      {shown.length === 0 && (
        <p style={{ color: '#2a2a2a', fontSize: 12, textAlign: 'center', padding: 40 }}>Sin skills para este filtro</p>
      )}
    </div>
  )
}
