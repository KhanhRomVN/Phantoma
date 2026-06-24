import React from 'react';
import { cn } from '../../../../shared/lib/utils';

// CircleStop icon (filled circle only) - used for stop buttons
export const CircleStopIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    className={className}
  >
    <circle cx="12" cy="12" r="10" fill="currentColor" />
  </svg>
);

// CirclePlay icon (filled circle with play triangle)
export const CirclePlayIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    className={className}
  >
    <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2" />
    <polygon points="10,8 16,12 10,16" fill="currentColor" />
  </svg>
);

// Status dot indicators
export const StatusDot: React.FC<{
  status: 'success' | 'warning' | 'error' | 'info' | 'none';
  className?: string;
}> = ({ status, className }) => {
  const colors = {
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    error: 'bg-red-400',
    info: 'bg-blue-400',
    none: 'bg-text-secondary/30',
  };

  return <span className={cn('w-2 h-2 rounded-full shrink-0', colors[status], className)} />;
};

// Loading dots (animated)
export const LoadingDots: React.FC<{ className?: string }> = ({ className }) => (
  <span className={cn('inline-flex gap-1', className)}>
    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
  </span>
);

// Resize handle icon
export const ResizeHandleIcon: React.FC<{
  className?: string;
  direction?: 'horizontal' | 'vertical';
}> = ({ className, direction = 'horizontal' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    className={className}
    style={{ transform: direction === 'vertical' ? 'rotate(90deg)' : undefined }}
  >
    <circle cx="4" cy="4" r="1.5" fill="currentColor" opacity="0.4" />
    <circle cx="8" cy="4" r="1.5" fill="currentColor" opacity="0.4" />
    <circle cx="12" cy="4" r="1.5" fill="currentColor" opacity="0.4" />
    <circle cx="4" cy="8" r="1.5" fill="currentColor" opacity="0.4" />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" opacity="0.4" />
    <circle cx="12" cy="8" r="1.5" fill="currentColor" opacity="0.4" />
    <circle cx="4" cy="12" r="1.5" fill="currentColor" opacity="0.4" />
    <circle cx="8" cy="12" r="1.5" fill="currentColor" opacity="0.4" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" opacity="0.4" />
  </svg>
);

// File icon placeholder (used when favicon fails to load)
export const FilePlaceholderIcon: React.FC<{ className?: string; label?: string }> = ({
  className,
  label,
}) => (
  <div
    className={cn(
      'flex items-center justify-center w-full h-full bg-muted/30 rounded text-text-secondary font-bold text-xs',
      className,
    )}
  >
    {label?.slice(0, 2).toUpperCase() || '?'}
  </div>
);

// Collapse/Expand icon
export const ExpandIcon: React.FC<{ className?: string; expanded?: boolean }> = ({
  className,
  expanded,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    className={cn('transition-transform', expanded && 'rotate-180', className)}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="4,6 8,10 12,6" />
  </svg>
);

export default {
  CircleStopIcon,
  CirclePlayIcon,
  StatusDot,
  LoadingDots,
  ResizeHandleIcon,
  FilePlaceholderIcon,
  ExpandIcon,
};
