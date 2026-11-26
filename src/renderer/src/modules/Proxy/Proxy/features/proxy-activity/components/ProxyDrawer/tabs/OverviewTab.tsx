import { CalendarClock, Clock, Gauge, Globe2, HardDrive, Network, Percent, Timer } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import type { Proxy } from '../../../../../shared/types/proxy-domain.types';
import { COUNTRY_NAME } from '../../../../../shared/constants/proxy-meta.constants';
import { TONE_CLASS } from '../../../../../shared/constants/tone.constants';
import { daysLeft, latencyTone, successTone, timeAgo } from '../../../../../shared/utils/format';
import { FlagBadge, LatencyMeter, QuotaBar } from '../../../../../shared/components/ProxyBits';
import { CopyText, Empty, InfoRow, Section, StatCard } from '../../../../../shared/components/Section';

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex flex-1 flex-col gap-0.5 rounded-md bg-text-secondary/5 px-2.5 py-1.5'>
      <span className='text-[10px] uppercase tracking-wide text-text-secondary'>{label}</span>
      <span className='text-xs font-semibold tabular-nums text-text-primary'>{value}</span>
    </div>
  );
}

export function OverviewTab({ proxy }: { proxy: Proxy }) {
  const d = daysLeft(proxy.expiresAt);
  const unchecked = proxy.status === 'unchecked';
  const values = proxy.latencyHistory;
  const ok = values.filter((v) => v > 0);
  const failed = values.length - ok.length;
  const max = Math.max(1, ...values);
  const avg = ok.length ? Math.round(ok.reduce((a, b) => a + b, 0) / ok.length) : null;
  const min = ok.length ? Math.min(...ok) : null;
  const peak = ok.length ? Math.max(...ok) : null;
  const tone = latencyTone(proxy.latencyMs);
  const expiryTone = d === null ? 'muted' : d < 0 ? 'error' : d <= 7 ? 'warn' : 'success';

  return (
    <div className='flex flex-col gap-3'>
      <Section title='Health · last 24h' icon={Gauge} tone={tone === 'muted' ? 'muted' : tone}>
        {unchecked || values.length === 0 ? (
          <Empty text='This proxy has not been tested yet.' icon={Timer} />
        ) : (
          <div className='flex flex-col gap-2.5'>
            <div className='flex h-16 items-end gap-[3px]'>
              {values.map((v, i) => (
                <span
                  key={i}
                  title={v === 0 ? 'Failed' : `${v} ms`}
                  style={{ height: v === 0 ? 3 : Math.max(6, (v / max) * 64) }}
                  className={cn('flex-1 rounded-sm', v === 0 ? 'bg-error/60' : cn(TONE_CLASS[latencyTone(v)].bar, 'opacity-75'))}
                />
              ))}
            </div>
            <div className='flex justify-between text-[10px] text-text-secondary'>
              <span>24h ago</span>
              <span>now</span>
            </div>
            <div className='flex gap-2'>
              <MiniStat label='Min' value={min === null ? '—' : `${min} ms`} />
              <MiniStat label='Avg' value={avg === null ? '—' : `${avg} ms`} />
              <MiniStat label='Peak' value={peak === null ? '—' : `${peak} ms`} />
              <MiniStat label='Failed' value={`${failed}/${values.length}`} />
            </div>
          </div>
        )}
      </Section>

      <div className='grid grid-cols-2 gap-2.5'>
        <StatCard
          label='Success rate'
          icon={Percent}
          tone={unchecked ? 'muted' : successTone(proxy.successRate)}
          value={unchecked ? '—' : `${proxy.successRate}%`}
          progress={unchecked ? 0 : proxy.successRate}
        />
        <StatCard label='Latency' icon={Timer} tone='muted' value={<LatencyMeter ms={proxy.latencyMs} />} hint={`${proxy.checks.length} checks recorded`} />
        <StatCard label='Last checked' icon={Clock} tone='muted' value={timeAgo(proxy.lastChecked)} />
        <StatCard
          label='Expires'
          icon={CalendarClock}
          tone={expiryTone}
          value={d === null ? 'Never' : d < 0 ? 'Expired' : `${d} days`}
        />
      </div>

      <Section title='Network' icon={Globe2} tone='info'>
        <InfoRow label='Exit IP'>
          <CopyText value={proxy.exitIp} />
        </InfoRow>
        <InfoRow label='Location'>
          <FlagBadge code={proxy.country} city={`${proxy.city}, ${COUNTRY_NAME[proxy.country] ?? proxy.country}`} />
        </InfoRow>
        <InfoRow label='ISP'>
          <span className='inline-flex items-center gap-1.5'>
            <Network className='h-3 w-3 text-text-secondary' />
            {proxy.isp}
          </span>
        </InfoRow>
        <InfoRow label='Provider'>{proxy.provider}</InfoRow>
      </Section>

      <Section title='Bandwidth' icon={HardDrive} tone='warn'>
        <QuotaBar used={proxy.quotaUsedGb} total={proxy.quotaTotalGb} />
      </Section>
    </div>
  );
}

export default OverviewTab;