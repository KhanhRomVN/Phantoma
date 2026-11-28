/**
 * ------------------------------------------------------------------
 * StatsGrid
 * ------------------------------------------------------------------
 * Grid hiển thị 4 thống kê chính trong Home panel:
 * tổng tokens, API requests, favorite model, và tổng tài khoản.
 *
 * Main features:
 * - 2x2 grid fixed layout
 * - Compact horizontal card: badge icon → 2 dòng (value, label)
 * - Percent change badge (green/red)
 * - Giá trị động từ props
 * ------------------------------------------------------------------
 */

import React from 'react';
import { MessageSquare, Zap, Brain, Users } from 'lucide-react';
import { $ } from '@renderer/utils/color';

interface StatsGridProps {
  periodTokens: number;
  periodRequests: number;
  favoriteModel: string;
  totalAccounts: number;
  percentChanges: { tokens: number | null; requests: number | null };
}

const StatsGrid: React.FC<StatsGridProps> = ({
  periodTokens,
  periodRequests,
  favoriteModel,
  totalAccounts,
  percentChanges,
}) => {
  const cards = [
    {
      icon: <MessageSquare size={14} />,
      iconBg: 'rgba(59, 130, 246, 0.12)',
      iconColor: 'rgb(59, 130, 246)',
      value: periodTokens.toLocaleString(),
      label: 'Total Tokens',
      percent: percentChanges.tokens,
    },
    {
      icon: <Zap size={14} />,
      iconBg: 'rgba(16, 185, 129, 0.12)',
      iconColor: 'rgb(16, 185, 129)',
      value: String(periodRequests),
      label: 'API Requests',
      percent: percentChanges.requests,
    },
    {
      icon: <Brain size={14} />,
      iconBg: 'rgba(245, 158, 11, 0.12)',
      iconColor: 'rgb(245, 158, 11)',
      value: favoriteModel,
      label: 'Favorite Model',
    },
    {
      icon: <Users size={14} />,
      iconBg: 'rgba(139, 92, 246, 0.12)',
      iconColor: 'rgb(139, 92, 246)',
      value: String(totalAccounts),
      label: 'Total Accounts',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 w-full">
      {cards.map((card, i) => (
        <div
          key={i}
          className="dashboard-card flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-card-background min-w-0 transition-transform duration-200"
        >
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
            style={{
              backgroundColor: card.iconBg,
              color: card.iconColor,
            }}
          >
            {card.icon}
          </div>

          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
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

          {card.percent !== null && card.percent !== undefined && (
            <span
              className="self-start shrink-0 text-[10px] font-semibold"
              style={{
                color: card.percent >= 0 ? 'rgb(16, 185, 129)' : 'rgb(244, 63, 94)',
              }}
            >
              {card.percent > 0 ? '+' : ''}
              {card.percent.toFixed(1)}%
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

export default React.memo(StatsGrid);