import type { ReactNode } from 'react';
import { Home, Network, Server, Smartphone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import type { ProxyKind, ProxyProtocol, ProxyStatus, Tone } from '../../types';
import { KIND_META, PROTOCOL_META, PROXY_STATUS, TONE_CLASS } from '../../constants/proxy';
import { flag, latencyTone } from '../../utils/format';

export const KIND_ICON: Record<ProxyKind, LucideIcon> = {
  datacenter: Server,
  residential: Home,
  mobile: Smartphone,
  isp: Network,
};

function hueOf(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function Pill({ tone = 'muted', className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium',
        TONE_CLASS[tone].pill,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: ProxyStatus }) {
  const s = PROXY_STATUS[status];
  const t = TONE_CLASS[s.tone];
  const live = status === 'healthy' || status === 'testing';
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium', t.pill)}>
      <span className='relative flex h-1.5 w-1.5'>
        {live && <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', t.dot)} />}
        <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', t.dot)} />
      </span>
      {s.label}
    </span>
  );
}

export function ProtocolTag({ protocol }: { protocol: ProxyProtocol }) {
  const m = PROTOCOL_META[protocol];
  return (
    <Pill tone={m.tone} className='font-mono text-[10px] tracking-wide'>
      {m.label}
    </Pill>
  );
}

export function KindTag({ kind }: { kind: ProxyKind }) {
  const m = KIND_META[kind];
  const Icon = KIND_ICON[kind];
  return (
    <Pill tone={m.tone}>
      <Icon className='h-3 w-3' />
      {m.label}
    </Pill>
  );
}

export function KindIcon({ kind, size = 32 }: { kind: ProxyKind; size?: number }) {
  const Icon = KIND_ICON[kind];
  return (
    <div
      className={cn('flex shrink-0 items-center justify-center rounded-lg', TONE_CLASS[KIND_META[kind].tone].icon)}
      style={{ width: size, height: size }}
    >
      <Icon style={{ width: size * 0.5, height: size * 0.5 }} />
    </div>
  );
}

export function FlagBadge({ code, city }: { code: string; city?: string }) {
  return (
    <span className='inline-flex items-center gap-1.5'>
      <span className='flex h-5 w-5 items-center justify-center rounded-md bg-text-secondary/10 text-[13px] leading-none'>
        {flag(code)}
      </span>
      {city && <span className='truncate text-text-primary'>{city}</span>}
    </span>
  );
}

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

export function UserStack({ names, max = 3 }: { names: string[]; max?: number }) {
  if (names.length === 0) return <span className='text-text-secondary/60'>—</span>;
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <div className='flex items-center'>
      {shown.map((n, i) => {
        const hue = hueOf(n);
        return (
          <span
            key={n}
            title={n}
            style={{
              marginLeft: i === 0 ? 0 : -6,
              background: `linear-gradient(135deg, hsl(${hue} 65% 52%), hsl(${(hue + 40) % 360} 60% 40%))`,
            }}
            className='flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-semibold text-white ring-2 ring-card-background'
          >
            {n.charAt(0).toUpperCase()}
          </span>
        );
      })}
      {rest > 0 && <span className='ml-1.5 text-[10px] text-text-secondary'>+{rest}</span>}
    </div>
  );
}