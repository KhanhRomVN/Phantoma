import { useEffect, useState } from 'react'
import { AGENT_LIST, fetchSessionsFor, type AgentSessionItem } from '../../../services/agentApi'

export function useAgentSessions() {
  const [sessions, setSessions] = useState<AgentSessionItem[]>([])
  const [pending, setPending] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(AGENT_LIST.map((agent) => [agent.id, true]))
  )

  useEffect(() => {
    let cancelled = false
    AGENT_LIST.forEach((agent) => {
      fetchSessionsFor(agent.id)
        .then((items) => {
          if (cancelled || items.length === 0) return
          setSessions((prev) =>
            [...prev.filter((s) => s.agentId !== agent.id), ...items].sort(
              (a, b) => b.updatedAt - a.updatedAt
            )
          )
        })
        .finally(() => {
          if (!cancelled) setPending((prev) => ({ ...prev, [agent.id]: false }))
        })
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { sessions, pending }
}