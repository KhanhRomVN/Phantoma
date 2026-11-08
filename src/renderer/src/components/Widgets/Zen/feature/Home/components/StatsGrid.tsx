/**
 * ------------------------------------------------------------------
 * StatsGrid
 * ------------------------------------------------------------------
 * Grid hiển thị 4 thống kê chính trong Home panel:
 * tổng tokens, API requests, favorite model, và tổng tài khoản.
 *
 * Main features:
 * - 2x2 grid fixed layout
 * - Icon → value → label vertical layout
 * - Percent change badge (green/red)
 * - Giá trị động từ props
 * ------------------------------------------------------------------
 */

import React from 'react';
import { MessageSquare, Zap, Brain, Users } from 'lucide-react';
import { $ } from '@renderer/utils/color';

interface StatsGridProps {
  todayTokens: number;
  todayRequests: number;
  favoriteModel: string;
  totalAccounts: number;
  percentChanges: (number | null)[];
}

const StatsGrid: React.FC<StatsGridProps> = ({
  todayTokens,
  todayRequests,
  favoriteModel,
  totalAccounts,
  percentChanges,
}) => {
  const cards = [
    {
      icon: <MessageSquare size={16} />,
      iconBg: 'rgba(59, 130, 246, 0.12)',
      iconColor: 'rgb(59, 130, 246)',
      value: todayTokens.toLocaleString(),
      label: 'Total Tokens',
      percent: percentChanges[0],
      isModel: false,
    },
    {
      icon: <Zap size={16} />,
      iconBg: 'rgba(16, 185, 129, 0.12)',
      iconColor: 'rgb(16, 185, 129)',
      value: String(todayRequests),
      label: 'API Requests',
      percent: percentChanges[1],
      isModel: false,
    },
    {
      icon: <Brain size={16} />,
      iconBg: 'rgba(245, 158, 11, 0.12)',
      iconColor: 'rgb(245, 158, 11)',
      value: favoriteModel,
      label: 'Favorite Model',
      percent: percentChanges[2],
      isModel: true,
    },
    {
      icon: <Users size={16} />,
      iconBg: 'rgba(139, 92, 246, 0.12)',
      iconColor: 'rgb(139, 92, 246)',
      value: String(totalAccounts),
      label: 'Total Accounts',
      percent: percentChanges[3],
      isModel: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 w-full">
      {cards.map((card, i) => (
        <div
          key={i}
          className="dashboard-card relative flex flex-col gap-1.5 p-3.5 rounded-lg bg-card-background transition-transform duration-200"
        >
          {card.percent !== null && card.percent !== undefined && (
            <span
              className="absolute top-3 right-3 text-[10px] font-semibold"
              style={{
                color: card.percent >= 0 ? 'rgb(16, 185, 129)' : 'rgb(244, 63, 94)',
              }}
            >
              {card.percent > 0 ? '+' : ''}
              {card.percent.toFixed(1)}%
            </span>
          )}

          <div
            className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
            style={{
              backgroundColor: card.iconBg,
              color: card.iconColor,
            }}
          >
            {card.icon}
          </div>

          <div className="flex flex-col gap-1.5">
            <span
              style={{
                fontSize: card.isModel ? '13px' : '16px',
                fontWeight: 700,
                lineHeight: card.isModel ? 1.2 : undefined,
                wordBreak: card.isModel ? 'break-all' : undefined,
                color: $('--text-primary'),
              }}
            >
              {card.value}
            </span>
            <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wider">
              {card.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default React.memo(StatsGrid);