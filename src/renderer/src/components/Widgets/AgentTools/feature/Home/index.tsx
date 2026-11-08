import { memo, useMemo, useState } from 'react'
import { getFaviconUrl } from '@renderer/utils/favicon'
import { cn } from '@renderer/utils/cn'
import { AGENT_LIST } from '../../services/agentApi'
import { useAgentToolStore } from '../../hooks/useAgentToolStore'
import { HistoryFeature } from '../History'
import { useAgentSessions } from '../History/hooks/useAgentSessions'

const HeroSection = memo(() => {
  const selectedProvider = useAgentToolStore((state) => state.selectedProvider)
  const agent = AGENT_LIST.find((item) => item.id === selectedProvider?.id) ?? AGENT_LIST[0]
  if (!agent) return null

  return (
    <div className="flex flex-col items-center gap-3 pt-6 pb-1">
      <div className="w-14 h-14 rounded-2xl bg-card-background border border-border flex items-center justify-center shadow-[0_0_32px_rgba(255,255,255,0.06)]">
        <img
          src={getFaviconUrl(agent.url, 64)}
          alt={agent.name}
          className="w-7 h-7 rounded-md object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-lg font-semibold text-text-primary">{agent.name}</span>
        <span className="text-xs text-text-secondary">
          Continue a conversation or start a new one
        </span>
      </div>
    </div>
  )
})

HeroSection.displayName = 'HeroSection'

interface AgentStatsProps {
  counts: Record<string, number>
  pending: Record<string, boolean>
  activeId: string | null
  onToggle: (id: string) => void
}

const AgentStats = memo<AgentStatsProps>(({ counts, pending, activeId, onToggle }) => (
  <div className="grid grid-cols-3 gap-2">
    {AGENT_LIST.map((agent) => (
      <button
        key={agent.id}
        type="button"
        onClick={() => onToggle(agent.id)}
        className={cn(
          'flex flex-col gap-2 p-3 rounded-lg border text-left transition-colors bg-card-background',
          activeId === agent.id
            ? 'border-text-secondary/60'
            : 'border-border/60 hover:border-border'
        )}
      >
        <div className="w-7 h-7 rounded-full bg-background border border-border flex items-center justify-center">
          <img
            src={getFaviconUrl(agent.url, 32)}
            alt=""
            className="w-3.5 h-3.5 rounded-sm object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
        <div className="flex flex-col">
          {pending[agent.id] ? (
            <div className="h-5 w-8 rounded bg-button-soft-background animate-pulse" />
          ) : (
            <span className="text-lg font-semibold leading-tight text-text-primary">
              {counts[agent.id] ?? 0}
            </span>
          )}
          <span className="truncate text-[10px] uppercase tracking-[0.05em] text-text-secondary">
            {agent.name}
          </span>
        </div>
      </button>
    ))}
  </div>
))

AgentStats.displayName = 'AgentStats'

export const HomeFeature = memo(() => {
  const { sessions, pending } = useAgentSessions()
  const [agentFilter, setAgentFilter] = useState<string | null>(null)

  const counts = useMemo(() => {
    const result: Record<string, number> = {}
    for (const session of sessions) result[session.agentId] = (result[session.agentId] ?? 0) + 1
    return result
  }, [sessions])

  const visibleSessions = useMemo(
    () => (agentFilter ? sessions.filter((s) => s.agentId === agentFilter) : sessions),
    [sessions, agentFilter]
  )

  const isLoading = agentFilter ? !!pending[agentFilter] : Object.values(pending).some(Boolean)

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
      <HeroSection />
      <AgentStats
        counts={counts}
        pending={pending}
        activeId={agentFilter}
        onToggle={(id) => setAgentFilter((current) => (current === id ? null : id))}
      />
      <HistoryFeature sessions={visibleSessions} isLoading={isLoading} />
    </div>
  )
})

HomeFeature.displayName = 'HomeFeature'