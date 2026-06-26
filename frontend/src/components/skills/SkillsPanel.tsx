'use client'
import { useCallback, useEffect, useState } from 'react'
import { usePoll } from '@/hooks/usePoll'
import {
  getSkillsCatalog, getInstalledSkills,
  installSkill, uninstallSkill, executeSkill, saveUserPrompt,
} from '@/lib/api'

type Skill = {
  name: string; title: string; description: string
  category: string; agent_roles: string[]; tags: string[]
  installs: number; rating: number; price: number; is_premium: boolean
  prompt_template?: string; version?: string
}
type Tab = 'catalog' | 'installed' | 'prompt'

const CATS = [
  { id: 'all',        label: 'Todos',      color: '#8B5CF6', icon: '✦' },
  { id: 'analysis',   label: 'Análisis',   color: '#6366F1', icon: '◈' },
  { id: 'content',    label: 'Contenido',  color: '#EC4899', icon: '✎' },
  { id: 'finance',    label: 'Finanzas',   color: '#10B981', icon: '◉' },
  { id: 'sales',      label: 'Ventas',     color: '#F59E0B', icon: '▲' },
  { id: 'operations', label: 'Ops',        color: '#64748B', icon: '⚙' },
]

const AGENT_CFG: Record<string, { color: string; label: string }> = {
  ceo:        { color: '#F59E0B', label: 'CEO' },
  research:   { color: '#6366F1', label: 'Research' },
  commercial: { color: '#10B981', label: 'Commercial' },
  content:    { color: '#EC4899', label: 'Content' },
  finance:    { color: '#EF4444', label: 'Finance' },
  operations: { color: '#64748B', label: 'Ops' },
}

function catCfg(id: string) { return CATS.find(c => c.id === id) ?? CATS[0] }

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ display: 'flex', gap: 1 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: 9, color: i <= Math.round(rating) ? '#F59E0B' : 'rgba(255,255,255,0.12)' }}>★</span>
      ))}
    </span>
  )
}

