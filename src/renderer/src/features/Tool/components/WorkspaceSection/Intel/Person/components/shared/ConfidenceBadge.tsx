import React from 'react';

interface ConfidenceBadgeProps {
  value: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function ConfidenceBadge({ value, showLabel = false, size = 'sm' }: ConfidenceBadgeProps) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? '#30d158' : pct >= 55 ? '#f5a623' : '#ff2d55';

  if (size === 'md') {
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1.5 bg-[#111827] rounded-full overflow-hidden min-w-[60px]">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
        {showLabel && (
          <span className="text-[10px] font-mono shrink-0" style={{ color }}>
            {pct}% conf
          </span>
        )}
      </div>
    );
  }

  return (
    <span
      className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0"
      style={{
        color,
        backgroundColor: `${color}15`,
        border: `1px solid ${color}30`,
      }}
    >
      {showLabel ? `${pct}% conf` : `${pct}%`}
    </span>
  );
}