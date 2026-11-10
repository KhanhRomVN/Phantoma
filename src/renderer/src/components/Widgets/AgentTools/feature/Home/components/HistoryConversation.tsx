import { memo, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { AgentSessionItem } from '../../../services/agentApi'
import { groupSessions } from '../../History/utils/groupSessions'
import { HistoryCard } from '../../History/components/HistoryCard'

const PAGE_SIZE = 12

interface HistoryConversationProps {
  sessions: AgentSessionItem[]
  isLoading: boolean
  onSelect?: (item: AgentSessionItem) => void
}

export const HistoryConversation = memo<HistoryConversationProps>(
  ({ sessions, isLoading, onSelect }) => {
    const [visible, setVisible] = useState(PAGE_SIZE)

    const groups = useMemo(() => groupSessions(sessions.slice(0, visible)), [sessions, visible])
    const remaining = sessions.length - visible

    return (
      <div className="bg-card-background rounded-lg p-3.5 box-border">
        <div className="flex justify-between items-center mb-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-primary opacity-80">
            Recent Conversations
          </span>
          {sessions.length > 0 && (
            <span className="text-[10px] text-text-secondary opacity-70">{sessions.length}</span>
          )}
        </div>

        {isLoading && sessions.length === 0 ? (
          <div className="flex items-center gap-2 py-2.5 text-text-secondary opacity-60">
            <Loader2 size={12} className="animate-spin" />
            <span className="text-[11px]">Loading history...</span>
          </div>
        ) : groups.length > 0 ? (
          <div className="flex flex-col gap-3">
            {groups.map((group) => (
              <div key={group.label} className="flex flex-col gap-0.5">
                <span className="px-1 pb-1 text-[10px] font-medium uppercase tracking-[0.06em] text-text-secondary opacity-60">
                  {group.label}
                </span>
                {group.items.map((item) => (
                  <HistoryCard key={`${item.agentId}:${item.id}`} item={item} onSelect={onSelect} />
                ))}
              </div>
            ))}
            {remaining > 0 && (
              <button
                type="button"
                onClick={() => setVisible((n) => n + PAGE_SIZE)}
                className="self-center px-3 py-1 text-[11px] rounded-md text-text-secondary hover:text-text-primary hover:bg-card-hover"
              >
                Show {Math.min(remaining, PAGE_SIZE)} more
              </button>
            )}
          </div>
        ) : (
          <div className="py-2.5 text-[11px] italic text-text-secondary opacity-60">
            No recent chats
          </div>
        )}
      </div>
    )
  }
)

HistoryConversation.displayName = 'HistoryConversation'