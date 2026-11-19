import { cn } from '@renderer/utils/cn';
import { SECURITY_LEVEL_LABEL } from '../../utils/security';
import type { SecurityLevel } from '../../utils/security';
import { TONE_CLASS } from '../../constants/tone';
import type { Tone } from '../../types/ui.types';

const LEVEL_TONE: Record<SecurityLevel, Tone> = {
  critical: 'error',
  weak: 'warn',
  fair: 'info',
  good: 'success',
  strong: 'success',
};

const TEXT_CLASS: Record<SecurityLevel, string> = {
  critical: 'text-error',
  weak: 'text-warn',
  fair: 'text-info',
  good: 'text-success',
  strong: 'text-success',
};

const BAR_CLASS: Record<SecurityLevel, string> = {
  critical: 'bg-error',
  weak: 'bg-warn',
  fair: 'bg-info',
  good: 'bg-success',
  strong: 'bg-success',
};

interface MeterProps {
  score: number;
  level: SecurityLevel;
}

export function SecurityRing({
  score,
  level,
  size = 64,
  stroke = 6,
}: MeterProps & { size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  return (
    <div className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={cn('transition-all duration-500', TEXT_CLASS[level])}
        />
      </svg>
      <span
        className={cn(
          'absolute inset-0 flex items-center justify-center text-sm font-semibold',
          TEXT_CLASS[level],
        )}
      >
        {score}
      </span>
    </div>
  );
}

export function SecurityBar({ score, level }: MeterProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border">
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', BAR_CLASS[level])}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={cn('w-6 text-xs font-medium tabular-nums', TEXT_CLASS[level])}>{score}</span>
    </div>
  );
}

export function SecurityCell({ score, level }: MeterProps) {
  return (
    <div className="flex w-28 flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className={cn('text-sm font-semibold leading-none tabular-nums', TEXT_CLASS[level])}>{score}</span>
        <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-none', TONE_CLASS[LEVEL_TONE[level]].pill)}>
          {SECURITY_LEVEL_LABEL[level]}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-text-secondary/15">
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', BAR_CLASS[level])}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}