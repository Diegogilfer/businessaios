'use client'
import { useState, useCallback } from 'react'
import { usePoll } from '@/hooks/usePoll'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

const PLAN_COLORS: Record<string, string> = {
  free:       '#555',
  starter:    '#4af0c8',
  pro:        '#c8f04a',
  enterprise: '#c44af0',
}

const PLAN_ICONS: Record<string, string> = {
  free:       '○',
  starter:    '◇',
  pro:        '◆',
  enterprise: '⬡',
}

type Plan = { price_monthly: number | null; limits: Record<string, number>; features: string[] }
type Plans = Record<string, Plan>
type Tenant = { id: string; name: string; email: string; plan: string; status: string; created_at: string }
type Usage  = { plan: string; resources: Record<string, { allowed: boolean; used: number; limit: number; remaining: number }> }

// ── Usage Bar ────────────────────────────────────────────────
function UsageBar({ label, used, limit, color }: { label: string; used: number; limit: number; color: string }) {
  const pct = limit === -1 ? 0 : Math.min((used / Math.max(limit, 1)) * 100, 100)
  const over = pct >= 90
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#888' }}>{label}</span>
        <span style={{ fontSize: 10, color: over ? '#f04a6c' : '#444', fontFamily: 'monospace' }}>
          {limit === -1 ? `${used} / ∞` : `${used} / ${limit}`}
        </span>
      </div>
      <div style={{ height: 3, background: '#141414', borderRadius: 2 }}>
        <div style={{
          height: '100%',
          width: limit === -1 ? '8%' : `${pct}%`,
          background: over ? '#f04a6c' : color,
          borderRadius: 2,
          transition: 'width 1s cubic-bezier(.16,1,.3,1)',
          boxShadow: `0 0 6px ${over ? '#f04a6c' : color}44`,
        }} />
      </div>
    </div>
  )
}

// ── Plan Card ────────────────────────────────────────────────
function PlanCard({ name, plan, current, onUpgrade }: {
  name: string; plan: Plan; current: boolean; onUpgrade: (p: string) => void
}) {
  const color = PLAN_COLORS[name] ?? '#888'
  const icon  = PLAN_ICONS[name]  ?? '○'
  return (
    <div style={{
      background: '#0d0d0d',
      border: current ? `1px solid ${color}` : `1px solid ${color}22`,
      borderTop: `2px solid ${color}`,
      borderRadius: 2, padding: '20px',
      position: 'relative', transition: 'border-color .2s',
    }}>
      {current && (
        <span style={{
          position: 'absolute', top: 10, right: 10,
          fontSize: 9, padding: '2px 8px', borderRadius: 20,
          background: `${color}20`, color, border: `1px solid ${color}40`,
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>Activo</span>
      )}
      <div style={{ marginBottom: 14 }}>
        <span style={{ fontSize: 20, color }}>{icon}</span>
        <p style={{ margin: '6px 0 2px', fontSize: 14, fontWeight: 700, color: '#eee', textTransform: 'capitalize' }}>{name}</p>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color, fontFamily: 'DM Mono, monospace' }}>
          {plan.price_monthly === null ? 'Custom' : plan.price_monthly === 0 ? 'Gratis' : `$${plan.price_monthly}/mo`}
        </p>
      </div>
      <div style={{ marginBottom: 16 }}>
        {Object.entries(plan.limits).slice(0, 4).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: '#444' }}>{k.replace(/_/g, ' ')}</span>
            <span style={{ fontSize: 10, color: '#666', fontFamily: 'monospace' }}>{v === -1 ? '∞' : v.toLocaleString()}</span>
          </div>
        ))}
      </div>
      {!current && name !== 'enterprise' && (
        <button onClick={() => onUpgrade(name)} style={{
          width: '100%', background: `${color}15`,
          border: `1px solid ${color}40`, color,
          padding: '8px', borderRadius: 2, fontSize: 11,
          fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em',
          textTransform: 'uppercase', fontFamily: 'inherit', transition: 'all .2s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${color}25` }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${color}15` }}
        >
          Upgrade →
        </button>
      )}
      {name === 'enterprise' && !current && (
        <a href="mailto:diegogilfer.93@gmail.com?subject=BusinessAIOS Enterprise" style={{
          display: 'block', width: '100%', textAlign: 'center',
          background: `${color}15`, border: `1px solid ${color}40`, color,
          padding: '8px', borderRadius: 2, fontSize: 11, fontWeight: 700,
          letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none',
        }}>Contactar →</a>
      )}
    </div>
  )
}

