import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { TONE_CLASS } from '../../../../../shared/constants/tone.constants';
import type { Tone } from '../../../../../shared/types/ui.types';
import { TOTP_PERIOD, useTotp } from '../../../../security';

export function Section({
  title,
  desc,
  icon: Icon,
  tone,
  children,
}: {
  title: string;
  desc: string;
  icon: LucideIcon;
  tone: Tone;
  children: ReactNode;
}) {
  return (
    <section className='flex flex-col gap-4 border-t border-border/50 py-5 first:border-t-0 first:pt-0'>
      <header className='flex items-center gap-3'>
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', TONE_CLASS[tone].icon)}>
          <Icon className='h-4 w-4' />
        </span>
        <div className='flex min-w-0 flex-col gap-1'>
          <span className='text-sm font-semibold leading-none text-text-primary'>{title}</span>
          <span className='text-[11px] leading-none text-text-secondary'>{desc}</span>
        </div>
      </header>
      {children}
    </section>
  );
}

export function TotpPreview({ secret }: { secret: string }) {
  const { code, remaining, invalid } = useTotp(secret);
  if (invalid || !code) return null;
  const low = remaining <= 5;
  const digits = code.padEnd(6, '-').split('');
  return (
    <div className='relative overflow-hidden rounded-lg bg-input-background'>
      <div
        className={cn(
          'pointer-events-none absolute -left-8 -top-10 h-28 w-28 rounded-full opacity-25 blur-2xl transition-colors duration-500',
          low ? 'bg-warn' : 'bg-primary',
        )}
      />
      <div className='relative flex items-center justify-between gap-3 px-3 py-3'>
        <span className='flex items-center gap-1'>
          {digits.map((ch, i) => (
            <span key={i} className='flex items-center gap-1'>
              {i === 3 && <span className='mx-1 h-0.5 w-2 rounded-full bg-text-secondary/30' />}
              <span
                className={cn(
                  'flex h-10 w-7 items-center justify-center rounded-md bg-gradient-to-b from-text-secondary/15 to-text-secondary/5 font-mono text-xl font-semibold tabular-nums transition-colors duration-500',
                  low ? 'text-warn' : 'text-text-primary',
                )}
              >
                {ch}
              </span>
            </span>
          ))}
        </span>
        <div className='flex shrink-0 flex-col items-end leading-none'>
          <span className={cn('text-xl font-semibold tabular-nums', low ? 'text-warn' : 'text-text-primary')}>
            {remaining}
            <span className='ml-0.5 text-[10px] font-normal text-text-secondary'>s</span>
          </span>
          <span className='mt-1 text-[10px] uppercase tracking-wider text-text-secondary'>live preview</span>
        </div>
      </div>
      <div className='relative h-[3px] w-full bg-text-secondary/10'>
        <div
          style={{ width: `${(remaining / TOTP_PERIOD) * 100}%` }}
          className={cn('h-full rounded-r-full transition-all duration-1000 ease-linear', low ? 'bg-warn' : 'bg-primary')}
        />
      </div>
    </div>
  );
}
