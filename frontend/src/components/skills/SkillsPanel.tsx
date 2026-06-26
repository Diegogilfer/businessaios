'use client'
import { useCallback, useEffect, useState } from 'react'
import { usePoll } from '@/hooks/usePoll'
import {
  getSkillsCatalog, getInstalledSkills,
  installSkill, uninstallSkill, executeSkill, saveUserPrompt,
} from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────
type Skill = {
  name: string; title: string; description: string
  category: string; agent_roles: string[]; tags: string[]
  installs: number; rating: number; price: number; is_premium: boolean
  prompt_template?: string
}
type Tab = 'catalog' | 'installed' | 'prompt'

// ── Category config ───────────────────────────────────────────
const CATS: { id: string; label: string; color: string }[] = [
  { id: 'all',        label: 'Todos',      color: '#8B5CF6' },
  { id: 'analysis',   label: 'Análisis',   color: '#6366F1' },
  { id: 'content',    label: 'Contenido',  color: '#EC4899' },
  { id: 'finance',    label: 'Finanzas',   color: '#10B981' },
  { id: 'sales',      label: 'Ventas',     color: '#F59E0B' },
  { id: 'operations', label: 'Ops',        color: '#64748B' },
]

const AGENT_COLORS: Record<string, string> = {
  ceo: '#F59E0B', research: '#6366F1', commercial: '#10B981',
  content: '#EC4899', finance: '#EF4444', operations: '#64748B',
}

function catColor(cat: string) {
  return CATS.find(c => c.id === cat)?.color ?? '#64748B'
}

