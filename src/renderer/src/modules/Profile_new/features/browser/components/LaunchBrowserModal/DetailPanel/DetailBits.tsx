import { useState } from 'react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import type { Tone } from '../../../../../shared/types/ui.types';
import { TONE_CLASS } from '../../../../../shared/constants/tone.constants';
interface SegmentedOption<T extends string> {
  id: T;
  label: string;
}

export function DetailCard({
  title,
  icon: Icon,
  tone,
  aside,
  children,
}: {
  title: string;
  icon: LucideIcon;
  tone: Tone;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className='flex flex-col gap-1 rounded-xl bg-card-background p-3'>
      <header className='mb-1 flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2 text-[11px] font-semibold text-text-primary'>
          <span className={cn('flex h-5 w-5 items-center justify-center rounded-md', TONE_CLASS[tone].icon)}>
            <Icon className='h-3 w-3' />
          </span>
          {title}
        </div>
        {aside}
      </header>
      <div className='flex flex-col'>{children}</div>
    </section>
  );
}

export function KV({ label, value, mono, copy }: { label: string; value: string; mono?: boolean; copy?: boolean }) {
  const [copied, setCopied] = useState(false);
  const shown = value === '' ? '—' : value;

  const handleCopy = (): void => {
    if (!copy || value === '') return;
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1000);
    });
  };

  return (
    <div className='flex items-baseline justify-between gap-4 border-b border-border/40 py-1.5 last:border-b-0'>
      <span className='shrink-0 text-[10px] uppercase tracking-wide text-text-secondary'>{label}</span>
      <span
        title={value}
        onClick={handleCopy}
        className={cn(
          'min-w-0 break-all text-right text-[11px] text-text-primary',
          mono && 'font-mono',
          copy && value !== '' && 'cursor-pointer hover:text-primary',
        )}
      >
        {copied ? 'Copied' : shown}
      </span>
    </div>
  );
}

export function Metric({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone: Tone }) {
  return (
    <div className='flex min-w-0 flex-col gap-1 rounded-xl bg-card-background px-3 py-2.5'>
      <span className='flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-text-secondary'>
        <span className={cn('h-1.5 w-1.5 rounded-full', TONE_CLASS[tone].dot)} />
        {label}
      </span>
      <span className='flex items-baseline gap-1'>
        <span className='truncate text-base font-semibold tabular-nums text-text-primary'>{value}</span>
        {unit && <span className='text-[10px] text-text-secondary'>{unit}</span>}
      </span>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <div className='flex shrink-0 items-center gap-0.5 rounded-md bg-text-secondary/10 p-0.5'>
      {options.map((o) => (
        <button
          key={o.id}
          type='button'
          onClick={() => onChange(o.id)}
          className={cn(
            'rounded px-2 py-1 text-[11px] transition-colors',
            value === o.id ? 'bg-background text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}