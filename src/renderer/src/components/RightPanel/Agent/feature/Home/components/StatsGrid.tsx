import React from 'react';
import { MessageSquare, Zap, Brain, Users } from 'lucide-react';

interface StatsGridProps {
  todayTokens: number;
  todayRequests: number;
  favoriteModel: string;
  totalAccounts: number;
}

const StatsGrid: React.FC<StatsGridProps> = ({
  todayTokens,
  todayRequests,
  favoriteModel,
  totalAccounts,
}) => {
  const cards = [
    {
      icon: <MessageSquare size={16} />,
      iconBg: 'rgba(59, 130, 246, 0.12)',
      iconColor: 'var(--vscode-textLink-foreground, #3b82f6)',
      value: todayTokens.toLocaleString(),
      label: 'Total Chats',
      valueStyle: { fontSize: '16px', fontWeight: 700 } as React.CSSProperties,
    },
    {
      icon: <Zap size={16} />,
      iconBg: 'rgba(16, 185, 129, 0.12)',
      iconColor: 'var(--vscode-gitDecoration-addedResourceForeground, #10b981)',
      value: String(todayRequests),
      label: 'Tools Executed',
      valueStyle: { fontSize: '16px', fontWeight: 700 } as React.CSSProperties,
    },
    {
      icon: <Brain size={16} />,
      iconBg: 'rgba(245, 158, 11, 0.12)',
      iconColor: 'var(--vscode-editorWarning-foreground, #f59e0b)',
      value: favoriteModel,
      label: 'Estimated Savings',
      valueStyle: {
        fontSize: '13px',
        fontWeight: 700,
        lineHeight: 1.2,
        wordBreak: 'break-all',
      } as React.CSSProperties,
    },
    {
      icon: <Users size={16} />,
      iconBg: 'rgba(139, 92, 246, 0.12)',
      iconColor: 'var(--vscode-symbolIcon-namespaceForeground, #8b5cf6)',
      value: String(totalAccounts),
      label: 'Success Rate',
      valueStyle: { fontSize: '16px', fontWeight: 700 } as React.CSSProperties,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 w-full">
      {cards.map((card, i) => (
        <div
          key={i}
          className="dashboard-card flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ease-in-out border border-border hover:border-primary"
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
          <div className="flex flex-col gap-0.5">
            <span style={card.valueStyle}>{card.value}</span>
            <span
              className="text-[10px] font-medium"
              style={{ color: 'var(--vscode-descriptionForeground)' }}
            >
              {card.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsGrid;