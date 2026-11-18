import { Globe, KeyRound, Loader2, MapPin, Network, Plug, Radio, WifiOff } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { TONE_CLASS } from '../../../../constants/tone';
import { PROXY_HEALTH, PROXY_KIND } from '../../../../constants/proxy';
import { useIpLookup } from '../../../../hooks/useIpLookup';
import type { ProxyItem } from '../../../../types';
import { flagEmoji } from '../../../../utils/proxy';
import { CenteredState, RetryButton } from './CenteredState';
import { DetailCard, KV, Metric } from './DetailBits';
import { DirectConnectionView } from './DirectConnectionView';

export function ProxyDetailPanel({ proxy }: { proxy: ProxyItem | null }) {
  const { state, retry } = useIpLookup(proxy ? proxy.host : null);

  if (!proxy) {
    if (state.status === 'loading') {
      return <CenteredState icon={Loader2} spin title='Detecting connection' text="Looking up this machine's public IP…" />;
    }
    if (state.status === 'error') {
      return <CenteredState icon={WifiOff} title='Lookup failed' text={state.error} action={<RetryButton onClick={retry} />} />;
    }
    return <DirectConnectionView info={state.data} />;
  }

  const kind = PROXY_KIND[proxy.kind];
  const health = PROXY_HEALTH[proxy.health];
  const endpoint = `${proxy.protocol.toLowerCase()}://${proxy.host}:${proxy.port}`;
  const offline = proxy.health === 'offline';

  return (
    <div className='flex flex-col gap-3'>
      <div className='relative overflow-hidden rounded-xl bg-card-background p-4'>
        <div
          aria-hidden
          className='pointer-events-none absolute inset-0 opacity-60'
          style={{ background: 'radial-gradient(90% 120% at 0% 0%, hsl(210 80% 55% / 0.18), transparent 70%)' }}
        />
        <div className='relative flex items-center gap-3'>
          <span className='flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background text-2xl'>
            {flagEmoji(proxy.countryCode)}
          </span>
          <div className='flex min-w-0 flex-1 flex-col gap-1'>
            <span className='truncate text-sm font-semibold text-text-primary'>{proxy.name}</span>
            <span className='truncate font-mono text-[11px] text-text-secondary'>{endpoint}</span>
          </div>
        </div>
        <div className='relative mt-3 flex flex-wrap items-center gap-1.5'>
          <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium', TONE_CLASS[health.tone].pill)}>{health.label}</span>
          <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium', TONE_CLASS[kind.tone].pill)}>{kind.label}</span>
          <span className='rounded-md bg-text-secondary/10 px-1.5 py-0.5 text-[10px] font-medium text-text-secondary'>{proxy.protocol}</span>
          {proxy.custom && <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium', TONE_CLASS.primary.pill)}>Custom</span>}
        </div>
      </div>

      <div className='grid grid-cols-3 gap-2'>
        <Metric label='Latency' value={offline ? '—' : String(proxy.latency)} unit={offline ? undefined : 'ms'} tone={health.tone} />
        <Metric label='Uptime' value={offline ? '—' : proxy.uptime.toFixed(1)} unit={offline ? undefined : '%'} tone={proxy.uptime >= 95 ? 'success' : 'warn'} />
        <Metric label='Port' value={proxy.port} tone='info' />
      </div>

      <div className='flex flex-col gap-1.5 rounded-xl bg-card-background px-3 py-2.5'>
        <div className='flex items-center justify-between text-[10px] uppercase tracking-wide text-text-secondary'>
          <span>Reliability</span>
          <span className='tabular-nums'>{offline ? 'Offline' : `${proxy.uptime}%`}</span>
        </div>
        <span className='h-1.5 overflow-hidden rounded-full bg-text-secondary/15'>
          <span className={cn('block h-full rounded-full', TONE_CLASS[health.tone].dot)} style={{ width: `${offline ? 0 : proxy.uptime}%` }} />
        </span>
      </div>

      <DetailCard title='Connection' icon={Plug} tone='info'>
        <KV label='Name' value={proxy.name} />
        <KV label='Protocol' value={proxy.protocol} />
        <KV label='Host' value={proxy.host} mono copy />
        <KV label='Port' value={proxy.port} mono copy />
        <KV label='Endpoint' value={endpoint} mono copy />
      </DetailCard>

      <DetailCard title='Authentication' icon={KeyRound} tone='warn'>
        <KV label='Username' value={proxy.user} mono copy />
        <KV label='Password' value={proxy.pass === '' ? '' : '••••••••'} mono />
      </DetailCard>

      <DetailCard title='Location' icon={MapPin} tone='success'>
        <KV label='Country' value={proxy.country} />
        <KV label='Country code' value={proxy.countryCode} mono />
        <KV label='City' value={proxy.city} />
      </DetailCard>

      <DetailCard title='Network profile' icon={Radio} tone='primary'>
        <KV label='Provider' value={proxy.provider} />
        <KV label='Type' value={kind.label} />
        <KV label='Health' value={health.label} />
        <KV label='Latency' value={offline ? '' : `${proxy.latency} ms`} />
        <KV label='Uptime' value={offline ? '' : `${proxy.uptime}%`} />
        <KV label='ID' value={proxy.id} mono />
      </DetailCard>

      <div className='flex items-center gap-2 px-1 text-[10px] text-text-secondary'>
        <Globe className='h-3 w-3' />
        <Network className='h-3 w-3' />
        Click a monospace value to copy it.
      </div>
    </div>
  );
}

export default ProxyDetailPanel;