// ── Skill card ─────────────────────────────────────────────────
function SkillCard({
  skill, installed, accent,
  onInstall, onUninstall, onRun,
}: {
  skill: Skill; installed: boolean; accent: string
  onInstall: () => void; onUninstall: () => void; onRun: () => void
}) {
  const cc = catColor(skill.category)
  return (
    <div style={{
      background: installed ? `${accent}06` : 'var(--bg-card)',
      border: `1px solid ${installed ? `${accent}30` : 'var(--glass-border)'}`,
      borderRadius: 'var(--radius-md)',
      padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 8,
      transition: 'var(--transition)',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${accent}35` }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = installed ? `${accent}30` : 'var(--glass-border)' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{skill.title}</span>
            {skill.is_premium && (
              <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: '#F59E0B20', color: '#F59E0B' }}>PRO</span>
            )}
            {installed && (
              <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: `${accent}18`, color: accent }}>ACTIVO</span>
            )}
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-2)', lineHeight: 1.55 }}>{skill.description}</p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {skill.price > 0
            ? <span style={{ fontSize: 12, fontWeight: 600, color: '#F59E0B' }}>${skill.price}</span>
            : <span style={{ fontSize: 10, fontWeight: 600, color: '#10B981' }}>Gratis</span>
          }
          <p style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 1 }}>{skill.installs} installs</p>
        </div>
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 8, fontWeight: 600, padding: '1px 6px', borderRadius: 3, background: `${cc}15`, color: cc }}>
          {skill.category}
        </span>
        {skill.agent_roles.map(r => (
          <span key={r} style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: `${AGENT_COLORS[r] ?? '#64748B'}12`, color: AGENT_COLORS[r] ?? '#64748B' }}>
            {r}
          </span>
        ))}
        {skill.tags.map(t => (
          <span key={t} style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: 'rgba(255,255,255,0.05)', color: 'var(--text-3)' }}>
            {t}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
        {installed ? (
          <>
            <button
              onClick={onRun}
              style={{
                flex: 1, padding: '6px', borderRadius: 7,
                background: `${accent}14`, border: `1px solid ${accent}35`,
                color: accent, fontSize: 10, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'var(--transition)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${accent}22` }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${accent}14` }}
            >Ejecutar →</button>
            <button
              onClick={onUninstall}
              style={{
                padding: '6px 10px', borderRadius: 7,
                background: 'transparent', border: '1px solid rgba(239,68,68,0.25)',
                color: '#EF4444', fontSize: 10, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'var(--transition)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >Quitar</button>
          </>
        ) : (
          <button
            onClick={onInstall}
            style={{
              flex: 1, padding: '6px', borderRadius: 7,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-1)', fontSize: 10, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'var(--transition)',
            }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLElement).style.background = `${accent}12`
              ;(e.currentTarget as HTMLElement).style.borderColor = `${accent}35`
              ;(e.currentTarget as HTMLElement).style.color = accent
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'
              ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-1)'
            }}
          >+ Instalar</button>
        )}
      </div>
    </div>
  )
}

// ── Execute modal ──────────────────────────────────────────────
function ExecuteModal({
  skill, accent, onClose,
}: { skill: Skill; accent: string; onClose: () => void }) {
  const [params, setParams] = useState<Record<string, string>>({})
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Extract param names from template
  const template = skill.prompt_template ?? ''
  const paramNames = [...new Set([...template.matchAll(/\{(\w+)\}/g)].map(m => m[1]))]

  const run = async () => {
    setLoading(true); setErr(null); setResult(null)
    try {
      const r = await executeSkill(skill.name, params) as { result?: string; error?: string }
      if (r.error) setErr(r.error)
      else setResult(r.result ?? '')
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: 'rgba(2,6,23,0.8)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        width: '100%', maxWidth: 560, maxHeight: '80vh',
        background: 'var(--bg-surface)',
        border: `1px solid ${accent}30`,
        borderRadius: 'var(--radius-lg)',
        display: 'flex', flexDirection: 'column',
        boxShadow: `0 24px 80px rgba(2,6,23,0.8)`,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{skill.title}</p>
            <p style={{ fontSize: 10, color: 'var(--text-3)' }}>Agente: {skill.agent_roles[0]}</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: 7, width: 28, height: 28, cursor: 'pointer', color: 'var(--text-2)', fontSize: 14 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Params */}
          {paramNames.map(p => (
            <div key={p}>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 5, textTransform: 'capitalize' }}>
                {p.replace(/_/g, ' ')}
              </label>
              <textarea
                value={params[p] ?? ''}
                onChange={e => setParams(prev => ({ ...prev, [p]: e.target.value }))}
                placeholder={`Escribe ${p.replace(/_/g, ' ')}...`}
                rows={2}
                style={{
                  width: '100%', padding: '8px 10px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 8, color: 'var(--text-1)',
                  fontSize: 11, fontFamily: 'inherit', resize: 'vertical',
                  outline: 'none', transition: 'border-color 0.15s',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { e.target.style.borderColor = `${accent}50` }}
                onBlur={e => { e.target.style.borderColor = 'var(--glass-border)' }}
              />
            </div>
          ))}

          {/* Result */}
          {loading && (
            <div style={{ padding: '16px', background: `${accent}08`, borderRadius: 8, border: `1px solid ${accent}20` }}>
              <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 8, borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 14, width: '80%', marginBottom: 8, borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 14, width: '40%', borderRadius: 4 }} />
            </div>
          )}
          {err && (
            <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
              <p style={{ fontSize: 11, color: '#EF4444' }}>{err}</p>
            </div>
          )}
          {result && (
            <div style={{ padding: '12px 14px', background: `${accent}06`, border: `1px solid ${accent}20`, borderRadius: 8 }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: accent, letterSpacing: '0.08em', marginBottom: 8 }}>RESULTADO</p>
              <p style={{ fontSize: 11, color: 'var(--text-1)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{result}</p>
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--glass-border)', flexShrink: 0 }}>
          <button
            onClick={run}
            disabled={loading || paramNames.some(p => !params[p]?.trim())}
            style={{
              width: '100%', padding: '10px',
              background: loading ? 'rgba(255,255,255,0.05)' : `${accent}14`,
              border: `1px solid ${accent}35`,
              borderRadius: 8, color: accent,
              fontSize: 11, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'var(--transition)',
              opacity: paramNames.some(p => !params[p]?.trim()) ? 0.5 : 1,
            }}
          >{loading ? 'Ejecutando…' : `Ejecutar con ${skill.agent_roles[0]} agent →`}</button>
        </div>
      </div>
    </div>
  )
}

// ── Prompt tab ─────────────────────────────────────────────────
function PromptTab({ accent }: { accent: string }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const save = async () => {
    if (!title.trim() || !content.trim()) return
    setStatus('saving')
    try {
      await saveUserPrompt(title.trim(), content.trim())
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 3000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Banner */}
      <div style={{ padding: '12px 16px', background: `${accent}08`, border: `1px solid ${accent}25`, borderRadius: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: 7, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, flexShrink: 0 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        </div>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>Prompt de negocio permanente</p>
          <p style={{ fontSize: 10, color: 'var(--text-2)' }}>Se guarda en la memoria global — todos los agentes lo usarán como contexto permanente</p>
        </div>
      </div>

      {/* Examples */}
      <div>
        <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', marginBottom: 8 }}>EJEMPLOS RÁPIDOS</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            ['Mi empresa', 'Somos una tienda de ropa online enfocada en moda sostenible. Precio promedio $45, ticket recurrente. Target: mujeres 25-35.'],
            ['Mi nicho', 'Especialistas en suplementos deportivos veganos. Competidores: Myprotein, Optimum. Canal principal: Instagram.'],
            ['Mi meta', 'Alcanzar $10k MRR en Q3 2026. Actualmente en $3.2k. Canal de crecimiento: TikTok + afiliados.'],
          ].map(([t, c]) => (
            <button
              key={t}
              onClick={() => { setTitle(t); setContent(c) }}
              style={{
                padding: '7px 10px', borderRadius: 7, textAlign: 'left',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'var(--transition)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${accent}30`; (e.currentTarget as HTMLElement).style.background = `${accent}06` }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)' }}
            >
              <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>{t}</p>
              <p style={{ fontSize: 9, color: 'var(--text-3)', lineHeight: 1.5 }}>{c.slice(0, 70)}…</p>
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div>
        <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Título</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Ej: Mi negocio, Mi nicho, Mi meta…"
          style={{
            width: '100%', padding: '8px 10px', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
            borderRadius: 8, color: 'var(--text-1)', fontSize: 11,
            fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.target.style.borderColor = `${accent}50` }}
          onBlur={e => { e.target.style.borderColor = 'var(--glass-border)' }}
        />
      </div>
      <div>
        <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Contenido del prompt</label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Escribe toda la información de tu negocio, nicho, productos, clientes, metas… Los agentes usarán esto como contexto en todas sus respuestas."
          rows={6}
          style={{
            width: '100%', padding: '8px 10px', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
            borderRadius: 8, color: 'var(--text-1)', fontSize: 11,
            fontFamily: 'inherit', resize: 'vertical', outline: 'none',
            lineHeight: 1.6, transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.target.style.borderColor = `${accent}50` }}
          onBlur={e => { e.target.style.borderColor = 'var(--glass-border)' }}
        />
      </div>
      <button
        onClick={save}
        disabled={!title.trim() || !content.trim() || status === 'saving'}
        style={{
          padding: '10px', borderRadius: 8,
          background: status === 'saved' ? 'rgba(16,185,129,0.12)' : `${accent}12`,
          border: `1px solid ${status === 'saved' ? '#10B98135' : `${accent}35`}`,
          color: status === 'saved' ? '#10B981' : accent,
          fontSize: 11, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'inherit', transition: 'var(--transition)',
          opacity: (!title.trim() || !content.trim()) ? 0.5 : 1,
        }}
      >
        {status === 'saving' ? 'Guardando en memoria…' : status === 'saved' ? '✓ Guardado — todos los agentes lo conocen' : status === 'error' ? 'Error al guardar' : 'Guardar en memoria de todos los agentes →'}
      </button>
    </div>
  )
}

