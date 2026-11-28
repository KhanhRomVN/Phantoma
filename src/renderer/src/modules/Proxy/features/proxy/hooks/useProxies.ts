import { useEffect, useState } from 'react';
import type { Proxy } from '../../../shared/types/proxy-domain.types';
import { proxiesApi } from '../api/proxy.api';

/**
 * Owns the proxy list and keeps it in sync with the server-sent status events.
 * Initial loading is done by the page-level inventory hook (sources and proxies load together).
 */
export function useProxies() {
  const [proxies, setProxies] = useState<Proxy[]>([]);

  useEffect(
    () =>
      proxiesApi.subscribe((next) =>
        setProxies((prev) =>
          prev.some((p) => p.id === next.id)
            ? prev.map((p) => (p.id === next.id ? next : p))
            : prev,
        ),
      ),
    [],
  );

  return { proxies, setProxies };
}
