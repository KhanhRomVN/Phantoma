import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import type { SaveStatus } from '../hooks/useSaveState';

interface SaveIndicatorProps {
  status: SaveStatus;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

export function SaveIndicator({ status, error, onRetry, className }: SaveIndicatorProps) {
  if (status === 'idle') return null;
  if (status === 'saving') {
    return (
      <span className={cn('flex items-center gap-1.5 text-[11px] text-text-secondary', className)}>
        <Loader2 className="h-3 w-3 animate-spin" />
        Saving...
      </span>
    );
  }
  if (status === 'success') {
    return (
      <span className={cn('flex items-center gap-1.5 text-[11px] text-success', className)}>
        <Check className="h-3 w-3" />
        Saved
      </span>
    );
  }
  return (
    <span
      title={error ?? undefined}
      className={cn('flex min-w-0 items-center gap-1.5 text-[11px] text-error', className)}
    >
      <AlertCircle className="h-3 w-3 shrink-0" />
      <span className="truncate">{error || 'Save failed'}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="shrink-0 font-medium underline hover:opacity-80">
          Retry
        </button>
      )}
    </span>
  );
}

export default SaveIndicator;