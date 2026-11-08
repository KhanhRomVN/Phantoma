import type { AgentSessionItem } from '../../../services/agentApi'

export interface SessionGroup {
  label: string
  items: AgentSessionItem[]
}

const DAY_SECONDS = 86400

function startOfToday(now: number): number {
  const date = new Date(now)
  date.setHours(0, 0, 0, 0)
  return date.getTime() / 1000
}

export function groupSessions(sessions: AgentSessionItem[], now = Date.now()): SessionGroup[] {
  const today = startOfToday(now)
  const buckets: Array<[string, number]> = [
    ['Today', today],
    ['Yesterday', today - DAY_SECONDS],
    ['Previous 7 days', today - 7 * DAY_SECONDS],
    ['Previous 30 days', today - 30 * DAY_SECONDS]
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

export function formatSessionTime(seconds: number, now = Date.now()): string {
  if (!seconds) return ''
  const date = new Date(seconds * 1000)
  const pad = (n: number): string => n.toString().padStart(2, '0')
  if (seconds >= startOfToday(now)) return `${pad(date.getHours())}:${pad(date.getMinutes())}`
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
}