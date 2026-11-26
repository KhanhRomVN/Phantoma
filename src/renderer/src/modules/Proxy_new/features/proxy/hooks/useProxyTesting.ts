import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Proxy } from '../../../shared/types/proxy-domain.types';
import { errorMessage } from '../../../shared/utils/error';
import { proxiesApi } from '../api/proxy.api';

interface UseProxyTestingOptions {
  setProxies: Dispatch<SetStateAction<Proxy[]>>;
  setError: (message: string | null) => void;
}

/** Tracks which proxies are being tested and applies the test results to the list. */
export function useProxyTesting({ setProxies, setError }: UseProxyTestingOptions) {
  const [testingIds, setTestingIds] = useState<Set<string>>(new Set());

  const testProxies = useCallback(
    async (targets: Proxy[]): Promise<void> => {
      const ids = targets.map((p) => p.id);
      if (ids.length === 0) return;
      setTestingIds((prev) => new Set([...prev, ...ids]));
      try {
        const results = await proxiesApi.test(ids);
        const byId = new Map(results.map((r) => [r.id, r]));
        setProxies((prev) => prev.map((p) => byId.get(p.id) ?? p));
        setError(null);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setTestingIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
      }
    },
    [setProxies, setError],
  );

  return { testingIds, testProxies };
}
