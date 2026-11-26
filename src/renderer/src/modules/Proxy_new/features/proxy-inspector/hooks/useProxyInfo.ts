import { useEffect, useState } from 'react';
import { lookupIp, type IpInfo } from '@renderer/services/ip-lookup.service';

export type LookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; data: IpInfo }
  | { status: 'error'; error: string };

const DEBOUNCE_MS = 600;

/** Debounced IP lookup for the host being entered; `retry` re-runs a failed lookup. */
export function useProxyInfo(host: string, ready: boolean) {
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
  const retry = (): void => setAttempt((n) => n + 1);

  return { target, debounced, state, retry };
}
