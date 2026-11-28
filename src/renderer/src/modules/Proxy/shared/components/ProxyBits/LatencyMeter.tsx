import { cn } from '@renderer/utils/cn';
import { TONE_CLASS } from '../../constants/tone.constants';
import { latencyTone } from '../../utils/format';

export function LatencyMeter({ ms }: { ms: number | null }) {
  const tone = latencyTone(ms);
  const level = ms === null ? 0 : ms < 150 ? 4 : ms < 300 ? 3 : ms < 500 ? 2 : 1;
  return (
    <span className='inline-flex items-center gap-1.5'>
      <span className='flex items-end gap-[2px]'>
        {[5, 8, 11, 14].map((h, i) => (
          <span
            key={h}
            style={{ height: h }}
            className={cn('w-[3px] rounded-full', i < level ? TONE_CLASS[tone].bar : 'bg-text-secondary/20')}
          />
        ))}
      </span>
      <span className={cn('tabular-nums', ms === null ? 'text-text-secondary' : 'text-text-primary')}>
        {ms === null ? '—' : `${ms} ms`}
      </span>
    </span>
  );
}
