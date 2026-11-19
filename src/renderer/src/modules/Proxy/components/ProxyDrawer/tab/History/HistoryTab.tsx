import { CheckCircle2, History, ListChecks, Timer, XCircle } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import type { Proxy } from '../../../../types';
import { TONE_CLASS } from '../../../../constants/proxy';
import { formatDateTime, latencyTone, timeAgo } from '../../../../utils/format';
import { Empty, Section, StatCard } from '../../common/Section';

export function HistoryTab({ proxy }: { proxy: Proxy }) {
  const checks = proxy.checks;
  if (checks.length === 0) {
    return (
      <div className='rounded-md bg-card-background'>
        <Empty text='No checks recorded.' icon={History} />
      </div>
    );
  }

  const okCount = checks.filter((c) => c.ok).length;
  const failCount = checks.length - okCount;
  const lat = checks.map((c) => c.latencyMs).filter((v): v is number => v !== null);
  const avg = lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : null;

  return (
    <div className='flex flex-col gap-3'>
      <div className='grid grid-cols-2 gap-2.5'>
        <StatCard label='Total checks' icon={ListChecks} tone='primary' value={checks.length} />
        <StatCard label='Avg latency' icon={Timer} tone={avg === null ? 'muted' : latencyTone(avg)} value={avg === null ? '—' : `${avg} ms`} />
        <StatCard label='Passed' icon={CheckCircle2} tone='success' value={okCount} progress={(okCount / checks.length) * 100} />
        <StatCard label='Failed' icon={XCircle} tone={failCount > 0 ? 'error' : 'muted'} value={failCount} progress={(failCount / checks.length) * 100} />
      </div>

      <Section title='Timeline' icon={History} tone='info'>
        <div className='relative flex flex-col'>
          <span aria-hidden className='absolute bottom-2 left-[9px] top-2 w-px bg-border' />
          {checks.map((c) => {
            const t = TONE_CLASS[c.ok ? 'success' : 'error'];
            const Icon = c.ok ? CheckCircle2 : XCircle;
            return (
              <div key={c.id} className='relative flex items-start gap-3 py-1.5'>
                <span className='relative z-10 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full bg-card-background'>
                  <Icon className={cn('h-4 w-4', t.text)} />
                </span>
                <div className='flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md bg-text-secondary/5 px-2.5 py-1.5'>
                  <div className='min-w-0'>
                    <div className='truncate text-xs text-text-primary'>{c.message}</div>
                    <div className='text-[11px] text-text-secondary'>
                      {formatDateTime(c.at)} · {timeAgo(c.at)}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums',
                      c.latencyMs === null ? TONE_CLASS.muted.pill : TONE_CLASS[latencyTone(c.latencyMs)].pill,
                    )}
                  >
                    {c.latencyMs === null ? '—' : `${c.latencyMs} ms`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

export default HistoryTab;