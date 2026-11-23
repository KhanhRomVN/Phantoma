import { type MouseEvent } from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@renderer/utils/cn';

export function Checkbox({
  state,
  onClick,
}: {
  state: 'all' | 'some' | 'none';
  onClick: (e: MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === 'some' ? 'mixed' : state === 'all'}
      onClick={onClick}
      className={cn(
        'grid h-4 w-4 shrink-0 cursor-pointer place-items-center rounded-[4px] border outline-none transition-all duration-100 active:scale-90',
        state === 'none'
          ? 'border-text-secondary/40 bg-transparent hover:border-primary'
          : 'border-primary bg-primary text-white',
      )}
    >
      {state === 'all' && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
      {state === 'some' && <Minus className="h-2.5 w-2.5" strokeWidth={3} />}
    </button>
  );
}

export function Counts({ added, deleted }: { added: number; deleted: number }) {
  if (!added && !deleted) return null;
  return (
    <span className="flex shrink-0 items-center gap-1.5 font-mono text-[12px]">
      {added > 0 && <span className="text-success">+{added}</span>}
      {deleted > 0 && <span className="text-error">-{deleted}</span>}
    </span>
  );
}
