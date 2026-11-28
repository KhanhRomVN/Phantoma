import { useEffect, useState } from 'react';
import type { ProxyProtocol } from '../../../../../shared/types/proxy-domain.types';
import type { TestState } from '../CreateProxyModal.types';

interface ConnectionTarget {
  valid: boolean;
  host: string;
  port: number;
  protocol: ProxyProtocol;
  username: string;
  password: string;
}

/**
 * Connection check shown in the footer. Re-runs (debounced) whenever the connection details change.
 */
export function useProxyConnectionTest({ valid, host, port, protocol, username, password }: ConnectionTarget) {
  const [test, setTest] = useState<TestState>({ status: 'idle' });

  // ASSUMED: simulated test like the table's test action — replace with real IPC when available
  useEffect(() => {
    if (!valid) {
      setTest({ status: 'idle' });
      return;
    }
    let inner: number | undefined;
    const outer = window.setTimeout(() => {
      setTest({ status: 'testing' });
      inner = window.setTimeout(
        () => {
          const ok = Math.random() > 0.25;
          setTest(
            ok ? { status: 'ok', ms: Math.round(60 + Math.random() * 320) } : { status: 'fail' },
          );
        },
        900 + Math.random() * 600,
      );
    }, 600);
    return () => {
      window.clearTimeout(outer);
      window.clearTimeout(inner);
    };
  }, [valid, host, port, protocol, username, password]);

  const resetTest = (): void => setTest({ status: 'idle' });

  return { test, resetTest };
}
