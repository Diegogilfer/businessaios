const STATUS_COLORS: Record<string, string> = {
  completed: '#c8f04a',
  running:   '#4af0c8',
  failed:    '#f04a6c',
  pending:   '#444',
}

export default function StatusDot({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? '#444'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: color,
        boxShadow: status === 'running' ? `0 0 8px ${color}` : 'none',
        display: 'inline-block',
        animation: status === 'running' ? 'pulse-dot 1.5s infinite' : 'none',
      }} />
      <span style={{ color: color, textTransform: 'capitalize' }}>{status}</span>
    </span>
  )
}
