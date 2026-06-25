export const AGENTS = {
  ceo:        { label: 'CEO',        color: '#c8f04a', icon: '⬡', desc: 'Consolida y dirige la estrategia' },
  research:   { label: 'Research',   color: '#4af0c8', icon: '◈', desc: 'Analiza mercados y competidores' },
  commercial: { label: 'Commercial', color: '#f0a44a', icon: '◆', desc: 'Captura y convierte leads' },
  content:    { label: 'Content',    color: '#c44af0', icon: '◉', desc: 'Genera contenido de marketing' },
  finance:    { label: 'Finance',    color: '#4a9cf0', icon: '◇', desc: 'Modela proyecciones financieras' },
  operations: { label: 'Operations', color: '#f04a6c', icon: '◎', desc: 'Diseña procesos operativos' },
} as const

export const CATEGORIES = [
  'general', 'market_research', 'sales',
  'content', 'strategy', 'finance', 'operations',
] as const

export const RISK_COLORS = {
  low:    '#c8f04a',
  medium: '#f0a44a',
  high:   '#f04a6c',
} as const

export const EVENT_COLORS: Record<string, string> = {
  task_completed:         '#c8f04a',
  task_started:           '#4af0c8',
  task_failed:            '#f04a6c',
  agent_started:          '#f0a44a',
  collaboration_started:  '#c44af0',
  'system.startup':       '#4a9cf0',
}
