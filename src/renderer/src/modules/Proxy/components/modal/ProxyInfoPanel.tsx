import { useEffect, useState } from 'react';
import { Globe2, Loader2, WifiOff } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { lookupIp, type IpInfo } from '@renderer/services/ip-lookup.service';
import { CenteredState, RetryButton } from '../../../Profile/components/modal/LaunchBrowserModal/DetailPanel/CenteredState';
import { IpInfoBlocks } from '../../../Profile/components/modal/LaunchBrowserModal/DetailPanel/IpInfoBlocks';
import type { ProxyProtocol } from '../../types';
import { TONE_CLASS } from '../../constants/proxy';
import { flag } from '../../utils/format';

interface ProxyInfoPanelProps {
  host: string;
  port: number;
  protocol: ProxyProtocol;
  ready: boolean;
}

type LookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; data: IpInfo }
  | { status: 'error'; error: string };

const DEBOUNCE_MS = 600;
const PILL = 'rounded-md px-1.5 py-0.5 text-[10px] font-medium';

function Header({ info, endpoint }: { info: IpInfo; endpoint: string }) {
  return (
    <div className='relative overflow-hidden rounded-xl bg-card-background p-4'>
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 opacity-60'
        style={{ background: 'radial-gradient(90% 120% at 0% 0%, hsl(210 80% 55% / 0.18), transparent 70%)' }}
      />
      <div className='relative flex items-center gap-3'>
        <span className='flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background text-2xl'>{flag(info.countryCode)}</span>
        <div className='flex min-w-0 flex-1 flex-col gap-1'>
          <span className='truncate text-sm font-semibold text-text-primary'>{[info.city, info.country].filter(Boolean).join(', ') || info.ip}</span>
          <span className='truncate font-mono text-[11px] text-text-secondary'>{endpoint}</span>
        </div>
      </div>
      <div className='relative mt-3 flex flex-wrap items-center gap-1.5'>
        <span className={cn(PILL, 'bg-text-secondary/10 text-text-secondary')}>{info.ip}</span>
        {info.hosting && <span className={cn(PILL, TONE_CLASS.warn.pill)}>Hosting</span>}
        {(info.proxy || info.vpn || info.tor) && <span className={cn(PILL, TONE_CLASS.warn.pill)}>Proxy / VPN detected</span>}
        {info.mobile && <span className={cn(PILL, TONE_CLASS.info.pill)}>Mobile</span>}
      </div>
    </div>
  );
}

export function ProxyInfoPanel({ host, port, protocol, ready }: ProxyInfoPanelProps) {
  const target = ready ? host : null;
  const [debounced, setDebounced] = useState<string | null>(target);
  const [state, setState] = useState<LookupState>({ status: 'idle' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(target), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [target]);

  useEffect(() => {
    if (!debounced) {
      setState({ status: 'idle' });
      return;
    }
    let cancelled = false;
    setState({ status: 'loading' });
    lookupIp(
      debounced,
      (data) => {
        if (!cancelled) setState({ status: 'ok', data });
      },
      attempt > 0,
    )
      .then((data) => {
        if (!cancelled) setState({ status: 'ok', data });
      })
      .catch((e: unknown) => {
        if (!cancelled) setState({ status: 'error', error: e instanceof Error ? e.message : 'Lookup failed' });
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, attempt]);

  if (!target || state.status === 'idle') {
    return (
      <CenteredState
        icon={Globe2}
        title='No proxy info yet'
        text="Enter a valid host and port to look up this proxy's IP, location and network details."
      />
    );
  }
  if (state.status === 'loading' || debounced !== target) {
    return <CenteredState icon={Loader2} spin title='Looking up proxy' text={`Fetching details for ${host}…`} />;
  }
  if (state.status === 'error') {
    return (
      <CenteredState
        icon={WifiOff}
        title='Lookup failed'
        text={state.error}
        action={<RetryButton onClick={() => setAttempt((n) => n + 1)} />}
      />
    );
  }
  return (
    <div className='flex flex-col gap-3'>
      <Header info={state.data} endpoint={`${protocol}://${host}:${port}`} />
      <IpInfoBlocks info={state.data} />
    </div>
  );
}

export default ProxyInfoPanel;