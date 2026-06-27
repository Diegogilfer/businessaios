'use client'
import { useState } from 'react'

function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 10 }}>
      {children}
    </p>
  )
}

function KpiCard({ label, value, sub, accent, trend }: { label: string; value: string; sub?: string; accent: string; trend?: 'up' | 'down' }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '18px 20px' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${accent}35` }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--glass-border)' }}
    >
      <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 600, color: accent, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : 'var(--text-2)' }}>{sub}</p>}
    </div>
  )
}

const PLATFORMS = [
  { name: 'TikTok',     color: '#EC4899', val: 82, reach: '28.4K' },
  { name: 'Instagram',  color: '#8B5CF6', val: 67, reach: '12.1K' },
  { name: 'LinkedIn',   color: '#6366F1', val: 55, reach: '5.8K' },
  { name: 'Twitter/X',  color: '#64748B', val: 43, reach: '1.9K' },
]

const CONTENT = [
  { title: 'Hilo tendencias IA moda', ch: 'Twitter', status: 'Listo', statusColor: '#10B981' },
  { title: 'Carrusel moda IA',        ch: 'Instagram', status: 'Borrador', statusColor: '#F59E0B' },
  { title: 'Video unboxing',           ch: 'TikTok', status: 'Pendiente', statusColor: '#64748B' },
  { title: 'Newsletter semanal',       ch: 'Email', status: 'Programado', statusColor: '#6366F1' },
]

export default function MarketingDashboard({ accent }: { accent: string }) {
  const [activeContent, setActiveContent] = useState<number | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <KpiCard label="Alcance hoy"    value="48.2K" sub="↑ 12% vs ayer"     accent={accent} trend="up" />
        <KpiCard label="Conv. Ads"      value="5.1%"  sub="sobre meta 4%"      accent={accent} trend="up" />
        <KpiCard label="Leads hoy"      value="127"   sub="↑ 34 vs ayer"       accent={accent} trend="up" />
        <KpiCard label="Costo/Lead"     value="$2.4"  sub="↓ 18% esta semana"  accent={accent} trend="up" />
      </div>

      {/* Platforms + Content calendar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 12 }}>
        {/* Platforms */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '18px 20px' }}>
          <SLabel>Rendimiento por plataforma</SLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {PLATFORMS.map(p => (
              <div key={p.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-1)', fontWeight: 500 }}>{p.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{p.reach}</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${p.val}%`, background: p.color,
                    borderRadius: 99, transition: 'width 0.8s var(--ease)',
                  }} />
                </div>
              </div>
            ))}
          </div>
          {/* Monetization summary */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--glass-border)' }}>
            <SLabel>Ingresos por canal</SLabel>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['Afiliados', '$340', '#EC4899'], ['Premium', '$580', '#8B5CF6'], ['API', '$500', '#6366F1']].map(([l, v, c]) => (
                <div key={l} style={{ flex: 1, background: `${c}10`, border: `1px solid ${c}25`, borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                  <p style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 3 }}>{l}</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: c as string }}>{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content calendar */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '18px 20px' }}>
          <SLabel>Calendario de contenido</SLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {CONTENT.map((c, i) => (
              <div
                key={i}
                onClick={() => setActiveContent(activeContent === i ? null : i)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: `1px solid ${activeContent === i ? `${accent}40` : 'rgba(255,255,255,0.05)'}`,
                  background: activeContent === i ? `${accent}08` : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'var(--transition)',
                }}
              >
                <div>
                  <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-1)', marginBottom: 2 }}>{c.title}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-3)' }}>{c.ch}</p>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                  background: `${c.statusColor}18`, color: c.statusColor,
                }}>{c.status}</span>
              </div>
            ))}
          </div>
          <button style={{
            marginTop: 12, width: '100%', padding: '9px',
            background: `${accent}12`, border: `1px solid ${accent}30`,
            borderRadius: 8, color: accent,
            fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            transition: 'var(--transition)',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${accent}20` }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${accent}12` }}
          >
            + Generar nueva pieza de contenido
          </button>
        </div>
      </div>

      {/* Viral Score */}
      <div style={{ background: 'var(--bg-card)', border: `1px solid ${accent}25`, borderRadius: 'var(--radius-md)', padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <SLabel>Potencial viral — predicción de la semana</SLabel>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
              Moda personalizada con IA · Score <span style={{ color: accent }}>94/100</span>
            </p>
          </div>
          <span style={{ fontSize: 9, padding: '3px 9px', borderRadius: 5, background: `${accent}15`, color: accent, fontWeight: 700 }}>
            ALTO POTENCIAL
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            ['TikTok Shop saturation', '+340%', '#EC4899'],
            ['Scarcity + co-creation', 'Viral loop activo', '#8B5CF6'],
            ['CPC 22% menor', 'Menos competencia', '#10B981'],
          ].map(([l, v, c]) => (
            <div key={l} style={{ flex: 1, padding: '10px 12px', background: `${c}08`, border: `1px solid ${c}20`, borderRadius: 8 }}>
              <p style={{ fontSize: 10, color: 'var(--text-2)', marginBottom: 3 }}>{l}</p>
              <p style={{ fontSize: 12, fontWeight: 600, color: c as string }}>{v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
