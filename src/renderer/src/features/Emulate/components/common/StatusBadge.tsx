import React from 'react';
import { cn } from '../../../../shared/lib/utils';

interface StatusBadgeProps {
  status: number;
  className?: string;
  showText?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className, showText = true }) => {
  const getColor = () => {
    if (!status || status === 0) {
      return 'text-red-400 bg-red-500/10';
    }
    if (status < 300) {
      return 'text-emerald-400 bg-emerald-500/10';
    }
    if (status < 400) {
      return 'text-blue-400 bg-blue-500/10';
    }
    if (status < 500) {
      return 'text-amber-400 bg-amber-500/10';
    }
    return 'text-red-400 bg-red-500/10';
  };

  const displayText = !status || status === 0 ? 'ERR' : String(status);

  if (!showText) {
    return (
      <div
        className={cn(
          'w-2 h-2 rounded-full',
          !status || status === 0
            ? 'bg-red-400'
            : status < 300
              ? 'bg-emerald-400'
              : status < 400
                ? 'bg-blue-400'
                : status < 500
                  ? 'bg-amber-400'
                  : 'bg-red-400',
        )}
        title={displayText}
      />
    );
  }

  return (
    <span
      className={cn(
        'px-1.5 py-0.5 rounded text-[10px] font-bold font-mono',
        getColor(),
        className,
      )}
    >
      {displayText}
    </span>
  );
};

export default StatusBadge;