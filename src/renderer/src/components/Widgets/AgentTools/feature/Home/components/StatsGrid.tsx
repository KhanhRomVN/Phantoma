import { memo } from 'react'
import { MessageSquare, Zap, Brain, Layers } from 'lucide-react'
import { $ } from '@renderer/utils/color'
import { formatTokens } from '../utils/stats'

interface StatsGridProps {
  totalSessions: number
  totalMessages: number
  totalTokens: number
  favoriteModel: string
}

export const StatsGrid = memo<StatsGridProps>(
  ({ totalSessions, totalMessages, totalTokens, favoriteModel }) => {
    const cards = [
      {
        icon: <Layers size={14} />,
        iconBg: 'rgba(59, 130, 246, 0.12)',
        iconColor: 'rgb(59, 130, 246)',
        value: totalSessions.toLocaleString(),
        label: 'Sessions'
      },
      {
        icon: <MessageSquare size={14} />,
        iconBg: 'rgba(16, 185, 129, 0.12)',
        iconColor: 'rgb(16, 185, 129)',
        value: totalMessages.toLocaleString(),
        label: 'Messages'
      },
      {
        icon: <Zap size={14} />,
        iconBg: 'rgba(245, 158, 11, 0.12)',
        iconColor: 'rgb(245, 158, 11)',
        value: formatTokens(totalTokens),
        label: 'Total Tokens'
      },
      {
        icon: <Brain size={14} />,
        iconBg: 'rgba(139, 92, 246, 0.12)',
        iconColor: 'rgb(139, 92, 246)',
        value: favoriteModel,
        label: 'Favorite Model'
      }
    ]

    return (
      <div className="grid grid-cols-2 gap-2 w-full">
        {cards.map((card) => (
          <div
            key={card.label}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-card-background min-w-0"
          >
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: card.iconBg, color: card.iconColor }}
            >
              {card.icon}
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span
                title={card.value}
                className="text-sm font-bold leading-tight truncate"
                style={{ color: $('--text-primary') }}
              >
                {card.value}
              </span>
              <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wider leading-tight truncate">
                {card.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    )
  }
)

StatsGrid.displayName = 'StatsGrid'