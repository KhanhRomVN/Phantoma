import React from 'react';
import { cn } from '../../../../shared/lib/utils';

interface MethodBadgeProps {
  method: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const MethodBadge: React.FC<MethodBadgeProps> = ({ method, className, size = 'md' }) => {
  const getColor = () => {
    const m = method.toUpperCase();
    if (m === 'GET') return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/20';
    if (m === 'POST') return 'text-blue-400 bg-blue-500/15 border-blue-500/20';
    if (m === 'PUT') return 'text-amber-400 bg-amber-500/15 border-amber-500/20';
    if (m === 'DELETE') return 'text-red-400 bg-red-500/15 border-red-500/20';
    if (m === 'PATCH') return 'text-purple-400 bg-purple-500/15 border-purple-500/20';
    if (m === 'OPTIONS') return 'text-gray-400 bg-gray-500/15 border-gray-500/20';
    if (m === 'HEAD') return 'text-indigo-400 bg-indigo-500/15 border-indigo-500/20';
    return 'text-text-secondary bg-muted/30 border-divider';
  };

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[9px]',
    md: 'px-2 py-0.5 text-[10px]',
    lg: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={cn(
        'rounded font-mono font-bold border',
        getColor(),
        sizeClasses[size],
        className,
      )}
    >
      {method.toUpperCase()}
    </span>
  );
};

export default MethodBadge;