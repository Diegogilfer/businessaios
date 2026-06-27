'use client'
import { useCallback, useState } from 'react'
import { usePoll } from '@/hooks/usePoll'
import { getAnalyticsHealth, getAnalyticsExecs, getNeuroPrediction } from '@/lib/api'

// ── Mini bar chart ────────────────────────────────────────────
function MiniChart({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 52 }}>
      {values.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${(v / max) * 100}%`,
            borderRadius: '3px 3px 0 0',
            background: i === values.length - 1 ? color : `${color}45`,
            minHeight: 3,
            transition: 'height 0.6s var(--ease)',
          }}
        />
      ))}
    </div>
  )
}

// ── KPI card ─────────────────────────────────────────────────
function KpiCard({
  label, value, sub, accent, prefix = '', suffix = '', trend,
}: {
  label: string; value?: number | string; sub?: string
  accent: string; prefix?: string; suffix?: string; trend?: 'up' | 'down' | 'flat'
}) {
  const trendColor = trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : 'var(--text-3)'
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-md)',
      padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: 6,
      transition: 'var(--transition)',
      cursor: 'default',
    }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'
        ;(e.currentTarget as HTMLElement).style.borderColor = `${accent}35`
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'
        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--glass-border)'
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontSize: 26, fontWeight: 600, color: accent, letterSpacing: '-0.04em', lineHeight: 1 }}>
        {value !== undefined ? `${prefix}${value}${suffix}` : (
          <span className="skeleton" style={{ display: 'block', width: 80, height: 26 }} />
        )}
      </span>
      {sub && (
        <span style={{ fontSize: 11, color: trend ? trendColor : 'var(--text-2)' }}>{sub}</span>
      )}
    </div>
  )
}

// ── Mode card (Solo / Contigo) ────────────────────────────────
function ModeCard({
  mode, title, desc, agents, cta, accent, onClick,
}: {
  mode: 'solo' | 'with'; title: string; desc: string
  agents: { color: string; label: string }[]; cta: string; accent: string; onClick: () => void
}) {
  const isSolo = mode === 'solo'
  const tagBg = isSolo ? `${accent}15` : 'rgba(16,185,129,0.12)'
  const tagColor = isSolo ? accent : '#10B981'
  const tagLabel = isSolo ? 'Autónomo' : 'Contigo'

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-md)',
      padding: '16px 18px',
      display: 'flex', flexDirection: 'column', gap: 10,
      transition: 'var(--transition)',
      cursor: 'default',
    }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'
        ;(e.currentTarget as HTMLElement).style.borderColor = `${accent}30`
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'
        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--glass-border)'
        ;(e.currentTarget as HTMLElement).style.transform = 'none'
      }}
    >
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
        padding: '3px 8px', borderRadius: 5,
        background: tagBg, color: tagColor,
        width: 'fit-content',
      }}>
        {tagLabel.toUpperCase()}
      </span>
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>{title}</p>
        <p style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.65 }}>{desc}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {agents.map((a, i) => (
            <div key={i} style={{
              width: 22, height: 22, borderRadius: '50%',
              background: a.color, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 8, fontWeight: 600, color: '#fff',
            }}>{a.label}</div>
          ))}
        </div>
        <button
          onClick={onClick}
          style={{
            padding: '5px 13px',
            background: 'transparent',
            border: `1px solid ${accent}45`,
            borderRadius: 7, color: accent,
            fontSize: 10, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLElement).style.background = `${accent}18`
            ;(e.currentTarget as HTMLElement).style.borderColor = `${accent}70`
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.borderColor = `${accent}45`
          }}
        >{cta} →</button>
      </div>
    </div>
  )
}

// ── Neuro Alert ───────────────────────────────────────────────
function NeuroAlert({ accent }: { accent: string }) {
  const fn = useCallback(() => getNeuroPrediction(), [])
  const { data } = usePoll(fn, 30000)
  const d = data as Record<string, unknown> | null

  return (
    <div style={{
      background: `${accent}08`,
      border: `1px solid ${accent}25`,
      borderRadius: 'var(--radius-md)',
      padding: '14px 18px',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 9,
        background: `${accent}18`,
        border: `1px solid ${accent}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)', marginBottom: 3 }}>
          NeuroIA · Predicción activa
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-2)' }}>
          {d?.recommendation as string ?? 'Analizando patrones de mercado esta semana…'}
        </p>
      </div>
      {d?.confidence && (
        <span style={{
          fontSize: 12, fontWeight: 600, color: accent,
          background: `${accent}12`, border: `1px solid ${accent}30`,
          padding: '3px 10px', borderRadius: 6, flexShrink: 0,
        }}>
          {Math.round((d.confidence as number) * 100)}% confianza
        </span>
      )}
    </div>
  )
}

// ── Section label ─────────────────────────────────────────────
function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
      color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 10,
    }}>
      {children}
    </p>
  )
}

// ── Product row ───────────────────────────────────────────────
const PRODUCTS = [
  { name: 'Auriculares BT Pro', units: 12, roi: 68, trend: 'up' as const },
  { name: 'Funda iPhone 15',    units: 9,  roi: 54, trend: 'up' as const },
  { name: 'Cable USB-C 3m',     units: 7,  roi: 31, trend: 'flat' as const },
  { name: 'Soporte portátil',   units: 6,  roi: 44, trend: 'up' as const },
  { name: 'Lámpara LED RGB',    units: 4,  roi: 29, trend: 'down' as const },
]

