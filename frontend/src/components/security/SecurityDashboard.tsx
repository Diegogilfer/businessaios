'use client'
// ============================================================
// BusinessAIOS - src/components/security/SecurityDashboard.tsx
// Panel de seguridad — consume /security/status y /security/audit
// ============================================================
import { useState, useCallback } from 'react'
import { usePoll } from '@/hooks/usePoll'
import { getSecurityStatus, getSecurityAudit, runSecurityAudit } from '@/lib/api'

type Finding = {
  check: string
  status: 'pass' | 'warn' | 'fail'
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

type AuditResult = {
  score: number
  grade: string
  findings: Finding[]
  timestamp: string
  persisted?: boolean
}

type SecurityStatus = {
  status: 'ok' | 'degraded' | 'critical'
  score?: number
  grade?: string
  checks_passed?: number
  checks_total?: number
  last_audit?: string
  rate_limiting?: boolean
  security_headers?: boolean
  log_redaction?: boolean
}

const GRADE_COLOR: Record<string, string> = {
  A: '#c8f04a', B: '#4af0c8', C: '#f0a44a', D: '#f07a4a', F: '#f04a6c',
}

const SEV_COLOR: Record<string, string> = {
  critical: '#f04a6c', high: '#f07a4a', medium: '#f0a44a', low: '#4af0c8',
}

const STATUS_COLOR: Record<string, string> = {
  pass: '#c8f04a', warn: '#f0a44a', fail: '#f04a6c',
}

function ScoreGauge({ score, grade }: { score: number; grade: string }) {
  const color = GRADE_COLOR[grade] ?? '#555'
  const pct = Math.min(100, Math.max(0, score))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <div style={{ position: 'relative', width: 80, height: 80 }}>
        <svg width={80} height={80} viewBox="0 0 80 80">
          <circle cx={40} cy={40} r={34} fill="none" stroke="#1a1a1a" strokeWidth={6} />
          <circle
            cx={40} cy={40} r={34} fill="none"
            stroke={color} strokeWidth={6}
            strokeDasharray={`${2 * Math.PI * 34}`}
            strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct / 100)}`}
            strokeLinecap="round"
            transform="rotate(-90 40 40)"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
          <text x={40} y={44} textAnchor="middle" fill={color} fontSize={18} fontWeight={700} fontFamily="monospace">{grade}</text>
        </svg>
      </div>
      <div>
        <p style={{ fontSize: 28, fontWeight: 300, color: '#eee', lineHeight: 1 }}>{pct}<span style={{ fontSize: 13, color: '#444' }}>/100</span></p>
        <p style={{ fontSize: 10, color: '#333', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>Security Score</p>
      </div>
    </div>
  )
}

function FindingRow({ f }: { f: Finding }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid #111' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[f.status], marginTop: 5, flexShrink: 0, boxShadow: `0 0 6px ${STATUS_COLOR[f.status]}66` }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#ccc', fontFamily: 'monospace' }}>{f.check}</span>
          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 2, background: `${SEV_COLOR[f.severity]}22`, color: SEV_COLOR[f.severity], textTransform: 'uppercase', letterSpacing: '0.08em' }}>{f.severity}</span>
        </div>
        <p style={{ fontSize: 10, color: '#555', marginTop: 3 }}>{f.message}</p>
      </div>
    </div>
  )
}

export default function SecurityDashboard() {
  const [audit, setAudit] = useState<AuditResult | null>(null)
  const [running, setRunning] = useState(false)
  const [auditErr, setAuditErr] = useState<string | null>(null)

  const statusFn = useCallback(() => getSecurityStatus(), [])
  const { data: statusRaw, loading: statusLoading } = usePoll(statusFn, 30000, true)
  const status = statusRaw as SecurityStatus | null

  async function handleRunAudit() {
    setRunning(true)
    setAuditErr(null)
    try {
      const result = await runSecurityAudit() as AuditResult
      setAudit(result)
    } catch (e: unknown) {
      setAuditErr(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setRunning(false)
    }
  }

  async function handleViewAudit() {
    setRunning(true)
    setAuditErr(null)
    try {
      const result = await getSecurityAudit() as AuditResult
      setAudit(result)
    } catch (e: unknown) {
      setAuditErr(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setRunning(false)
    }
  }

  const score = audit?.score ?? status?.score ?? 0
  const grade = audit?.grade ?? status?.grade ?? '—'
  const findings: Finding[] = audit?.findings ?? []

  const passCount  = findings.filter(f => f.status === 'pass').length
  const warnCount  = findings.filter(f => f.status === 'warn').length
  const failCount  = findings.filter(f => f.status === 'fail').length

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 300, color: '#eee' }}>Security Center</h2>
        <p style={{ fontSize: 11, color: '#2a2a2a', marginTop: 3 }}>Auditoría de configuración · detección de brute-force · 9 vectores hardened</p>
      </div>

      {/* Status strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Rate Limiting', ok: status?.rate_limiting },
          { label: 'Sec. Headers', ok: status?.security_headers },
          { label: 'Log Redaction', ok: status?.log_redaction },
          { label: 'Sistema', ok: status?.status === 'ok' },
        ].map(({ label, ok }) => (
          <div key={label} style={{ background: '#0d0d0d', border: `1px solid ${ok ? '#1a2a0a' : '#2a1a0a'}`, borderRadius: 2, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: ok === undefined ? '#333' : ok ? '#c8f04a' : '#f04a6c', boxShadow: ok ? '0 0 8px #c8f04a66' : 'none', flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: '#555', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 14 }}>
        {/* Score card */}
        <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 2, padding: 24 }}>
          {statusLoading && !status
            ? <p style={{ color: '#333', fontSize: 11 }}>Cargando estado…</p>
            : <ScoreGauge score={score} grade={grade} />
          }

          {status && (
            <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid #111' }}>
              {[
                ['Checks passed', `${status.checks_passed ?? '—'}/${status.checks_total ?? '—'}`],
                ['Último audit', status.last_audit ? new Date(status.last_audit).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' }) : '—'],
                ['Estado', status.status],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 10, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k}</span>
                  <span style={{ fontSize: 10, color: '#777', fontFamily: 'monospace' }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={handleViewAudit} disabled={running} style={{ background: 'transparent', border: '1px solid #1e1e1e', color: '#c8f04a', padding: '8px 14px', borderRadius: 2, fontSize: 10, cursor: running ? 'not-allowed' : 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'inherit', opacity: running ? 0.5 : 1 }}>
              Ver Último Audit
            </button>
            <button onClick={handleRunAudit} disabled={running} style={{ background: running ? '#0a1a02' : '#0f2004', border: '1px solid #1e3a08', color: '#c8f04a', padding: '8px 14px', borderRadius: 2, fontSize: 10, cursor: running ? 'not-allowed' : 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'inherit' }}>
              {running ? 'Auditando…' : '▶ Ejecutar Audit'}
            </button>
          </div>

          {auditErr && (
            <p style={{ marginTop: 12, fontSize: 10, color: '#f04a6c', background: '#1a0a0a', padding: '8px 10px', borderRadius: 2 }}>{auditErr}</p>
          )}
        </div>

        {/* Findings panel */}
        <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 2, padding: 24 }}>
          {!audit ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200, gap: 8 }}>
              <span style={{ fontSize: 28, opacity: 0.15 }}>⬡</span>
              <p style={{ fontSize: 11, color: '#333', textAlign: 'center' }}>Ejecuta un audit para ver los hallazgos</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <p style={{ fontSize: 10, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Hallazgos — {findings.length} checks</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[['pass', passCount, '#c8f04a'], ['warn', warnCount, '#f0a44a'], ['fail', failCount, '#f04a6c']].map(([s, n, c]) => (
                    <span key={s as string} style={{ fontSize: 10, color: c as string }}>{n as number} {s as string}</span>
                  ))}
                </div>
              </div>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {findings.map((f, i) => <FindingRow key={i} f={f} />)}
              </div>
              {audit.timestamp && (
                <p style={{ marginTop: 14, fontSize: 9, color: '#222', textAlign: 'right', fontFamily: 'monospace' }}>
                  {new Date(audit.timestamp).toLocaleString('es')} {audit.persisted && '· alertas guardadas'}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
