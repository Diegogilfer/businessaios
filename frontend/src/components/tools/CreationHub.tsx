'use client'
import { useState } from 'react'

function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 10 }}>
      {children}
    </p>
  )
}

type Tool = 'crm' | 'web' | 'design' | 'saas'

const TOOLS: { id: Tool; label: string; sub: string; color: string; icon: React.ReactNode; items: { label: string; status: string; sc: string }[] }[] = [
  {
    id: 'crm', label: 'CRM', sub: 'Gestiona clientes y pipeline',
    color: '#6366F1',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    items: [
      { label: '247 contactos activos',  status: 'Sincronizado', sc: '#10B981' },
      { label: '$18,400 pipeline abierto', status: 'En seguimiento', sc: '#6366F1' },
      { label: '34 leads esta semana',    status: 'Commercial Agent activo', sc: '#10B981' },
    ],
  },
  {
    id: 'web', label: 'Web Pages', sub: 'Generador con UI/UX Pro Max',
    color: '#EC4899',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
      </svg>
    ),
    items: [
      { label: 'Landing predicciones', status: 'Publicada', sc: '#10B981' },
      { label: 'Tienda e-commerce',    status: 'En progreso', sc: '#F59E0B' },
      { label: 'Blog tendencias',      status: 'Pendiente',   sc: '#64748B' },
    ],
  },
  {
    id: 'design', label: 'Quick Design', sub: 'Flyers y creativos en 1 clic',
    color: '#F59E0B',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    ),
    items: [
      { label: 'Flyer de producto',  status: '1 clic', sc: '#10B981' },
      { label: 'Post Instagram',     status: '1 clic', sc: '#10B981' },
      { label: 'Banner campaña',     status: '1 clic', sc: '#10B981' },
    ],
  },
  {
    id: 'saas', label: 'SaaS Manager', sub: 'Planes, billing y tenants',
    color: '#8B5CF6',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    items: [
      { label: 'Plan Free · 1 agente',    status: 'Activo', sc: '#64748B' },
      { label: 'Plan Starter · $29/mo',   status: 'Disponible', sc: '#10B981' },
      { label: 'Plan Pro · $99/mo',       status: 'Disponible', sc: '#8B5CF6' },
    ],
  },
]

export default function CreationHub({ accent }: { accent: string }) {
  const [active, setActive] = useState<Tool>('web')
  const activeTool = TOOLS.find(t => t.id === active)!

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Skills badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px',
        background: `${accent}08`, border: `1px solid ${accent}25`,
        borderRadius: 'var(--radius-md)',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 7,
          background: `${accent}18`, border: `1px solid ${accent}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </div>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>
            UI/UX Pro Max integrado — genera páginas web completas desde texto
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-2)' }}>
            67 estilos · 96 paletas · 57 combinaciones tipográficas · React/Next.js/Tailwind
          </p>
        </div>
      </div>

      {/* Tool selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {TOOLS.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            style={{
              padding: '14px 16px',
              background: active === t.id ? `${t.color}12` : 'var(--bg-card)',
              border: `1px solid ${active === t.id ? `${t.color}50` : 'var(--glass-border)'}`,
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
              transition: 'var(--transition)', textAlign: 'left',
            }}
            onMouseEnter={e => {
              if (active !== t.id) (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'
            }}
            onMouseLeave={e => {
              if (active !== t.id) (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 7,
              background: `${t.color}18`, color: t.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{t.icon}</div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: active === t.id ? t.color : 'var(--text-1)', marginBottom: 2 }}>{t.label}</p>
              <p style={{ fontSize: 10, color: 'var(--text-2)' }}>{t.sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Active tool detail */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 12 }}>
        {/* Status */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '18px 20px' }}>
          <SLabel>Estado · {activeTool.label}</SLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {activeTool.items.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 10px', borderRadius: 7,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
              }}>
                <span style={{ fontSize: 11, color: 'var(--text-1)' }}>{item.label}</span>
                <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: `${item.sc}15`, color: item.sc }}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
          <button style={{
            width: '100%', padding: '10px',
            background: `${activeTool.color}12`,
            border: `1px solid ${activeTool.color}35`,
            borderRadius: 8, color: activeTool.color,
            fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            transition: 'var(--transition)',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${activeTool.color}22` }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${activeTool.color}12` }}
          >
            Abrir {activeTool.label} →
          </button>
        </div>

        {/* Skills / Memory upload */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '18px 20px' }}>
          <SLabel>Skills instalados · Prompts del negocio</SLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {[
              { name: 'SWOT Analysis',       cat: 'Estrategia', color: '#6366F1' },
              { name: 'Competitor Analysis', cat: 'Research',   color: '#EC4899' },
              { name: 'Landing Page Copy',   cat: 'Content',    color: '#F59E0B' },
              { name: 'Mi negocio · prompt', cat: 'Custom',     color: '#10B981', custom: true },
            ].map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 7,
                background: s.custom ? `${s.color}08` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${s.custom ? `${s.color}30` : 'rgba(255,255,255,0.04)'}`,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text-1)', flex: 1 }}>{s.name}</span>
                <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: `${s.color}15`, color: s.color, fontWeight: 600 }}>
                  {s.cat}
                </span>
              </div>
            ))}
          </div>
          <div style={{
            border: `2px dashed rgba(255,255,255,0.1)`,
            borderRadius: 8, padding: '12px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            cursor: 'pointer', transition: 'var(--transition)',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${accent}50` }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 500 }}>Subir skill, extensión o prompt</p>
            <p style={{ fontSize: 10, color: 'var(--text-3)' }}>Arrastra un archivo o escribe un prompt de tu negocio</p>
          </div>
        </div>
      </div>
    </div>
  )
}
