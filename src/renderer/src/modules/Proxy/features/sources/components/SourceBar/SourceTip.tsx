import { Check, ExternalLink, Gauge, HardDrive, Layers, ServerOff, TimerReset } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@renderer/utils/cn';
import { TONE_CLASS } from '../../../../shared/constants/tone.constants';
import type { Tone } from '../../../../shared/types/proxy-domain.types';
import type { ProxySource } from '../../../../shared/types/source-domain.types';
import { timeAgo } from '../../../../shared/utils/format';
import { SOURCE_TYPE } from '../../constants/source.constants';
import type { SourceStats } from '../../types/source.types';
import { SourceIcon } from './SourceIcon';

function StatTile({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: ReactNode; tone?: Tone }) {
  return (
    <div className='flex min-w-0 flex-col gap-0.5 rounded-lg bg-background/60 px-2.5 py-1.5'>
      <span className='flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-text-secondary'>
        <Icon className='h-3 w-3' />
        {label}
      </span>
      <span className='flex items-center gap-1.5 text-sm font-semibold tabular-nums text-text-primary'>
        {tone && <span className={cn('h-1.5 w-1.5 rounded-full', TONE_CLASS[tone].dot)} />}
        {value}
      </span>
    </div>
  );
}

export function SourceTip({ source, stats }: { source: ProxySource; stats: SourceStats }) {
  const status = source.online ? TONE_CLASS.success : TONE_CLASS.muted;
  const type = SOURCE_TYPE[source.type];
  const has = source.count > 0;
  const quota = stats.quotaTotalGb ? `${Math.round((stats.quotaUsedGb / stats.quotaTotalGb) * 100)}%` : '—';
  return (
    <div className='flex w-[360px] flex-col text-left'>
      <div className='bg-tooltip-background px-3 py-2.5'>
        <div className='flex items-center gap-2.5'>
          <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-text-secondary/10'>
            <SourceIcon source={source} size={18} />
          </span>
          <div className='flex min-w-0 flex-1 flex-col gap-1'>
            <span className='truncate text-xs font-semibold text-text-primary'>{source.name}</span>
            <span className='flex items-center gap-1.5 text-[10px] text-text-secondary'>
              <span className={cn('flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium', status.pill)}>
                <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
                {source.online ? 'Online' : 'Offline'}
              </span>
              <span className={cn('rounded-md px-1.5 py-0.5 font-medium', TONE_CLASS[type.tone].pill)}>{type.label}</span>
              Synced {timeAgo(source.lastSync)}
            </span>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-3 gap-1.5 px-2.5 pb-2.5'>
        <StatTile icon={Layers} label='Proxies' value={source.count} />
        <StatTile icon={Check} label='Healthy' value={stats.healthy} tone={stats.healthy > 0 ? 'success' : undefined} />
        <StatTile icon={Gauge} label='Avg latency' value={has && stats.avgLatency ? `${stats.avgLatency} ms` : '—'} />
        <StatTile icon={ServerOff} label='Dead' value={stats.dead} tone={stats.dead > 0 ? 'error' : undefined} />
        <StatTile icon={HardDrive} label='Bandwidth' value={quota} tone={stats.quotaTotalGb ? 'warn' : undefined} />
        <StatTile icon={TimerReset} label='Expiring' value={stats.expiring} tone={stats.expiring > 0 ? 'warn' : undefined} />
      </div>

      <div className='mx-2.5 mb-2.5 flex items-center gap-2 rounded-lg bg-background/60 px-2.5 py-1.5'>
        <ExternalLink className='h-3.5 w-3.5 shrink-0 text-text-secondary' />
        <span className='truncate font-mono text-[10px] text-text-secondary'>{source.url || 'No website'}</span>
      </div>
    </div>
  );
}
