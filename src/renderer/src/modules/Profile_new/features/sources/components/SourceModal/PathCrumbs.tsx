import { ChevronRight } from 'lucide-react';
import { cn } from '@renderer/utils/cn';

export function PathCrumbs({ path, tail }: { path: string; tail?: string }) {
  const parts = path.split(/[\\/]/).filter(Boolean);
  const shown = parts.length > 3 ? parts.slice(-3) : parts;
  if (shown.length === 0 && !tail) {
    return <span className="text-[11px] italic text-text-secondary">No folder selected</span>;
  }
  const chip = 'max-w-full truncate rounded-md px-1.5 py-0.5 font-mono text-[10px]';
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="font-mono text-[10px] text-text-secondary">{parts.length > 3 ? '…' : '/'}</span>
      {shown.map((part, i) => (
        <span key={`${part}-${i}`} className="flex min-w-0 items-center gap-1">
          {i > 0 && <ChevronRight className="h-2.5 w-2.5 shrink-0 text-text-secondary" />}
          <span
            className={cn(
              chip,
              i === shown.length - 1 && !tail
                ? 'bg-text-secondary/20 text-text-primary'
                : 'bg-text-secondary/10 text-text-secondary',
            )}
          >
            {part}
          </span>
        </span>
      ))}
      {tail !== undefined && (
        <span className="flex min-w-0 items-center gap-1">
          {shown.length > 0 && <ChevronRight className="h-2.5 w-2.5 shrink-0 text-text-secondary" />}
          <span className={cn(chip, 'border border-dashed border-text-secondary/40 text-text-primary')}>{tail}</span>
        </span>
      )}
    </div>
  );
}
