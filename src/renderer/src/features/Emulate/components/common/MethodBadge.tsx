import React from 'react';
import { cn } from '../../../../shared/lib/utils';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'TRACE' | 'CONNECT';

interface MethodBadgeProps {
  method: HttpMethod | string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

// Use CSS variables for method colors to follow theme
const methodColors: Record<string, { color: string; bgColor: string }> = {
  GET: { color: 'var(--accent-blue)', bgColor: 'var(--accent-blue)' },
  POST: { color: 'var(--accent-green)', bgColor: 'var(--accent-green)' },
  PUT: { color: 'var(--accent-orange)', bgColor: 'var(--accent-orange)' },
  DELETE: { color: 'var(--error)', bgColor: 'var(--error)' },
  PATCH: { color: 'var(--accent-purple)', bgColor: 'var(--accent-purple)' },
  HEAD: { color: 'var(--text-secondary)', bgColor: 'var(--text-secondary)' },
  OPTIONS: { color: 'var(--accent-cyan)', bgColor: 'var(--accent-cyan)' },
  TRACE: { color: 'var(--accent-indigo)', bgColor: 'var(--accent-indigo)' },
  CONNECT: { color: 'var(--accent-rose)', bgColor: 'var(--accent-rose)' },
};

const sizeClasses = {
  sm: 'text-[9px] px-1 py-0.5',
  md: 'text-[10px] px-1.5 py-0.5',
  lg: 'text-xs px-2 py-1',
};

export const MethodBadge: React.FC<MethodBadgeProps> = ({
  method,
  size = 'md',
  showLabel = true,
  className,
}) => {
  const upperMethod = method.toUpperCase();
  const colorClass = methodColors[upperMethod] || methodColors.GET;

  if (!showLabel) {
    return (
      <div
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          upperMethod === 'GET' && 'bg-blue-400',
          upperMethod === 'POST' && 'bg-green-400',
          upperMethod === 'PUT' && 'bg-orange-400',
          upperMethod === 'DELETE' && 'bg-red-400',
          upperMethod === 'PATCH' && 'bg-purple-400',
        )}
        title={upperMethod}
      />
    );
  }

  const colors = methodColors[upperMethod] || methodColors.GET;
  return (
    <span
      className={cn(
        'font-bold rounded border',
        sizeClasses[size],
        className,
      )}
      style={{
        color: colors.color,
        backgroundColor: `${colors.bgColor}10`,
        borderColor: `${colors.bgColor}30`,
      }}
    >
      {upperMethod}
    </span>
  );
};

export default MethodBadge;