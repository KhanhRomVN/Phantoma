import type { AgentSessionItem } from '../../../services/agentApi'

export interface SessionGroup {
  label: string
  items: AgentSessionItem[]
}

const DAY_MS = 86400000

function startOfToday(now: number): number {
  const date = new Date(now)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function groupSessions(sessions: AgentSessionItem[], now = Date.now()): SessionGroup[] {
  const today = startOfToday(now)
  const buckets: Array<[string, number]> = [
    ['Today', today],
    ['Yesterday', today - DAY_MS],
    ['Previous 7 days', today - 7 * DAY_MS],
    ['Previous 30 days', today - 30 * DAY_MS]
  ]
  const groups = new Map<string, AgentSessionItem[]>()
  for (const session of sessions) {
    const label = buckets.find(([, from]) => session.updatedAt >= from)?.[0] ?? 'Older'
    const list = groups.get(label) ?? []
    list.push(session)
    groups.set(label, list)
  }
  return [...buckets.map(([label]) => label), 'Older']
    .filter((label) => groups.has(label))
    .map((label) => ({ label, items: groups.get(label)! }))
}