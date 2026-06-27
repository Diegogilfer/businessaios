// ============================================================
// BusinessAIOS - src/lib/api.ts
// Cliente centralizado para todos los endpoints del backend
// ============================================================

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const key = typeof window !== 'undefined' ? localStorage.getItem('baios_access_key') : null
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (key) headers['Authorization'] = `Bearer ${key}`

  const r = await fetch(`${BASE}${path}`, {
    headers,
    ...opts,
  })
  if (!r.ok) throw new Error(`API ${r.status}: ${await r.text()}`)
  return r.json()
}

// ── Dashboard ────────────────────────────────────────────────
export const getDashboardOverview  = () => req('/dashboard/overview')
export const getExecutionTimeline  = (days = 7) => req(`/dashboard/execution-timeline?days=${days}`)
export const getAgentPerformance   = () => req('/dashboard/agent-performance')
export const getKnowledgeGrowth    = () => req('/dashboard/knowledge-growth')
export const getArbOpportunities   = () => req('/dashboard/arbitrage-opportunities')
export const getNeuroPrediction    = () => req('/dashboard/neuro-prediction')
export const getSystemHealth       = () => req('/dashboard/system-health')

// ── Analytics ───────────────────────────────────────────────
export const getAnalyticsHealth    = () => req('/analytics/health')
export const getAnalyticsExecs     = (days = 7) => req(`/analytics/executions?days=${days}`)
export const getAnalyticsAgents    = () => req('/analytics/agents')
export const getAnalyticsKnowledge = () => req('/analytics/knowledge')

// ── Tasks ────────────────────────────────────────────────────
export const listTasks  = (status?: string) => req(`/tasks${status ? `?status=${status}` : ''}`)
export const getTask    = (id: string) => req(`/tasks/${id}`)
export const createTask = (body: TaskCreate) =>
  req<{ task: Task }>('/tasks/', { method: 'POST', body: JSON.stringify(body) }).then(r => r.task)
export const executeTask = (task_id: string, use_collaboration = true) =>
  req('/tasks/execute', { method: 'POST', body: JSON.stringify({ task_id, use_collaboration }) })

// ── Agents ──────────────────────────────────────────────────
export const listAgents = () => req('/agents')
export const getAgent   = (id: string) => req(`/agents/${id}`)

// ── Arbitrage ───────────────────────────────────────────────
export const getOpportunities = (limit = 20) => req(`/arbitrage/opportunities?limit=${limit}`)
export const startScan        = (category: string, subcategory?: string) =>
  req('/arbitrage/scan', { method: 'POST', body: JSON.stringify({ category, subcategory }) })

// ── RAG / Knowledge ─────────────────────────────────────────
export const semanticSearch = (query: string, limit = 5) =>
  req('/rag/search/semantic', { method: 'POST', body: JSON.stringify({ query, limit }) })
export const listKnowledge      = (category?: string) =>
  req(`/knowledge${category ? `?category=${category}` : ''}`)
export const getKnowledgeRecent = (limit = 20) => req(`/knowledge/recent?limit=${limit}`)
export const getKnowledgeByAgent = (role: string, limit = 20) =>
  req(`/knowledge/agent/${role}?limit=${limit}`)
export const getKnowledgeStats  = () => req('/knowledge/stats')

// ── Chat ─────────────────────────────────────────────────────
export const createConversation = (agent_role: string, title = '') =>
  req<{ conversation_id: string }>('/chat/conversations', {
    method: 'POST', body: JSON.stringify({ agent_role, title })
  })
export const sendChatMessage = (conversation_id: string, agent_role: string, message: string) =>
  req<{ response: string }>('/chat/message', {
    method: 'POST', body: JSON.stringify({ conversation_id, agent_role, message })
  })

// ── Skills Marketplace ───────────────────────────────────────
export const getSkillsCatalog   = (category?: string, agentRole?: string) => {
  const p = new URLSearchParams()
  if (category)  p.set('category', category)
  if (agentRole) p.set('agent_role', agentRole)
  return req(`/skills/catalog${p.toString() ? `?${p}` : ''}`)
}
export const getInstalledSkills = () => req('/skills/installed')
export const installSkill       = (skill_name: string) =>
  req('/skills/install', { method: 'POST', body: JSON.stringify({ skill_name }) })
export const uninstallSkill     = (skill_name: string) =>
  req(`/skills/install/${skill_name}`, { method: 'DELETE' })
export const executeSkill       = (skill_name: string, params: Record<string, string>) =>
  req('/skills/execute', { method: 'POST', body: JSON.stringify({ skill_name, params }) })
export const saveUserPrompt     = (title: string, content: string) =>
  req('/knowledge/', { method: 'POST', body: JSON.stringify({
    title, content, category: 'user_prompt',
    source_agent: null, tags: ['user', 'prompt', 'business_context'],
  })})

// ── Security ─────────────────────────────────────────────────
export const getSecurityStatus = () => req('/security/status')
export const getSecurityAudit  = () => req('/security/audit')
export const runSecurityAudit  = () => req('/security/audit/run', { method: 'POST' })

// ── Types ────────────────────────────────────────────────────
export type TaskCreate = {
  title: string
  description: string
  category?: string
  priority?: number
  agent_id?: string
}

export type Task = {
  id: string
  title: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  priority: number
  category: string
  result?: string
  created_at: string
  updated_at: string
}

export type Agent = {
  id: string
  name: string
  role: string
  goal: string
}

export type ArbitrageOpportunity = {
  id: string
  amazon_asin: string
  amazon_price: number
  supplier_price: number
  shipping_cost: number
  net_margin: number
  roi_percent: number
  risk_level: 'low' | 'medium' | 'high'
  viable: boolean
  category: string
  created_at: string
}
