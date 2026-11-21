import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Check, RotateCcw, Search, SearchX, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import type { Tone } from '../types';
import { TONE_CLASS } from '../constants/tone';
import type { FilterTag } from '../types';

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}

export function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  return (
    <div className='flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-background px-3 transition-colors'>
      <Search className='h-3.5 w-3.5 shrink-0 text-text-secondary' />
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className='h-9 min-w-0 flex-1 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-secondary/60'
      />
      {value && (
        <button
          type='button'
          onClick={() => onChange('')}
          className='flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-text-secondary/10 hover:text-text-primary'
        >
          <X className='h-3 w-3' />
        </button>
      )}
    </div>
  );
}

export function Chip({ active, onClick, children, disabled }: { active: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type='button'
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-6 items-center gap-1 rounded-md px-2 text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        active ? 'bg-primary/10 text-primary' : 'bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15 hover:text-text-primary',
      )}
    >
      {active && <Check className='h-3 w-3' />}
      {children}
    </button>
  );
}

export function Tag({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={cn('inline-flex h-4 shrink-0 items-center rounded-md px-1.5 text-[10px] font-medium', TONE_CLASS[tone].pill)}>{children}</span>
  );
}

export function FilterButton({ open, count, onClick }: { open: boolean; count: number; onClick: () => void }) {
  return (
    <button
      type='button'
      onClick={onClick}
      title='Filters'
      className={cn(
        'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
        open || count > 0
          ? 'bg-primary/10 text-primary'
          : 'bg-background text-text-secondary hover:bg-text-secondary/10 hover:text-text-primary',
      )}
    >
      <SlidersHorizontal className='h-3.5 w-3.5' />
      {count > 0 && (
        <span className='absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] tabular-nums text-white'>
          {count}
        </span>
      )}
    </button>
  );
}

export function FilterSection({
  icon: Icon,
  label,
  hint,
  className,
  children,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      <div className='flex items-center justify-between gap-2'>
        <span className='flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary'>
          <span className='flex h-4 w-4 items-center justify-center rounded-md bg-text-secondary/10'>
            <Icon className='h-2.5 w-2.5' />
          </span>
          {label}
        </span>
        {hint && <span className='text-[10px] tabular-nums text-text-secondary/70'>{hint}</span>}
      </div>
      <div className='flex flex-wrap gap-1.5'>{children}</div>
    </div>
  );
}

export function FilterPanel({ count, tags, onReset, children }: { count: number; tags: FilterTag[]; onReset: () => void; children: ReactNode }) {
  return (
    <div className='flex flex-col gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] p-3'>
      <div className='grid grid-cols-2 gap-x-5 gap-y-3.5'>{children}</div>
      <div className='flex items-center justify-between gap-3 border-t border-dashed border-border pt-2.5'>
        <div className='flex min-w-0 flex-1 flex-wrap items-center gap-1.5'>
          {tags.length === 0 ? (
            <span className='text-[11px] text-text-secondary'>No filters applied</span>
          ) : (
            tags.map((t) => (
              <button
                key={t.id}
                type='button'
                onClick={t.onRemove}
                className='flex h-6 items-center gap-1 rounded-md bg-primary/10 pl-2 pr-1 text-[11px] text-primary transition-colors hover:bg-primary/20'
              >
                {t.label}
                <X className='h-3 w-3' />
              </button>
            ))
          )}
        </div>
        <button
          type='button'
          disabled={count === 0}
          onClick={onReset}
          className='flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-[11px] text-text-secondary transition-colors hover:bg-text-secondary/10 hover:text-text-primary disabled:opacity-40 disabled:hover:bg-transparent'
        >
          <RotateCcw className='h-3 w-3' />
          Reset
        </button>
      </div>
    </div>
  );
}

export function EmptyResult({ text, onReset }: { text: string; onReset: () => void }) {
  return (
    <div className='flex flex-col items-center gap-2 rounded-lg bg-background/60 px-3 py-8 text-center'>
      <SearchX className='h-5 w-5 text-text-secondary' />
      <span className='text-xs text-text-secondary'>{text}</span>
      <button type='button' onClick={onReset} className='text-[11px] text-primary hover:underline'>
        Clear search and filters
      </button>
    </div>
  );
}