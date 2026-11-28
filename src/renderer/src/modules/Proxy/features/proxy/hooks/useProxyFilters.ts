import { useCallback, useMemo, useState } from 'react';
import type { Proxy } from '../../../shared/types/proxy-domain.types';
import { DEFAULT_PROXY_FILTERS } from '../types/proxy.types';
import type { ProxyFilters } from '../types/proxy.types';
import { hasActiveFilters, matchesFilters } from '../utils/proxy-filter';

/** Filter state plus the filtered view of the proxies it is applied to. */
export function useProxyFilters(candidates: Proxy[]) {
  const [filters, setFilters] = useState<ProxyFilters>(DEFAULT_PROXY_FILTERS);

  const visible = useMemo(
    () => candidates.filter((p) => matchesFilters(p, filters)),
    [candidates, filters],
  );
  const filtersDirty = hasActiveFilters(filters);
  const clearFilters = useCallback(() => setFilters(DEFAULT_PROXY_FILTERS), []);

  return { filters, setFilters, clearFilters, filtersDirty, visible };
}