// ── Main component ────────────────────────────────────────────
export default function EcommerceDashboard({ accent }: { accent: string }) {
  const hf = useCallback(() => getAnalyticsHealth(), [])
  const ef = useCallback(() => getAnalyticsExecs(7), [])
  const { data: h } = usePoll(hf, 12000)
  const { data: e } = usePoll(ef, 15000)
  const hd = h as Record<string, unknown> | null
  const ed = e as Record<string, unknown> | null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <KpiCard label="Ventas hoy"     value="$1,247" sub="↑ 18% vs ayer"    accent={accent} trend="up" />
        <KpiCard label="Órdenes"        value={34}     sub="↑ 6 esta hora"     accent={accent} trend="up" />
        <KpiCard label="Conversión"     value="3.8"    sub="meta 4%"           accent={accent} suffix="%" />
        <KpiCard label="Margen neto"    value={42}     sub="↑ 2pp este mes"    accent={accent} suffix="%" trend="up" />
      </div>

      {/* Revenue chart + Top products */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 12 }}>
        {/* Chart */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-md)',
          padding: '18px 20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <SLabel>Ventas — últimos 7 días</SLabel>
              <span style={{ fontSize: 22, fontWeight: 600, color: accent, letterSpacing: '-0.03em' }}>$8,420</span>
              <span style={{ fontSize: 11, color: '#10B981', marginLeft: 8 }}>↑ 23%</span>
            </div>
            <span style={{
              fontSize: 9, padding: '3px 8px', borderRadius: 5,
              background: 'rgba(16,185,129,0.12)', color: '#10B981', fontWeight: 600,
            }}>vs semana anterior</span>
          </div>
          <MiniChart values={[38, 52, 41, 67, 59, 80, 94]} color={accent} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
              <span key={d} style={{ fontSize: 9, color: 'var(--text-3)' }}>{d}</span>
            ))}
          </div>
        </div>

        {/* Products */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-md)',
          padding: '18px 20px',
        }}>
          <SLabel>Productos top esta semana</SLabel>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Producto', 'Unid.', 'ROI', ''].map(h => (
                  <th key={h} style={{
                    fontSize: 9, fontWeight: 600, color: 'var(--text-3)',
                    textAlign: 'left', paddingBottom: 10, letterSpacing: '0.06em',
                    textTransform: 'uppercase', borderBottom: '1px solid var(--glass-border)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PRODUCTS.map((p, i) => (
                <tr key={i}>
                  <td style={{ padding: '8px 0', fontSize: 11, color: 'var(--text-1)', borderBottom: i < PRODUCTS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    {p.name}
                  </td>
                  <td style={{ padding: '8px 0', fontSize: 11, color: 'var(--text-2)', borderBottom: i < PRODUCTS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    {p.units}
                  </td>
                  <td style={{ padding: '8px 0', borderBottom: i < PRODUCTS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                      background: p.trend === 'up' ? 'rgba(16,185,129,0.12)' : p.trend === 'down' ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)',
                      color: p.trend === 'up' ? '#10B981' : p.trend === 'down' ? '#EF4444' : 'var(--text-2)',
                    }}>{p.roi}%</span>
                  </td>
                  <td style={{ padding: '8px 0', borderBottom: i < PRODUCTS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', textAlign: 'right' }}>
                    <span style={{ fontSize: 10, color: p.trend === 'up' ? '#10B981' : p.trend === 'down' ? '#EF4444' : 'var(--text-3)' }}>
                      {p.trend === 'up' ? '↑' : p.trend === 'down' ? '↓' : '→'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* NeuroIA alert */}
      <NeuroAlert accent={accent} />

      {/* Mode cards */}
      <div>
        <SLabel>El sistema trabaja solo</SLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          <ModeCard
            mode="solo" accent={accent}
            title="Escanear tendencias esta semana"
            desc="Detecta las 3 categorías con mayor crecimiento y potencial de margen."
            agents={[{ color: '#6366F1', label: 'R' }, { color: '#8B5CF6', label: 'N' }]}
            cta="Escanear"
            onClick={() => {}}
          />
          <ModeCard
            mode="solo" accent={accent}
            title="Predecir mejor categoría mañana"
            desc="NeuroIA analiza patrones y te dice en qué nicho enfocarte mañana."
            agents={[{ color: '#8B5CF6', label: 'N' }]}
            cta="Predecir"
            onClick={() => {}}
          />
          <ModeCard
            mode="solo" accent={accent}
            title="Analizar competidores del nicho"
            desc="Compara precios, posicionamiento y brechas de tus competidores."
            agents={[{ color: '#6366F1', label: 'R' }, { color: '#06B6D4', label: 'C' }]}
            cta="Analizar"
            onClick={() => {}}
          />
        </div>

        <SLabel>Trabajamos juntos</SLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <ModeCard
            mode="with" accent={accent}
            title="Crear plan de tienda paso a paso"
            desc="Desde el nombre del negocio hasta el primer producto publicado."
            agents={[{ color: '#00BCD4', label: 'CEO' }, { color: '#F59E0B', label: 'Op' }, { color: '#10B981', label: 'Co' }]}
            cta="Empezar"
            onClick={() => {}}
          />
          <ModeCard
            mode="with" accent={accent}
            title="Diseñar estrategia de monetización"
            desc="El equipo define tu modelo, precios, canales y primeras ventas."
            agents={[{ color: '#00BCD4', label: 'CEO' }, { color: '#EF4444', label: 'Fi' }, { color: '#10B981', label: 'Co' }]}
            cta="Diseñar"
            onClick={() => {}}
          />
          <ModeCard
            mode="with" accent={accent}
            title="Generar página de ventas"
            desc="El agente de contenido redacta la landing lista para publicar."
            agents={[{ color: '#EC4899', label: 'Ct' }, { color: '#10B981', label: 'Co' }]}
            cta="Generar"
            onClick={() => {}}
          />
        </div>
      </div>
    </div>
  )
}
