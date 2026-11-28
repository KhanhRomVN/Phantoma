import { useId, type ReactNode } from 'react';
import { Check, Clock, GitMerge, Loader2, Minus, XCircle } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { TONE_CLASS } from '../../../../../shared/constants/tone.constants';
import { type TransferJobItem } from '../../../../../shared/types';
import { hsl } from '../../../utils/transfer-format.util';

export type Stage = 'confirm' | 'running' | 'done';

type Palette = { from: string; to: string };

export const GREEN: Palette = { from: '150 70% 48%', to: '178 72% 46%' };

export const VIOLET: Palette = { from: '265 82% 64%', to: '218 88% 62%' };

export const AMBER: Palette = { from: '38 92% 56%', to: '22 92% 56%' };

export const RED: Palette = { from: '0 82% 62%', to: '338 80% 58%' };

export const TILE = {
  primary: 'border border-primary/20 bg-primary/10 text-primary',
  warn: 'border border-warn/20 bg-warn/10 text-warn',
  error: 'border border-error/20 bg-error/10 text-error',
};

const RADIUS = 44;

const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function Ring({ percent, spinning, palette, children }: { percent: number; spinning: boolean; palette: Palette; children: ReactNode }) {
  const gradientId = useId().replace(/:/g, '');
  const dash = spinning ? CIRCUMFERENCE * 0.28 : CIRCUMFERENCE * (percent / 100);
  return (
    <div className='relative h-[104px] w-[104px] shrink-0'>
      <svg
        viewBox='0 0 104 104'
        className={cn('h-full w-full -rotate-90', spinning && 'animate-spin')}
        style={spinning ? { animationDuration: '1.6s' } : undefined}
      >
        <defs>
          <linearGradient id={gradientId} x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0%' stopColor={hsl(palette.from)} />
            <stop offset='100%' stopColor={hsl(palette.to)} />
          </linearGradient>
        </defs>
        <circle cx='52' cy='52' r={RADIUS} fill='none' strokeWidth='7' stroke='currentColor' className='text-text-secondary/20' />
        <circle
          cx='52'
          cy='52'
          r={RADIUS}
          fill='none'
          strokeWidth='7'
          strokeLinecap='round'
          stroke={`url(#${gradientId})`}
          strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
          className='transition-[stroke-dasharray] duration-300 ease-out'
          style={{ filter: `drop-shadow(0 0 6px ${hsl(palette.from, 0.55)})` }}
        />
      </svg>
      <div className='absolute inset-0 flex flex-col items-center justify-center'>{children}</div>
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex min-w-0 flex-col gap-0.5'>
      <span className='text-[10px] font-medium uppercase tracking-wider text-text-secondary'>{label}</span>
      <span className='truncate text-xs font-semibold tabular-nums text-text-primary'>{value}</span>
    </div>
  );
}

export function StateIcon({ state }: { state: TransferJobItem['state'] }) {
  switch (state) {
    case 'active':
      return <Loader2 className='h-3.5 w-3.5 animate-spin text-primary' />;
    case 'transferred':
      return (
        <span className={cn('flex h-4 w-4 items-center justify-center rounded-full', TONE_CLASS.success.pill)}>
          <Check className='h-2.5 w-2.5' strokeWidth={3} />
        </span>
      );
    case 'merged':
      return <GitMerge className='h-3.5 w-3.5 text-primary' />;
    case 'skipped':
      return <Minus className='h-3.5 w-3.5 text-text-secondary' />;
    case 'failed':
      return <XCircle className='h-3.5 w-3.5 text-error' />;
    default:
      return <Clock className='h-3.5 w-3.5 text-text-secondary/60' />;
  }
}
