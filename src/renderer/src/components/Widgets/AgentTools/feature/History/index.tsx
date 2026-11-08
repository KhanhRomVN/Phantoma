import { memo } from 'react'
import type { AgentSessionItem } from '../../services/agentApi'
import { HistorySection } from './components/HistorySection'

interface HistoryFeatureProps {
  sessions: AgentSessionItem[]
  isLoading: boolean
  onSelect?: (item: AgentSessionItem) => void
}

export const HistoryFeature = memo<HistoryFeatureProps>(({ sessions, isLoading, onSelect }) => (
  <HistorySection sessions={sessions} isLoading={isLoading} onSelect={onSelect} />
))

HistoryFeature.displayName = 'HistoryFeature'