// ── Main panel ─────────────────────────────────────────────────
export default function SkillsPanel({ open, onClose, accent = 'var(--tools)' }: { open: boolean; onClose: () => void; accent?: string }) {
  const [tab, setTab] = useState<Tab>('catalog')
  const [catFilter, setCatFilter] = useState('all')
  const [installedNames, setInstalledNames] = useState<Set<string>>(new Set())
  const [runningSkill, setRunningSkill] = useState<Skill | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Catalog
  const catalogFn = useCallback(() => getSkillsCatalog(), [])
  const { data: catalogRaw } = usePoll(catalogFn, 60000)
  const catalog = ((catalogRaw as { skills?: Skill[] } | null)?.skills ?? []) as Skill[]

  // Installed
  const installedFn = useCallback(() => getInstalledSkills(), [])
  const { data: installedRaw } = usePoll(installedFn, 10000)
  const installedList = ((installedRaw as { installed?: Skill[] } | null)?.installed ?? []) as Skill[]

  useEffect(() => {
    setInstalledNames(new Set(installedList.map(s => s.name)))
  }, [installedList])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleInstall = async (skill: Skill) => {
    await installSkill(skill.name)
    setInstalledNames(prev => new Set([...prev, skill.name]))
    showToast(`"${skill.title}" instalado — agentes ${skill.agent_roles.join(', ')} activos`)
  }
  const handleUninstall = async (skill: Skill) => {
    await uninstallSkill(skill.name)
    setInstalledNames(prev => { const s = new Set(prev); s.delete(skill.name); return s })
    showToast(`"${skill.title}" desinstalado`)
  }

  const filtered = catFilter === 'all' ? catalog : catalog.filter(s => s.category === catFilter)

  // Escape key
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !runningSkill) onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose, runningSkill])

  const accentVal = accent.startsWith('var(') ? '#8B5CF6' : accent

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 998,
        background: 'rgba(2,6,23,0.6)', backdropFilter: 'blur(4px)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 0.25s',
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 520, zIndex: 999,
        background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--glass-border)',
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s var(--ease)',
        boxShadow: open ? '-24px 0 80px rgba(2,6,23,0.7)' : 'none',
      }}>

        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 7, background: `${accentVal}18`, border: `1px solid ${accentVal}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accentVal }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>Skills & Prompts</p>
            <p style={{ fontSize: 10, color: 'var(--text-3)' }}>
              {catalog.length} skills · {installedNames.size} instalados · tecla S para abrir
            </p>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, padding: '10px 12px', borderBottom: '1px solid var(--glass-border)', flexShrink: 0 }}>
          {([['catalog', 'Marketplace'], ['installed', `Instalados (${installedNames.size})`], ['prompt', 'Mi Negocio']] as [Tab, string][]).map(([t, l]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '5px 12px', borderRadius: 6,
                background: tab === t ? `${accentVal}14` : 'transparent',
                border: `1px solid ${tab === t ? `${accentVal}40` : 'transparent'}`,
                color: tab === t ? accentVal : 'var(--text-2)',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'var(--transition)',
              }}
            >{l}</button>
          ))}
        </div>

        {/* Catalog filter */}
        {tab === 'catalog' && (
          <div style={{ display: 'flex', gap: 4, padding: '8px 12px', flexShrink: 0, overflowX: 'auto' }}>
            {CATS.map(c => (
              <button
                key={c.id}
                onClick={() => setCatFilter(c.id)}
                style={{
                  padding: '3px 10px', borderRadius: 99, whiteSpace: 'nowrap',
                  background: catFilter === c.id ? `${c.color}18` : 'transparent',
                  border: `1px solid ${catFilter === c.id ? `${c.color}40` : 'rgba(255,255,255,0.06)'}`,
                  color: catFilter === c.id ? c.color : 'var(--text-3)',
                  fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'var(--transition)',
                }}
              >{c.label}</button>
            ))}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tab === 'catalog' && filtered.map(s => (
            <SkillCard
              key={s.name} skill={s} accent={accentVal}
              installed={installedNames.has(s.name)}
              onInstall={() => handleInstall(s)}
              onUninstall={() => handleUninstall(s)}
              onRun={() => setRunningSkill(s)}
            />
          ))}
          {tab === 'installed' && (
            installedList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 8 }}>Sin skills instalados</p>
                <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Ve al Marketplace e instala los que necesites para tu negocio</p>
              </div>
            ) : installedList.map(s => (
              <SkillCard
                key={s.name} skill={s} accent={accentVal}
                installed={true}
                onInstall={() => {}}
                onUninstall={() => handleUninstall(s)}
                onRun={() => setRunningSkill(s)}
              />
            ))
          )}
          {tab === 'prompt' && <PromptTab accent={accentVal} />}
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'absolute', bottom: 20, left: 16, right: 16,
            padding: '10px 14px', borderRadius: 9,
            background: '#10B98118', border: '1px solid #10B98130',
            color: '#10B981', fontSize: 11, fontWeight: 500,
            animation: 'fadeUp 0.3s var(--ease) both',
          }}>{toast}</div>
        )}
      </div>

      {/* Execute modal */}
      {runningSkill && (
        <ExecuteModal skill={runningSkill} accent={accentVal} onClose={() => setRunningSkill(null)} />
      )}
    </>
  )
}
