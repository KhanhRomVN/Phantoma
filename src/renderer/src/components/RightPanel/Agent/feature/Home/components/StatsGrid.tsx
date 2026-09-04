/**
 * ------------------------------------------------------------------
 * StatsGrid
 * ------------------------------------------------------------------
 * Grid hiển thị 4 thống kê chính trong Home panel:
 * tổng tokens, API requests, favorite model, và tổng tài khoản.
 *
 * Main features:
 * - Hiển thị dạng 2x2 grid, mỗi box layout dọc: icon → value → name
 * - Text % thay đổi ở góc phải (green/red theo dương/âm)
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
      iconBg: $('--primary', 0.12),
      iconColor: $('--primary'),
      value: todayTokens.toLocaleString(),
      label: 'Total Tokens',
      percent: percentChanges[0],
      valueStyle: { fontSize: '16px', fontWeight: 700 } as React.CSSProperties,
    },
    {
      icon: <Zap size={16} />,
      iconBg: $('--success', 0.12),
      iconColor: $('--success'),
      value: String(todayRequests),
      label: 'API Requests',
      percent: percentChanges[1],
      valueStyle: { fontSize: '16px', fontWeight: 700 } as React.CSSProperties,
    },
    {
      icon: <Brain size={16} />,
      iconBg: $('--warn', 0.12),
      iconColor: $('--warn'),
      value: favoriteModel,
      label: 'Favorite Model',
      percent: percentChanges[2],
      valueStyle: {
        fontSize: '13px',
        fontWeight: 700,
        lineHeight: 1.2,
        wordBreak: 'break-all',
      } as React.CSSProperties,
    },
    {
      icon: <Users size={16} />,
      iconBg: $('--purple', 0.12),
      iconColor: $('--purple'),
      value: String(totalAccounts),
      label: 'Total Accounts',
      percent: percentChanges[3],
      valueStyle: { fontSize: '16px', fontWeight: 700 } as React.CSSProperties,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 w-full">
      {cards.map((card, i) => (
        <div
          key={i}
          className="dashboard-card relative flex flex-col gap-1.5 p-3 rounded-lg border border-border hover:border-primary transition-transform duration-200 ease-in-out"
        >
          {card.percent !== null && card.percent !== undefined && (
            <span
              className="absolute top-3 right-3 text-[10px] font-semibold"
              style={{
                color:
                  card.percent >= 0
                    ? 'rgb(var(--success))'
                    : 'rgb(var(--error))',
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

          <span style={card.valueStyle} className="text-text-primary">
            {card.value}
          </span>

          <span className="text-[10px] font-medium text-text-secondary">
            {card.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default React.memo(StatsGrid);