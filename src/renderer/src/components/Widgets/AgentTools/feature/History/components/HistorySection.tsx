import { memo, useMemo, useState } from 'react'
import { ChevronRight, Search } from 'lucide-react'
import { getFaviconUrl } from '@renderer/utils/favicon'
import type { AgentSessionItem } from '../../../services/agentApi'
import { groupSessions, formatSessionTime } from '../utils/groupSessions'

const PAGE_SIZE = 12

interface HistorySectionProps {
  sessions: AgentSessionItem[]
  isLoading: boolean
  onSelect?: (item: AgentSessionItem) => void
}

const SessionCard = memo<{ item: AgentSessionItem; onSelect?: (item: AgentSessionItem) => void }>(
  ({ item, onSelect }) => (
    <button
      type="button"
      onClick={() => onSelect?.(item)}
      className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/60 bg-card-background text-left transition-colors hover:bg-button-soft-background/60 hover:border-border"
    >
      <div className="flex-none w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center">
        <img
          src={getFaviconUrl(item.url, 32)}
          alt=""
          className="w-4 h-4 rounded-sm object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="truncate text-[13px] text-text-primary">{item.title}</span>
        <span className="truncate text-[11px] text-text-secondary opacity-70">
          {item.agentName}
          {item.updatedAt ? ` · ${formatSessionTime(item.updatedAt)}` : ''}
        </span>
      </div>
      <ChevronRight
        size={14}
        className="flex-none text-text-secondary opacity-0 transition-opacity group-hover:opacity-60"
      />
    </button>
  )
)

SessionCard.displayName = 'SessionCard'

const SkeletonList = memo(() => (
  <div className="flex flex-col gap-2">
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className="h-[52px] rounded-lg bg-card-background animate-pulse" />
    ))}
  </div>
))

SkeletonList.displayName = 'SkeletonList'

export const HistorySection = memo<HistorySectionProps>(({ sessions, isLoading, onSelect }) => {
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return sessions
    return sessions.filter(
      (s) => s.title.toLowerCase().includes(needle) || s.agentName.toLowerCase().includes(needle)
    )
  }, [sessions, query])

  const groups = useMemo(() => groupSessions(filtered.slice(0, visible)), [filtered, visible])
  const remaining = filtered.length - visible

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-primary opacity-80">
          Recent conversations
        </span>
        {sessions.length > 0 && (
          <span className="text-[10px] text-text-secondary opacity-70">{filtered.length}</span>
        )}
      </div>

      {sessions.length > 0 && (
        <div className="flex items-center gap-2 px-3 h-8 rounded-lg border border-border/60 bg-card-background">
          <Search size={13} className="flex-none text-text-secondary opacity-70" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setVisible(PAGE_SIZE)
            }}
            placeholder="Search conversations..."
            className="flex-1 min-w-0 bg-transparent outline-none border-none text-xs text-text-primary placeholder:text-text-secondary"
          />
        </div>
      )}

      {isLoading && sessions.length === 0 ? (
        <SkeletonList />
      ) : groups.length > 0 ? (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.label} className="flex flex-col gap-2">
              <span className="px-1 text-[10px] font-medium uppercase tracking-[0.06em] text-text-secondary opacity-60">
                {group.label}
              </span>
              {group.items.map((item) => (
                <SessionCard key={`${item.agentId}:${item.id}`} item={item} onSelect={onSelect} />
              ))}
            </div>
          ))}
          {remaining > 0 && (
            <button
              type="button"
              onClick={() => setVisible((n) => n + PAGE_SIZE)}
              className="self-center px-3 py-1 text-[11px] rounded-md text-text-secondary hover:text-text-primary hover:bg-button-soft-background/60"
            >
              Show {Math.min(remaining, PAGE_SIZE)} more
            </button>
          )}
        </div>
      ) : (
        <div className="py-6 text-center text-[11px] italic text-text-secondary opacity-60">
          {query ? 'No matching conversations' : 'No conversations yet'}
        </div>
      )}
    </section>
  )
})

HistorySection.displayName = 'HistorySection'