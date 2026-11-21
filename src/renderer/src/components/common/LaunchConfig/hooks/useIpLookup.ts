import { useEffect, useState } from 'react';
import { lookupIp } from '@renderer/services/ip-lookup.service';
import type { IpInfo } from '@renderer/services/ip-lookup.service';

export type IpLookupState =
  | { status: 'loading' }
  | { status: 'ok'; data: IpInfo }
  | { status: 'error'; error: string };

export function useIpLookup(target: string | null) {
  const [state, setState] = useState<IpLookupState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    lookupIp(
      target,
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
  }, [target, attempt]);

  return { state, retry: () => setAttempt((n) => n + 1) };
}