import type { AgentSessionItem } from '../../../services/agentApi'

export interface DailyUsage {
  date: string
  sessions: number
  tokens: number
}

export interface ModelUsage {
  modelId: string
  agentId: string
  url: string
  sessions: number
  tokens: number
}

export interface HomeStats {
  totalSessions: number
  totalMessages: number
  totalTokens: number
  favoriteModel: string
  daily: DailyUsage[]
  models: ModelUsage[]
}

export const USAGE_DAYS = 14

const DAY_MS = 86400000

const pad2 = (n: number): string => n.toString().padStart(2, '0')

const dateKey = (ts: number): string => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function computeHomeStats(sessions: AgentSessionItem[], now = Date.now()): HomeStats {
  const dayMap = new Map<string, DailyUsage>()
  for (let i = USAGE_DAYS - 1; i >= 0; i--) {
    const date = dateKey(now - i * DAY_MS)
    dayMap.set(date, { date, sessions: 0, tokens: 0 })
  }

  const modelMap = new Map<string, ModelUsage>()
  let totalMessages = 0
  let totalTokens = 0

  for (const s of sessions) {
    const tokens = s.totalTokens ?? 0
    totalMessages += s.messageCount ?? 0
    totalTokens += tokens

    const day = dayMap.get(dateKey(s.updatedAt))
    if (day) {
      day.sessions += 1
      day.tokens += tokens
    }

    if (s.modelId) {
      const key = `${s.agentId}:${s.modelId}`
      const entry = modelMap.get(key) ?? {
        modelId: s.modelId,
        agentId: s.agentId,
        url: s.url,
        sessions: 0,
        tokens: 0
      }
      entry.sessions += 1
      entry.tokens += tokens
      modelMap.set(key, entry)
    }
  }

  const models = [...modelMap.values()].sort((a, b) => b.sessions - a.sessions)

  return {
    totalSessions: sessions.length,
    totalMessages,
    totalTokens,
    favoriteModel: models[0]?.modelId ?? '—',
    daily: [...dayMap.values()],
    models
  }
}

export function formatTokens(v: number): string {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return String(v)
}