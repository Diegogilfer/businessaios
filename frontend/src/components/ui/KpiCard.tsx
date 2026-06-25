'use client'
import { useEffect, useState } from 'react'

interface Props {
  label: string
  value: number | string | null | undefined
  suffix?: string
  decimals?: number
  accent: string
  sub?: string
  isText?: boolean
}

function AnimNum({ value, decimals = 0 }: { value: number; decimals: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    const target = value || 0
    let start: number | null = null
    const step = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / 900, 1)
      const ease = 1 - Math.pow(1 - p, 4)
      setDisplay(+(target * ease).toFixed(decimals))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [value, decimals])
  return <>{display.toLocaleString()}</>
}

export default function KpiCard({ label, value, suffix = '', decimals = 0, accent, sub, isText }: Props) {
  return (
    <div className="animate-fade-in glass" style={{
      borderRadius: 'var(--radius-lg)',
      padding: '20px 22px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'var(--transition)',
      borderLeft: `2px solid ${accent}`,
    }}>
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 90, height: 90, borderRadius: '50%',
        background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <p style={{
        fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-2)',
        textTransform: 'uppercase', marginBottom: 10, fontWeight: 500,
      }}>
        {label}
      </p>
      <p style={{
        fontSize: isText ? 15 : 30, fontWeight: 600, color: accent,
        fontFamily: "'JetBrains Mono', monospace", lineHeight: 1, marginBottom: 6,
      }}>
        {isText
          ? (value ?? '—')
          : value != null
            ? <><AnimNum value={Number(value)} decimals={decimals} />{suffix}</>
            : '—'
        }
      </p>
      {sub && (
        <p style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 400 }}>{sub}</p>
      )}
    </div>
  )
}
