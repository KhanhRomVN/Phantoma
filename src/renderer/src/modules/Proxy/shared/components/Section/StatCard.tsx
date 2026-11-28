import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { TONE_CLASS } from '../../constants/tone.constants';
import type { Tone } from '../../types/proxy-domain.types';

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