// ── Tenant Row ───────────────────────────────────────────────
function TenantRow({ t, onSelect }: { t: Tenant; onSelect: (id: string) => void }) {
  const color = PLAN_COLORS[t.plan] ?? '#555'
  return (
    <tr style={{ borderBottom: '1px solid #0e0e0e', cursor: 'pointer', transition: 'background .15s' }}
      onClick={() => onSelect(t.id)}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#0f0f0f' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <td style={{ padding: '10px 12px', fontSize: 12, color: '#ccc' }}>{t.name}</td>
      <td style={{ padding: '10px 12px', fontSize: 11, color: '#555' }}>{t.email}</td>
      <td style={{ padding: '10px 12px' }}>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${color}15`, color, border: `1px solid ${color}30`, textTransform: 'capitalize' }}>
          {PLAN_ICONS[t.plan]} {t.plan}
        </span>
      </td>
      <td style={{ padding: '10px 12px' }}>
        <span style={{ fontSize: 10, color: t.status === 'active' ? '#c8f04a' : '#f04a6c' }}>
          {t.status === 'active' ? '● activo' : '○ suspendido'}
        </span>
      </td>
      <td style={{ padding: '10px 12px', fontSize: 10, color: '#333', fontFamily: 'monospace' }}>
        {new Date(t.created_at).toLocaleDateString()}
      </td>
    </tr>
  )
}

// ── MAIN ─────────────────────────────────────────────────────
export default function SaasDashboard() {
  const [tab,        setTab]        = useState<'tenants' | 'plans' | 'register'>('tenants')
  const [selTenant,  setSelTenant]  = useState<string | null>(null)
  const [usageData,  setUsageData]  = useState<Usage | null>(null)
  const [form,       setForm]       = useState({ name: '', email: '', plan: 'free' })
  const [creating,   setCreating]   = useState(false)
  const [newTenant,  setNewTenant]  = useState<Record<string, unknown> | null>(null)
  const [upgrading,  setUpgrading]  = useState(false)
  const [msg,        setMsg]        = useState('')

  const tenantsFetcher = useCallback(() => apiFetch<Tenant[]>('/saas/tenants'), [])
  const plansFetcher   = useCallback(() => apiFetch<Plans>('/saas/plans'), [])
  const { data: tenants, refetch: refetchTenants } = usePoll(tenantsFetcher, 30000)
  const { data: plans }                             = usePoll(plansFetcher,   60000)

  const tenantList = (tenants as Tenant[] | null) ?? []
  const plansMap   = (plans   as Plans   | null)  ?? {}

  async function loadUsage(tenantId: string) {
    setSelTenant(tenantId)
    try {
      const u = await apiFetch<Usage>(`/saas/usage/${tenantId}`)
      setUsageData(u)
    } catch (_) {}
  }

  async function handleCreate() {
    if (!form.name || !form.email) return
    setCreating(true); setMsg('')
    try {
      const r = await apiFetch<Record<string, unknown>>('/saas/tenants', {
        method: 'POST', body: JSON.stringify(form),
      })
      setNewTenant(r)
      setMsg('')
      refetchTenants()
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error')
    }
    setCreating(false)
  }

  async function handleUpgrade(tenantId: string, plan: string) {
    setUpgrading(true)
    try {
      const r = await apiFetch<{ success: boolean; checkout_url?: string }>('/saas/billing/checkout', {
        method: 'POST',
        body:   JSON.stringify({ tenant_id: tenantId, plan }),
      })
      if (r.checkout_url) {
        window.open(r.checkout_url, '_blank')
      } else {
        // Sin Stripe configurado: upgrade directo
        await apiFetch('/saas/billing/upgrade', {
          method: 'POST', body: JSON.stringify({ tenant_id: tenantId, new_plan: plan }),
        })
        await loadUsage(tenantId)
        refetchTenants()
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error')
    }
    setUpgrading(false)
  }

  const inp: React.CSSProperties = {
    width: '100%', background: '#0a0a0a', border: '1px solid #1e1e1e',
    color: '#ccc', padding: '10px 12px', borderRadius: 2,
    fontSize: 12, outline: 'none', fontFamily: 'inherit', transition: 'border-color .2s',
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 300, color: '#eee' }}>SaaS Dashboard</h2>
          <p style={{ fontSize: 11, color: '#2a2a2a', marginTop: 3 }}>Fase 11 — Multi-tenant · Billing · Stripe · Quotas</p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['tenants', 'plans', 'register'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? '#141414' : 'transparent',
              border: tab === t ? '1px solid #1e1e1e' : '1px solid transparent',
              color: tab === t ? '#c8f04a' : '#555',
              padding: '5px 14px', borderRadius: 2, fontSize: 10,
              cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'inherit',
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* TENANTS TAB */}
      {tab === 'tenants' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
            {[
              ['Total tenants',  tenantList.length,                                          '#4af0c8'],
              ['Plan pro/enterprise', tenantList.filter(t => ['pro','enterprise'].includes(t.plan)).length, '#c8f04a'],
              ['Activos',        tenantList.filter(t => t.status === 'active').length,        '#f0a44a'],
            ].map(([l, v, c]) => (
              <div key={l as string} style={{ background: '#0d0d0d', borderTop: `2px solid ${c as string}`, border: `1px solid ${(c as string)}18`, padding: '14px 18px', borderRadius: 2 }}>
                <p style={{ fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{l as string}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: c as string, fontFamily: 'DM Mono, monospace', marginTop: 6 }}>{v as number}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: selTenant ? '1fr 340px' : '1fr', gap: 12 }}>
            {/* Tabla */}
            <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 2, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                    {['Nombre', 'Email', 'Plan', 'Estado', 'Creado'].map(h => (
                      <th key={h} style={{ padding: '9px 12px', fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tenantList.length === 0
                    ? <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', fontSize: 11, color: '#222' }}>Sin tenants registrados — usa la tab Registrar</td></tr>
                    : tenantList.map(t => <TenantRow key={t.id} t={t} onSelect={loadUsage} />)
                  }
                </tbody>
              </table>
            </div>

            {/* Panel de uso del tenant seleccionado */}
            {selTenant && usageData && (
              <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 2, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <p style={{ fontSize: 10, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Uso del tenant</p>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${PLAN_COLORS[usageData.plan] ?? '#555'}15`, color: PLAN_COLORS[usageData.plan] ?? '#555', border: `1px solid ${PLAN_COLORS[usageData.plan] ?? '#555'}30`, textTransform: 'capitalize' }}>
                    {usageData.plan}
                  </span>
                </div>
                {Object.entries(usageData.resources).map(([res, d]) => (
                  <UsageBar key={res}
                    label={res.replace(/_/g, ' ')}
                    used={d.used} limit={d.limit}
                    color={PLAN_COLORS[usageData.plan] ?? '#4af0c8'}
                  />
                ))}
                <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {['starter','pro'].map(plan => (
                    <button key={plan} onClick={() => handleUpgrade(selTenant, plan)} disabled={upgrading || usageData.plan === plan} style={{
                      background: '#0a0a0a', border: `1px solid ${PLAN_COLORS[plan]}30`,
                      color: PLAN_COLORS[plan], padding: '7px', borderRadius: 2,
                      fontSize: 10, cursor: usageData.plan === plan ? 'not-allowed' : 'pointer',
                      opacity: usageData.plan === plan ? 0.4 : 1,
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'inherit',
                    }}>
                      {upgrading ? '◌' : `→ ${plan}`}
                    </button>
                  ))}
                </div>
                <button onClick={() => setSelTenant(null)} style={{ marginTop: 12, background: 'transparent', border: 'none', color: '#333', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ← Cerrar panel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PLANS TAB */}
      {tab === 'plans' && (
        <div>
          <p style={{ fontSize: 11, color: '#333', marginBottom: 20 }}>
            Planes activos · Stripe {Object.values(plansMap).some((p: Plan) => p.price_monthly && p.price_monthly > 0) ? 'configurado' : 'no configurado — modo local'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {Object.entries(plansMap).map(([name, plan]) => (
              <PlanCard key={name} name={name} plan={plan as Plan}
                current={false}
                onUpgrade={() => {}}
              />
            ))}
          </div>
        </div>
      )}

      {/* REGISTER TAB */}
      {tab === 'register' && (
        <div style={{ maxWidth: 480 }}>
          <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 2, padding: 24 }}>
            <p style={{ fontSize: 10, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 18 }}>
              Registrar Nuevo Tenant
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              <input style={inp} placeholder="Nombre de la empresa"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onFocus={e => (e.target.style.borderColor = '#c8f04a')}
                onBlur={e => (e.target.style.borderColor = '#1e1e1e')}
              />
              <input style={inp} placeholder="Email" type="email"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                onFocus={e => (e.target.style.borderColor = '#c8f04a')}
                onBlur={e => (e.target.style.borderColor = '#1e1e1e')}
              />
              <select style={{ ...inp, cursor: 'pointer' }} value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
                {Object.keys(plansMap).map(p => (
                  <option key={p} value={p}>{PLAN_ICONS[p]} {p} {plansMap[p]?.price_monthly ? `— $${plansMap[p].price_monthly}/mo` : '— Gratis'}</option>
                ))}
              </select>
              <button onClick={handleCreate} disabled={creating || !form.name || !form.email} style={{
                background: (creating || !form.name || !form.email) ? '#141414' : '#c8f04a',
                color: (creating || !form.name || !form.email) ? '#333' : '#000',
                border: 'none', padding: '12px', borderRadius: 2, fontSize: 12,
                fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em',
                textTransform: 'uppercase', fontFamily: 'inherit', transition: 'all .2s',
              }}>
                {creating ? '◌ Creando...' : 'Crear Tenant'}
              </button>
            </div>
            {msg && <p style={{ fontSize: 11, color: '#f04a6c', marginTop: 10, fontFamily: 'monospace' }}>{msg}</p>}

            {newTenant && (
              <div style={{ marginTop: 16, padding: 16, background: '#0a110a', border: '1px solid #c8f04a22', borderRadius: 2 }}>
                <p style={{ fontSize: 10, color: '#c8f04a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>✓ Tenant creado</p>
                {[
                  ['ID',      newTenant.tenant_id as string],
                  ['Plan',    newTenant.plan as string],
                  ['API Key', newTenant.api_key as string],
                ].map(([l, v]) => (
                  <div key={l} style={{ marginBottom: 8 }}>
                    <p style={{ fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{l}</p>
                    <p style={{ fontSize: 11, color: '#ccc', fontFamily: 'DM Mono, monospace', wordBreak: 'break-all', marginTop: 2 }}>{v}</p>
                  </div>
                ))}
                <p style={{ fontSize: 10, color: '#f04a6c', marginTop: 10 }}>⚠ Guarda la API Key — no la podrás ver de nuevo</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