// ── Execute modal ─────────────────────────────────────────────
function ExecuteModal({ skill, onClose }: { skill: Skill; onClose: () => void }) {
  const template = skill.prompt_template ?? ''
  const paramNames = [...new Set([...template.matchAll(/\{(\w+)\}/g)].map(m => m[1]))]
  const [params, setParams] = useState<Record<string, string>>({})
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const cc = catCfg(skill.category)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const canRun = paramNames.length === 0 || paramNames.every(p => params[p]?.trim())

  const run = async () => {
    if (!canRun) return
    setLoading(true); setErr(null); setResult(null)
    try {
      const r = await executeSkill(skill.name, params) as { result?: string; error?: string }
      if (r.error) setErr(r.error)
      else setResult(r.result ?? '')
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error desconocido')
    } finally { setLoading(false) }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(2,6,23,0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, animation: 'fadeUp 0.2s var(--ease) both',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 580,
        maxHeight: '88vh',
        background: 'linear-gradient(160deg, #0d1528 0%, #060d1f 100%)',
        border: `1px solid ${cc.color}30`,
        borderRadius: 16,
        display: 'flex', flexDirection: 'column',
        boxShadow: `0 32px 100px rgba(2,6,23,0.9), 0 0 0 1px ${cc.color}15, inset 0 1px 0 rgba(255,255,255,0.06)`,
        overflow: 'hidden',
      }}>
        {/* Gradient header */}
        <div style={{
          padding: '20px 24px',
          background: `linear-gradient(135deg, ${cc.color}18 0%, transparent 60%)`,
          borderBottom: `1px solid ${cc.color}20`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `linear-gradient(135deg, ${cc.color}25, ${cc.color}08)`,
                border: `1px solid ${cc.color}35`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, color: cc.color,
                boxShadow: `0 4px 20px ${cc.color}25`,
              }}>{cc.icon}</div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.02em', marginBottom: 3 }}>{skill.title}</p>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {skill.agent_roles.map(r => (
                    <span key={r} style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                      background: `${AGENT_CFG[r]?.color ?? '#64748B'}18`,
                      color: AGENT_CFG[r]?.color ?? '#64748B',
                      border: `1px solid ${AGENT_CFG[r]?.color ?? '#64748B'}25`,
                    }}>{AGENT_CFG[r]?.label ?? r}</span>
                  ))}
                  <Stars rating={skill.rating} />
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-2)', cursor: 'pointer', fontSize: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'var(--transition)',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
            >×</button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 10, lineHeight: 1.6 }}>{skill.description}</p>
        </div>

        {/* Params + result */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {paramNames.length === 0 && !result && !err && !loading && (
            <div style={{ padding: '14px 16px', background: `${cc.color}08`, border: `1px solid ${cc.color}20`, borderRadius: 10, textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: 'var(--text-2)' }}>Este skill no requiere parámetros adicionales. Haz clic en Ejecutar.</p>
            </div>
          )}

          {paramNames.map(p => (
            <div key={p}>
              <label style={{
                fontSize: 10, fontWeight: 700, color: cc.color,
                display: 'block', marginBottom: 6,
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                {p.replace(/_/g, ' ')}
              </label>
              <textarea
                value={params[p] ?? ''}
                onChange={e => setParams(prev => ({ ...prev, [p]: e.target.value }))}
                placeholder={`Describe ${p.replace(/_/g, ' ')} aquí…`}
                rows={3}
                style={{
                  width: '100%', padding: '10px 12px',
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${params[p]?.trim() ? `${cc.color}40` : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 10, color: 'var(--text-1)',
                  fontSize: 12, fontFamily: 'inherit', resize: 'vertical',
                  outline: 'none', lineHeight: 1.6,
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = `${cc.color}60`; e.target.style.boxShadow = `0 0 0 3px ${cc.color}10` }}
                onBlur={e => { e.target.style.borderColor = params[p]?.trim() ? `${cc.color}40` : 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none' }}
              />
            </div>
          ))}

          {loading && (
            <div style={{ padding: '18px', background: `${cc.color}06`, borderRadius: 10, border: `1px solid ${cc.color}15` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: cc.color, animation: 'pulse-dot 1.2s ease infinite', boxShadow: `0 0 8px ${cc.color}` }} />
                <span style={{ fontSize: 10, color: cc.color, fontWeight: 600, letterSpacing: '0.06em' }}>EJECUTANDO CON {AGENT_CFG[skill.agent_roles[0]]?.label?.toUpperCase() ?? skill.agent_roles[0].toUpperCase()} AGENT…</span>
              </div>
              {[80, 60, 40].map((w, i) => (
                <div key={i} className="skeleton" style={{ height: 12, width: `${w}%`, borderRadius: 4, marginBottom: 8 }} />
              ))}
            </div>
          )}

          {err && (
            <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', marginBottom: 4 }}>ERROR</p>
              <p style={{ fontSize: 11, color: '#EF4444', opacity: 0.8 }}>{err}</p>
            </div>
          )}

          {result && (
            <div style={{
              padding: '16px 18px',
              background: `linear-gradient(135deg, ${cc.color}08, transparent)`,
              border: `1px solid ${cc.color}25`,
              borderRadius: 12,
              animation: 'fadeUp 0.3s var(--ease) both',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
                <p style={{ fontSize: 9, fontWeight: 700, color: '#10B981', letterSpacing: '0.1em' }}>RESULTADO · {AGENT_CFG[skill.agent_roles[0]]?.label?.toUpperCase()}</p>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-1)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{result}</p>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${cc.color}15`, flexShrink: 0 }}>
          <button
            onClick={run}
            disabled={loading || !canRun}
            style={{
              width: '100%', padding: '12px',
              background: loading || !canRun
                ? 'rgba(255,255,255,0.04)'
                : `linear-gradient(135deg, ${cc.color}25, ${cc.color}12)`,
              border: `1px solid ${loading || !canRun ? 'rgba(255,255,255,0.08)' : `${cc.color}40`}`,
              borderRadius: 10, color: loading || !canRun ? 'var(--text-3)' : cc.color,
              fontSize: 12, fontWeight: 700, cursor: loading || !canRun ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', letterSpacing: '0.02em',
              transition: 'all 0.2s',
              boxShadow: !loading && canRun ? `0 4px 20px ${cc.color}15` : 'none',
            }}
            onMouseEnter={e => { if (!loading && canRun) (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 30px ${cc.color}30` }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = !loading && canRun ? `0 4px 20px ${cc.color}15` : 'none' }}
          >
            {loading ? '⟳ Ejecutando…' : result ? '↺ Ejecutar de nuevo' : `Ejecutar con ${AGENT_CFG[skill.agent_roles[0]]?.label ?? skill.agent_roles[0]} Agent →`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Skill card ─────────────────────────────────────────────────
function SkillCard({ skill, installed, onInstall, onUninstall, onRun }: {
  skill: Skill; installed: boolean
  onInstall: () => void; onUninstall: () => void; onRun: () => void
}) {
  const cc = catCfg(skill.category)
  const [hover, setHover] = useState(false)

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover
          ? `linear-gradient(135deg, ${cc.color}10, rgba(255,255,255,0.03))`
          : installed ? `${cc.color}06` : 'rgba(255,255,255,0.02)',
        border: `1px solid ${hover ? `${cc.color}40` : installed ? `${cc.color}25` : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: 10,
        transition: 'all 0.2s var(--ease)',
        transform: hover ? 'translateY(-1px)' : 'none',
        boxShadow: hover ? `0 8px 32px rgba(2,6,23,0.5), 0 0 0 1px ${cc.color}10` : 'none',
        cursor: 'default',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8, flexShrink: 0,
          background: `linear-gradient(135deg, ${cc.color}20, ${cc.color}08)`,
          border: `1px solid ${cc.color}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: cc.color,
          transition: 'box-shadow 0.2s',
          boxShadow: hover ? `0 0 16px ${cc.color}30` : 'none',
        }}>{cc.icon}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>{skill.title}</span>
            {skill.is_premium && (
              <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'linear-gradient(90deg, #F59E0B20, #F59E0B10)', color: '#F59E0B', border: '1px solid #F59E0B25' }}>PRO</span>
            )}
            {installed && (
              <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#10B98115', color: '#10B981', border: '1px solid #10B98125' }}>ACTIVO</span>
            )}
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-2)', lineHeight: 1.55, marginBottom: 4 }}>{skill.description}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Stars rating={skill.rating} />
            <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{skill.installs.toLocaleString()} installs</span>
            <span style={{ fontSize: 9, color: 'var(--text-3)' }}>v{skill.version ?? '1.0'}</span>
          </div>
        </div>

        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          {skill.price > 0
            ? <span style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B' }}>${skill.price}</span>
            : <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981', background: '#10B98112', padding: '2px 7px', borderRadius: 5, border: '1px solid #10B98120' }}>FREE</span>
          }
        </div>
      </div>

      {/* Agents + tags */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {skill.agent_roles.map(r => (
          <span key={r} style={{
            fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
            background: `${AGENT_CFG[r]?.color ?? '#64748B'}12`,
            color: AGENT_CFG[r]?.color ?? '#64748B',
            border: `1px solid ${AGENT_CFG[r]?.color ?? '#64748B'}20`,
          }}>{AGENT_CFG[r]?.label ?? r}</span>
        ))}
        {skill.tags.map(t => (
          <span key={t} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', color: 'var(--text-3)', border: '1px solid rgba(255,255,255,0.06)' }}>{t}</span>
        ))}
      </div>

      {/* CTA */}
      <div style={{ display: 'flex', gap: 6 }}>
        {installed ? (
          <>
            <button onClick={onRun} style={{
              flex: 1, padding: '8px 12px', borderRadius: 8,
              background: `linear-gradient(135deg, ${cc.color}20, ${cc.color}0a)`,
              border: `1px solid ${cc.color}40`,
              color: cc.color, fontSize: 11, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
              boxShadow: `0 2px 12px ${cc.color}15`,
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${cc.color}30` }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 2px 12px ${cc.color}15` }}
            >⚡ Ejecutar ahora</button>
            <button onClick={onUninstall} style={{
              padding: '8px 12px', borderRadius: 8,
              background: 'transparent', border: '1px solid rgba(239,68,68,0.2)',
              color: '#EF4444', fontSize: 10, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.4)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.2)' }}
            >Quitar</button>
          </>
        ) : (
          <button onClick={onInstall} style={{
            flex: 1, padding: '8px 12px', borderRadius: 8,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text-2)', fontSize: 11, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
          }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLElement).style.background = `${cc.color}14`
              ;(e.currentTarget as HTMLElement).style.borderColor = `${cc.color}40`
              ;(e.currentTarget as HTMLElement).style.color = cc.color
              ;(e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${cc.color}20`
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'
              ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-2)'
              ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
            }}
          >+ Instalar skill</button>
        )}
      </div>
    </div>
  )
}

// ── Prompt tab ─────────────────────────────────────────────────
function PromptTab() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const save = async () => {
    if (!title.trim() || !content.trim()) return
    setStatus('saving')
    try {
      await saveUserPrompt(title.trim(), content.trim())
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 4000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Banner */}
      <div style={{
        padding: '14px 18px',
        background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(99,102,241,0.06))',
        border: '1px solid rgba(139,92,246,0.25)',
        borderRadius: 12,
        display: 'flex', gap: 12, alignItems: 'center',
        boxShadow: '0 4px 24px rgba(139,92,246,0.1)',
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 9,
          background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(99,102,241,0.1))',
          border: '1px solid rgba(139,92,246,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#8B5CF6', fontSize: 18, flexShrink: 0,
        }}>⊕</div>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', marginBottom: 3 }}>Prompt de negocio permanente</p>
          <p style={{ fontSize: 10, color: 'var(--text-2)', lineHeight: 1.55 }}>
            Se guarda en la memoria global — todos los agentes lo usarán como contexto en cada respuesta
          </p>
        </div>
      </div>

      {/* Quick examples */}
      <div>
        <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Ejemplos rápidos</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[
            { t: 'Mi empresa', c: 'Somos una tienda online de ropa sostenible. Precio promedio $45, recurrente. Target: mujeres 25-35 interesadas en moda consciente.' },
            { t: 'Mi nicho', c: 'Especialistas en suplementos deportivos veganos. Competidores: Myprotein, Optimum. Canal principal: Instagram y TikTok.' },
            { t: 'Mi meta Q3', c: 'Alcanzar $10k MRR en Q3 2026. Actualmente en $3.2k. Crecimiento objetivo: TikTok afiliados + email nurturing.' },
          ].map(ex => (
            <button
              key={ex.t}
              onClick={() => { setTitle(ex.t); setContent(ex.c) }}
              style={{
                padding: '10px 14px', borderRadius: 9, textAlign: 'left',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.35)'
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.07)'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateX(3px)'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'
                ;(e.currentTarget as HTMLElement).style.transform = 'none'
              }}
            >
              <p style={{ fontSize: 11, fontWeight: 600, color: '#8B5CF6', marginBottom: 3 }}>{ex.t}</p>
              <p style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.5 }}>{ex.c.slice(0, 75)}…</p>
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#8B5CF6', display: 'block', marginBottom: 5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Título</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ej: Mi negocio, Mi nicho, Mi meta…"
            style={{
              width: '100%', padding: '10px 12px', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${title ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 9, color: 'var(--text-1)', fontSize: 12,
              fontFamily: 'inherit', outline: 'none', transition: 'all 0.2s',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(139,92,246,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.1)' }}
            onBlur={e => { e.target.style.borderColor = title ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#8B5CF6', display: 'block', marginBottom: 5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Contenido del prompt</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Escribe toda la información de tu negocio: productos, clientes, metas, canales, competidores…&#10;&#10;Los agentes usarán esto como contexto en todas sus respuestas."
            rows={7}
            style={{
              width: '100%', padding: '10px 12px', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${content ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 9, color: 'var(--text-1)', fontSize: 12,
              fontFamily: 'inherit', resize: 'vertical', outline: 'none',
              lineHeight: 1.7, transition: 'all 0.2s',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(139,92,246,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.1)' }}
            onBlur={e => { e.target.style.borderColor = content ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none' }}
          />
        </div>
      </div>

      <button
        onClick={save}
        disabled={!title.trim() || !content.trim() || status === 'saving'}
        style={{
          padding: '12px', borderRadius: 10,
          background: status === 'saved'
            ? 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.08))'
            : (!title.trim() || !content.trim())
              ? 'rgba(255,255,255,0.03)'
              : 'linear-gradient(135deg, rgba(139,92,246,0.22), rgba(99,102,241,0.12))',
          border: `1px solid ${status === 'saved' ? '#10B98135' : (!title.trim() || !content.trim()) ? 'rgba(255,255,255,0.06)' : 'rgba(139,92,246,0.4)'}`,
          color: status === 'saved' ? '#10B981' : (!title.trim() || !content.trim()) ? 'var(--text-3)' : '#8B5CF6',
          fontSize: 12, fontWeight: 700, cursor: (!title.trim() || !content.trim()) ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', transition: 'all 0.25s',
          boxShadow: status !== 'saved' && title.trim() && content.trim() ? '0 4px 20px rgba(139,92,246,0.2)' : 'none',
        }}
      >
        {status === 'saving' ? '⟳ Guardando en memoria de agentes…'
          : status === 'saved' ? '✓ Guardado — todos los agentes ya lo saben'
          : status === 'error' ? '✕ Error al guardar'
          : 'Guardar en memoria global de agentes →'}
      </button>
    </div>
  )
}

// ── Main panel ─────────────────────────────────────────────────
export default function SkillsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('catalog')
  const [catFilter, setCatFilter] = useState('all')
  const [installedNames, setInstalledNames] = useState<Set<string>>(new Set())
  const [runningSkill, setRunningSkill] = useState<Skill | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const catalogFn = useCallback(() => getSkillsCatalog(), [])
  const { data: catalogRaw } = usePoll(catalogFn, 60000)
  const catalog = ((catalogRaw as { skills?: Skill[] } | null)?.skills ?? []) as Skill[]

  const installedFn = useCallback(() => getInstalledSkills(), [])
  const { data: installedRaw } = usePoll(installedFn, 10000)
  const installedList = ((installedRaw as { installed?: Skill[] } | null)?.installed ?? []) as Skill[]

  useEffect(() => {
    setInstalledNames(new Set(installedList.map(s => s.name)))
  }, [installedList])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const handleInstall = async (skill: Skill) => {
    await installSkill(skill.name)
    setInstalledNames(prev => new Set([...prev, skill.name]))
    showToast(`"${skill.title}" instalado — agentes ${skill.agent_roles.join(', ')} listos`)
  }
  const handleUninstall = async (skill: Skill) => {
    await uninstallSkill(skill.name)
    setInstalledNames(prev => { const s = new Set(prev); s.delete(skill.name); return s })
    showToast(`"${skill.title}" desinstalado`)
  }

  const filtered = catFilter === 'all' ? catalog : catalog.filter(s => s.category === catFilter)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !runningSkill) onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose, runningSkill])

  const tabDefs: [Tab, string][] = [
    ['catalog', 'Marketplace'],
    ['installed', `Instalados ${installedNames.size > 0 ? `(${installedNames.size})` : ''}`],
    ['prompt', 'Mi Negocio'],
  ]

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 998,
        background: 'rgba(2,6,23,0.65)', backdropFilter: 'blur(5px)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 0.25s',
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 540, zIndex: 999,
        background: 'linear-gradient(180deg, #0a1020 0%, #060d1f 100%)',
        borderLeft: '1px solid rgba(139,92,246,0.2)',
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s var(--ease)',
        boxShadow: open ? '-32px 0 100px rgba(2,6,23,0.8), inset 1px 0 0 rgba(139,92,246,0.1)' : 'none',
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 22px',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(99,102,241,0.06))',
          borderBottom: '1px solid rgba(139,92,246,0.15)',
          display: 'flex', alignItems: 'center', gap: 14,
          flexShrink: 0,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(99,102,241,0.1))',
            border: '1px solid rgba(139,92,246,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, color: '#8B5CF6',
            boxShadow: '0 4px 20px rgba(139,92,246,0.2)',
          }}>★</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>Skills & Prompts</p>
            <p style={{ fontSize: 10, color: 'var(--text-3)' }}>
              {catalog.length} skills disponibles · {installedNames.size} activos · tecla S
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {installedNames.size > 0 && (
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981', animation: 'pulse-dot 2s ease infinite' }} />
            )}
            <button onClick={onClose} style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-2)', cursor: 'pointer', fontSize: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'var(--transition)',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
            >×</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 3, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          {tabDefs.map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '6px 14px', borderRadius: 7,
              background: tab === t ? 'rgba(139,92,246,0.15)' : 'transparent',
              border: `1px solid ${tab === t ? 'rgba(139,92,246,0.4)' : 'transparent'}`,
              color: tab === t ? '#8B5CF6' : 'var(--text-2)',
              fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}>{l}</button>
          ))}
        </div>

        {/* Category filter (catalog only) */}
        {tab === 'catalog' && (
          <div style={{ display: 'flex', gap: 5, padding: '8px 14px', flexShrink: 0, overflowX: 'auto' }}>
            {CATS.map(c => (
              <button key={c.id} onClick={() => setCatFilter(c.id)} style={{
                padding: '4px 12px', borderRadius: 99, whiteSpace: 'nowrap',
                background: catFilter === c.id ? `${c.color}15` : 'transparent',
                border: `1px solid ${catFilter === c.id ? `${c.color}45` : 'rgba(255,255,255,0.07)'}`,
                color: catFilter === c.id ? c.color : 'var(--text-3)',
                fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.2s',
                boxShadow: catFilter === c.id ? `0 2px 12px ${c.color}15` : 'none',
              }}>{c.icon} {c.label}</button>
            ))}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tab === 'catalog' && (
            filtered.length === 0
              ? <div style={{ textAlign: 'center', padding: '48px 20px' }}><p style={{ fontSize: 13, color: 'var(--text-3)' }}>Sin skills en esta categoría</p></div>
              : filtered.map(s => (
                <SkillCard key={s.name} skill={s}
                  installed={installedNames.has(s.name)}
                  onInstall={() => handleInstall(s)}
                  onUninstall={() => handleUninstall(s)}
                  onRun={() => setRunningSkill(s)}
                />
              ))
          )}
          {tab === 'installed' && (
            installedList.length === 0
              ? (
                <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                  <p style={{ fontSize: 28, marginBottom: 12 }}>★</p>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6 }}>Sin skills instalados</p>
                  <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Ve al Marketplace e instala los que necesitas para tu negocio</p>
                  <button onClick={() => setTab('catalog')} style={{
                    marginTop: 16, padding: '8px 20px', borderRadius: 8,
                    background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)',
                    color: '#8B5CF6', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}>Ver Marketplace →</button>
                </div>
              )
              : installedList.map(s => (
                <SkillCard key={s.name} skill={s} installed={true}
                  onInstall={() => {}}
                  onUninstall={() => handleUninstall(s)}
                  onRun={() => setRunningSkill(s)}
                />
              ))
          )}
          {tab === 'prompt' && <PromptTab />}
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'absolute', bottom: 20, left: 14, right: 14,
            padding: '11px 16px', borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.06))',
            border: '1px solid rgba(16,185,129,0.3)',
            color: '#10B981', fontSize: 11, fontWeight: 500,
            animation: 'fadeUp 0.3s var(--ease) both',
            boxShadow: '0 8px 32px rgba(2,6,23,0.6)',
          }}>{toast}</div>
        )}
      </div>

      {runningSkill && (
        <ExecuteModal skill={runningSkill} onClose={() => setRunningSkill(null)} />
      )}
    </>
  )
}
