import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import type { Tone } from '../../../../types/ui.types';
import { TONE_CLASS } from '../../../../constants/tone';

export function Switch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type='button'
      role='switch'
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-[18px] w-8 shrink-0 rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        checked ? 'bg-primary' : 'bg-text-secondary/25',
      )}
    >
      <span
        className={cn(
          'absolute top-[2px] h-3.5 w-3.5 rounded-[4px] bg-white shadow transition-all',
          checked ? 'left-[16px]' : 'left-[2px]',
        )}
      />
    </button>
  );
}

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={cn('shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium', TONE_CLASS[tone].pill)}>{children}</span>
  );
}

export function Block({
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
    <section className='flex flex-col gap-3 rounded-xl bg-card-background p-4'>
      <header className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2 text-xs font-semibold text-text-primary'>
          <span className={cn('flex h-6 w-6 items-center justify-center rounded-md', TONE_CLASS[tone].icon)}>
            <Icon className='h-3.5 w-3.5' />
          </span>
          {title}
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function Stat({ icon: Icon, label, value, mono }: { icon: LucideIcon; label: string; value: string; mono?: boolean }) {
  return (
    <div className='flex min-w-0 flex-col gap-1 rounded-lg bg-background/60 px-3 py-2'>
      <span className='flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-text-secondary'>
        <Icon className='h-3 w-3' />
        {label}
      </span>
      <span className={cn('truncate text-xs text-text-primary', mono && 'font-mono')} title={value}>
        {value}
      </span>
    </div>
  );
}