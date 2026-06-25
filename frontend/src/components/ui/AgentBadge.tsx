import { AGENTS } from '@/lib/constants'

type Role = keyof typeof AGENTS

export default function AgentBadge({ role }: { role: string }) {
  const ag = AGENTS[role as Role] ?? { label: role, color: '#888', icon: '○' }
  return (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 20,
      background: `${ag.color}12`, color: ag.color,
      border: `1px solid ${ag.color}30`,
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      {ag.icon} {ag.label}
    </span>
  )
}
