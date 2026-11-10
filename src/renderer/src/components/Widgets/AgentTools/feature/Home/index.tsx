import { memo, useMemo } from 'react'
import type { AgentSessionItem } from '../../services/agentApi'
import { useAgentSessions } from '../History/hooks/useAgentSessions'
import { HomeHeader } from './components/HomeHeader'
import { HistoryConversation } from './components/HistoryConversation'
import { StatsGrid } from './components/StatsGrid'
import { UsageChart } from './components/UsageChart'
import { ModelDistribution } from './components/ModelDistribution'
import { computeHomeStats } from './utils/stats'

interface HomeFeatureProps {
  onSelectSession?: (item: AgentSessionItem) => void
}

export const HomeFeature = memo<HomeFeatureProps>(({ onSelectSession }) => {
  const { sessions, pending } = useAgentSessions()

  const stats = useMemo(() => computeHomeStats(sessions), [sessions])

  const isLoading = Object.values(pending).some(Boolean)

  return (
    <div className="flex-1 overflow-y-auto">
      <div
        className="flex flex-col gap-5 p-4"
        style={{ maxWidth: '680px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}
      >
        <button
          type="button"
          onClick={() =>
            void window.api
              .invoke('agent-tool:probe-sessions')
              .then((result: unknown) => console.log('[DEBUG] probe-sessions result', result))
          }
          className="self-end px-2 py-1 text-[10px] rounded-md text-text-secondary bg-button-soft-background hover:text-text-primary"
        >
          Probe sessions (debug)
        </button>
        <HomeHeader />
        <StatsGrid
          totalSessions={stats.totalSessions}
          totalMessages={stats.totalMessages}
          totalTokens={stats.totalTokens}
          favoriteModel={stats.favoriteModel}
        />
        <ModelDistribution models={stats.models} />
        <UsageChart daily={stats.daily} />
        <HistoryConversation sessions={sessions} isLoading={isLoading} onSelect={onSelectSession} />
      </div>
    </div>
  )
})

HomeFeature.displayName = 'HomeFeature'