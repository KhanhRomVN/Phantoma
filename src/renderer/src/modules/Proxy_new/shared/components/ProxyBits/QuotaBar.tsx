import { cn } from '@renderer/utils/cn';
import { TONE_CLASS } from '../../constants/tone.constants';
import type { Tone } from '../../types/proxy-domain.types';

export function QuotaBar({ used, total }: { used: number; total: number | null }) {
  if (!total) return <span className='text-text-secondary'>Unlimited</span>;
  const pct = Math.min(100, Math.round((used / total) * 100));
  const tone: Tone = pct >= 90 ? 'error' : pct >= 70 ? 'warn' : 'info';
  return (
    <div className='flex min-w-[96px] flex-col gap-1'>
      <div className='h-1.5 w-full overflow-hidden rounded-full bg-text-secondary/15'>
        <div className={cn('h-full rounded-full', TONE_CLASS[tone].bar)} style={{ width: `${pct}%` }} />
      </div>
      <span className='text-[10px] tabular-nums text-text-secondary'>
        {used.toFixed(1)} / {total} GB
      </span>
    </div>
  );
}
