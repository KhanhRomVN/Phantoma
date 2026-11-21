import { useState } from 'react';
import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { TONE_CLASS } from '../../../constants/proxy';
import type { Tone } from '../../../types';

interface SectionProps {
  title: string;
  icon?: LucideIcon;
  tone?: Tone;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Section({ title, icon: Icon, tone = 'muted', action, className, children }: SectionProps) {
  return (
    <section className={cn('rounded-md bg-card-background', className)}>
      <header className='flex items-center justify-between px-3.5 py-2.5'>
        <div className='flex items-center gap-2 text-xs font-semibold text-text-primary'>
          {Icon && (
            <span className={cn('flex h-6 w-6 items-center justify-center rounded-md', TONE_CLASS[tone].icon)}>
              <Icon className='h-3.5 w-3.5' />
            </span>
          )}
          {title}
        </div>
        {action}
      </header>
      <div className='px-3.5 pb-3.5'>{children}</div>
    </section>
  );
}

export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='flex min-h-[30px] items-center justify-between gap-3 border-b border-border/40 py-1 text-xs last:border-b-0'>
      <span className='shrink-0 text-text-secondary'>{label}</span>
      <div className='min-w-0 truncate text-right text-text-primary'>{children}</div>
    </div>
  );
}

export function Empty({ text, icon: Icon }: { text: string; icon?: LucideIcon }) {
  return (
    <div className='flex flex-col items-center gap-2 py-6 text-center text-xs text-text-secondary'>
      {Icon && (
        <span className='flex h-9 w-9 items-center justify-center rounded-lg bg-text-secondary/10'>
          <Icon className='h-4 w-4' />
        </span>
      )}
      {text}
    </div>
  );
}

export function CopyText({ value, display, mono = true }: { value: string; display?: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = (): void => {
    void navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      })
      .catch(() => undefined);
  };
  return (
    <button
      type='button'
      onClick={copy}
      title='Click to copy'
      className={cn('inline-flex max-w-full items-center gap-1.5 truncate transition-colors hover:text-primary', mono && 'font-mono')}
    >
      <span className='truncate'>{copied ? 'Copied' : (display ?? value)}</span>
      {copied && <Check className='h-3 w-3 shrink-0 text-success' />}
    </button>
  );
}

interface StatCardProps {
  label: string;
  icon: LucideIcon;
  tone?: Tone;
  value: ReactNode;
  hint?: ReactNode;
  progress?: number;
}

export function StatCard({ label, icon: Icon, tone = 'muted', value, hint, progress }: StatCardProps) {
  const t = TONE_CLASS[tone];
  return (
    <div className='relative flex flex-col gap-1.5 overflow-hidden rounded-md bg-card-background p-3'>
      <div className='flex items-center justify-between'>
        <span className='text-[11px] text-text-secondary'>{label}</span>
        <span className={cn('flex h-5 w-5 items-center justify-center rounded-md', t.icon)}>
          <Icon className='h-3 w-3' />
        </span>
      </div>
      <div className={cn('text-lg font-semibold leading-6 tabular-nums', tone === 'muted' ? 'text-text-primary' : t.text)}>{value}</div>
      {progress !== undefined && (
        <div className='h-1 w-full overflow-hidden rounded-full bg-text-secondary/15'>
          <div className={cn('h-full rounded-full', t.bar)} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </div>
      )}
      {hint && <div className='truncate text-[11px] text-text-secondary'>{hint}</div>}
    </div>
  );
}