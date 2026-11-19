import { Sparkles } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { TONE_CLASS } from '../../../../constants/tone';
import { PHASES } from '../../../../constants/launch';
import { Block, Switch } from './ConfigBits';

interface LifecycleBlockProps {
  isChrome: boolean;
  flags: Record<string, boolean>;
  onFlag: (id: string, v: boolean) => void;
}

export function LifecycleBlock({ isChrome, flags, onFlag }: LifecycleBlockProps) {
  return (
    <Block title='Launch lifecycle' icon={Sparkles} tone='warn'>
      <div className='flex flex-col'>
        {PHASES.map((phase, idx) => {
          const last = idx === PHASES.length - 1;
          const activeCount = phase.items.filter((i) => !(i.chromiumOnly && isChrome) && flags[i.id]).length;
          return (
            <div key={phase.id} className='flex gap-3'>
              <div className='flex flex-col items-center'>
                <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', TONE_CLASS[phase.tone].icon)}>
                  <phase.icon className='h-3.5 w-3.5' />
                </span>
                {!last && <span className='my-1 w-px flex-1 border-l border-dashed border-text-secondary/25' />}
              </div>
              <div className={cn('flex min-w-0 flex-1 flex-col', !last && 'pb-4')}>
                <div className='flex h-7 items-center justify-between'>
                  <span className='text-xs font-semibold text-text-primary'>{phase.label}</span>
                  <span className='text-[10px] tabular-nums text-text-secondary'>
                    {activeCount}/{phase.items.length} on
                  </span>
                </div>
                <div className='flex flex-col divide-y divide-border/60 rounded-lg bg-background/60 px-3'>
                  {phase.items.map((item) => {
                    const disabled = !!item.chromiumOnly && isChrome;
                    return (
                      <div key={item.id} className={cn('flex items-center justify-between gap-3 py-2.5', disabled && 'opacity-40')}>
                        <span className='flex min-w-0 flex-col'>
                          <span className='truncate text-[11px] font-medium text-text-primary'>{item.label}</span>
                          <span className='truncate text-[10px] text-text-secondary'>{disabled ? 'Chromium only' : item.desc}</span>
                        </span>
                        <Switch disabled={disabled} checked={!disabled && flags[item.id]} onChange={(v) => onFlag(item.id, v)} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Block>
  );
}

export default LifecycleBlock;