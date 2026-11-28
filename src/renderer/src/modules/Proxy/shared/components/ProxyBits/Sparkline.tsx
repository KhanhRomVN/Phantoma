import { cn } from '@renderer/utils/cn';
import { TONE_CLASS } from '../../constants/tone.constants';
import type { Tone } from '../../types/proxy-domain.types';

export function Sparkline({ values, tone = 'primary', height = 24 }: { values: number[]; tone?: Tone; height?: number }) {
  const max = Math.max(1, ...values);
  return (
    <div className='flex items-end gap-px' style={{ height }}>
      {values.map((v, i) => (
        <span
          key={i}
          style={{ height: v === 0 ? 2 : Math.max(3, (v / max) * height) }}
          className={cn('w-[3px] rounded-[1px]', v === 0 ? 'bg-error/60' : cn(TONE_CLASS[tone].bar, 'opacity-70'))}
        />
      ))}
    </div>
  );
}
