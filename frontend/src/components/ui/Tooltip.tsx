'use client'
import { useState, useRef, ReactNode } from 'react'

export default function Tooltip({
  text,
  children,
  position = 'top',
  maxWidth = 220,
}: {
  text: string
  children: ReactNode
  position?: 'top' | 'bottom' | 'right'
  maxWidth?: number
}) {
  const [visible, setVisible] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (!text) return <>{children}</>

  function show() { timer.current = setTimeout(() => setVisible(true), 420) }
  function hide() { if (timer.current) clearTimeout(timer.current); setVisible(false) }

  const pos =
    position === 'top'    ? { bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' } :
    position === 'bottom' ? { top:    'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' } :
                            { left:   'calc(100% + 8px)', top:  '50%', transform: 'translateY(-50%)' }

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && (
        <div style={{
          position: 'absolute',
          ...pos,
          background: '#0B1220',
          border: '1px solid rgba(255,255,255,0.09)',
          color: 'rgba(255,255,255,0.60)',
          fontSize: 10.5, lineHeight: 1.55,
          padding: '6px 11px', borderRadius: 7,
          maxWidth, width: 'max-content',
          zIndex: 9999, pointerEvents: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
          animation: 'fadeIn 0.14s ease',
          whiteSpace: 'normal',
        }}>
          {text}
        </div>
      )}
    </div>
  )
}
