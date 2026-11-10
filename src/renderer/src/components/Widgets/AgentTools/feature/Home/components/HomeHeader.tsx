import { memo } from 'react'
import { getFaviconUrl } from '@renderer/utils/favicon'
import { AGENT_LIST } from '../../../services/agentApi'
import { useAgentToolStore } from '../../../hooks/useAgentToolStore'

export const HomeHeader = memo(() => {
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

HomeHeader.displayName = 'HomeHeader'