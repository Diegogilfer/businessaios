'use client'
import { useState, useEffect } from 'react'

const STORAGE_KEY = 'baios_access_key'
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type Props = { onAuth: (key: string) => void }

export default function LoginGate({ onAuth }: Props) {
  const [key,     setKey]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [mode,    setMode]    = useState<'login' | 'recover'>('login')
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) verify(saved, false)
  }, [])

  async function verify(k: string, save = true) {
    setLoading(true); setError('')
    try {
      const r = await fetch(`${API}/auth/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: k }),
      })
      if (r.ok) {
        if (save) localStorage.setItem(STORAGE_KEY, k)
        onAuth(k)
      } else {
        localStorage.removeItem(STORAGE_KEY)
        setError('Clave incorrecta. Formato: BAIOS-XXXX-XXXX-XXXX')
      }
    } catch (_) {
      if (save) localStorage.setItem(STORAGE_KEY, k)
      onAuth(k)
    }
    setLoading(false)
  }

  async function sendRecovery() {
    setLoading(true)
    try {
      await fetch(`${API}/auth/recover-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSent(true)
    } catch (_) {}
    setLoading(false)
  }

  const inp: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    color: 'var(--text-1)',
    padding: '13px 18px',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: '0.08em',
    textAlign: 'center',
    transition: 'all 0.2s ease',
  }

  const btn = (disabled: boolean): React.CSSProperties => ({
    width: '100%', marginTop: 14,
    background: disabled ? 'rgba(255,255,255,0.04)' : 'var(--primary)',
    color: disabled ? 'var(--text-3)' : '#000',
    border: disabled ? '1px solid rgba(255,255,255,0.07)' : 'none',
    padding: '13px', borderRadius: 8,
    fontSize: 11, fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    letterSpacing: '0.1em', textTransform: 'uppercase',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
    boxShadow: disabled ? 'none' : '0 0 24px var(--primary-glow)',
  })

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter','Helvetica Neue',sans-serif",
      position: 'relative',
    }}>
      {/* background mesh */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 70% 50% at 30% 20%, rgba(0,229,204,0.07) 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 70% 80%, rgba(123,92,255,0.07) 0%, transparent 60%)
        `,
      }} />

      <div style={{ width: 400, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{
            width: 56, height: 56, margin: '0 auto 20px',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, color: '#000', fontWeight: 700,
            boxShadow: '0 0 40px var(--primary-glow)',
          }}>⬡</div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '0.1em', margin: 0 }}>
            BUSINESSAIOS
          </h1>
          <p style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.18em', marginTop: 6, fontWeight: 500 }}>
            v1.3.0 · SISTEMA DE INTELIGENCIA EMPRESARIAL
          </p>
        </div>

        {/* Card */}
        <div className="glass" style={{ borderRadius: 16, padding: 32 }}>
          {mode === 'login' ? (
            <>
              <p style={{ fontSize: 10, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 20, textAlign: 'center', fontWeight: 600 }}>
                Clave de Acceso
              </p>
              <input
                style={inp}
                placeholder="BAIOS-XXXX-XXXX-XXXX"
                value={key}
                onChange={e => setKey(e.target.value.toUpperCase())}
                onFocus={e => { e.target.style.borderColor = 'rgba(0,229,204,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,229,204,0.08)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)'; e.target.style.boxShadow = 'none' }}
                onKeyDown={e => e.key === 'Enter' && verify(key)}
                autoComplete="off" spellCheck={false}
              />
              {error && (
                <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 10, textAlign: 'center', background: 'rgba(255,69,102,0.08)', padding: '8px 12px', borderRadius: 6 }}>
                  {error}
                </p>
              )}
              <button onClick={() => verify(key)} disabled={!key.trim() || loading} style={btn(!key.trim() || loading)}>
                {loading ? '◌  Verificando...' : 'Ingresar →'}
              </button>
              <p style={{ textAlign: 'center', marginTop: 18, fontSize: 11, color: 'var(--text-3)' }}>
                ¿Olvidaste tu clave?{' '}
                <span onClick={() => setMode('recover')} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }}>
                  Recuperar
                </span>
              </p>
            </>
          ) : !sent ? (
            <>
              <p style={{ fontSize: 10, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8, textAlign: 'center', fontWeight: 600 }}>
                Recuperar Acceso
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20, textAlign: 'center', lineHeight: 1.7 }}>
                Ingresa tu email de respaldo registrado en el sistema.
              </p>
              <input
                style={{ ...inp, letterSpacing: 'normal', fontFamily: 'Inter, sans-serif' }}
                placeholder="correo@empresa.com"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={e => { e.target.style.borderColor = 'rgba(0,229,204,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,229,204,0.08)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)'; e.target.style.boxShadow = 'none' }}
              />
              <button onClick={sendRecovery} disabled={!email || loading} style={btn(!email || loading)}>
                {loading ? '◌  Enviando...' : 'Enviar instrucciones'}
              </button>
              <p style={{ textAlign: 'center', marginTop: 18, fontSize: 11 }}>
                <span onClick={() => setMode('login')} style={{ color: 'var(--text-3)', cursor: 'pointer' }}>← Volver</span>
              </p>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(0,229,204,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 22 }}>✓</div>
              <p style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 600, marginBottom: 8 }}>Instrucciones enviadas</p>
              <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>
                Revisa tu bandeja.<br />El token expira en 15 minutos.
              </p>
              <p style={{ marginTop: 20, fontSize: 11 }}>
                <span onClick={() => { setMode('login'); setSent(false) }} style={{ color: 'var(--text-3)', cursor: 'pointer' }}>
                  ← Volver al login
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
