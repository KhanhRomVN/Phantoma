import { useMemo } from 'react';
import { Activity, Gauge, HardDrive, Layers, TimerReset } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@renderer/utils/cn';
import type { Proxy, Tone } from '../types';
import { PROXY_STATUS, STATUSES, TONE_CLASS } from '../constants/proxy';
import { daysLeft } from '../utils/format';
import { Sparkline } from './common/ProxyBits';

interface StatSectionProps {
  proxies: Proxy[];
}

function Card({ icon: Icon, label, tone, children }: { icon: LucideIcon; label: string; tone: Tone; children: ReactNode }) {
  return (
    <div className='animate-in fade-in-0 slide-in-from-bottom-1 duration-300 flex min-w-0 flex-1 flex-col gap-2.5 rounded-md bg-card-background px-3.5 py-3'>
      <div className='flex items-center gap-2'>
        <div className={cn('flex h-6 w-6 items-center justify-center rounded-md', TONE_CLASS[tone].icon)}>
          <Icon className='h-3.5 w-3.5' />
        </div>
        <span className='truncate text-[11px] text-text-secondary'>{label}</span>
      </div>
      {children}
    </div>
  );
}

function Value({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className='flex items-baseline gap-1.5'>
      <span className='text-xl font-semibold leading-none tabular-nums text-text-primary'>{children}</span>
      {sub && <span className='truncate text-[11px] text-text-secondary'>{sub}</span>}
    </div>
  );
}

function Ring({ pct }: { pct: number }) {
  return (
    <svg width='44' height='44' viewBox='0 0 44 44' className='shrink-0 -rotate-90'>
      <circle cx='22' cy='22' r='17' fill='none' strokeWidth='5' stroke='currentColor' className='text-text-secondary/15' />
      <circle
        cx='22'
        cy='22'
        r='17'
        fill='none'
        strokeWidth='5'
        strokeLinecap='round'
        stroke='currentColor'
        className='text-success transition-all duration-500'
        strokeDasharray={`${(pct / 100) * 106.8} 106.8`}
      />
    </svg>
  );
}

export function StatSection({ proxies }: StatSectionProps) {
  const s = useMemo(() => {
    const total = proxies.length;
    const byStatus = Object.fromEntries(STATUSES.map((k) => [k, proxies.filter((p) => p.status === k).length]));
    const latencies = proxies.map((p) => p.latencyMs).filter((v): v is number => v !== null);
    const avgLatency = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    const trend = Array.from({ length: 24 }, (_, i) => {
      const vals = proxies.map((p) => p.latencyHistory[i]).filter((v) => v > 0);
      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    });
    const metered = proxies.filter((p) => p.quotaTotalGb);
    const quotaTotal = metered.reduce((a, p) => a + (p.quotaTotalGb ?? 0), 0);
    const quotaUsed = metered.reduce((a, p) => a + p.quotaUsedGb, 0);
    const expiring = proxies.filter((p) => {
      const d = daysLeft(p.expiresAt);
      return d !== null && d >= 0 && d <= 7;
    }).length;
    const expired = proxies.filter((p) => {
      const d = daysLeft(p.expiresAt);
      return d !== null && d < 0;
    }).length;
    return {
      total,
      byStatus,
      healthyPct: total ? Math.round((byStatus.healthy / total) * 100) : 0,
      avgLatency,
      trend,
      quotaPct: quotaTotal ? Math.round((quotaUsed / quotaTotal) * 100) : 0,
      quotaUsed,
      quotaTotal,
      expiring,
      expired,
    };
  }, [proxies]);

  return (
    <div className='flex gap-2.5'>
      <Card icon={Layers} label='Total proxies' tone='muted'>
        <Value sub={`${s.byStatus.dead} dead`}>{s.total}</Value>
        <div className='flex h-1.5 w-full gap-px overflow-hidden rounded-full bg-text-secondary/10'>
          {STATUSES.map((k) =>
            s.byStatus[k] > 0 ? (
              <span
                key={k}
                title={`${PROXY_STATUS[k].label}: ${s.byStatus[k]}`}
                className={TONE_CLASS[PROXY_STATUS[k].tone].bar}
                style={{ width: `${(s.byStatus[k] / Math.max(1, s.total)) * 100}%` }}
              />
            ) : null,
          )}
        </div>
      </Card>
      <Card icon={Activity} label='Healthy rate' tone='success'>
        <div className='flex items-center gap-3'>
          <Ring pct={s.healthyPct} />
          <div className='min-w-0'>
            <Value>{s.healthyPct}%</Value>
            <div className='mt-1 truncate text-[11px] text-text-secondary'>
              {s.byStatus.healthy} of {s.total} online
            </div>
          </div>
        </div>
      </Card>
      <Card icon={Gauge} label='Avg. latency (24h)' tone='info'>
        <Value sub='ms'>{s.avgLatency}</Value>
        <Sparkline values={s.trend} tone='info' height={18} />
      </Card>
      <Card icon={HardDrive} label='Bandwidth used' tone='warn'>
        <Value sub={`${s.quotaUsed.toFixed(0)} / ${s.quotaTotal} GB`}>{s.quotaPct}%</Value>
        <div className='h-1.5 w-full overflow-hidden rounded-full bg-text-secondary/15'>
          <div className={cn('h-full rounded-full', TONE_CLASS.warn.bar)} style={{ width: `${s.quotaPct}%` }} />
        </div>
      </Card>
      <Card icon={TimerReset} label='Expiring in 7 days' tone='error'>
        <Value sub={`${s.expired} expired`}>{s.expiring}</Value>
        <div className='text-[11px] text-text-secondary'>Renew before they go offline</div>
      </Card>
    </div>
  );
}

export default StatSection;