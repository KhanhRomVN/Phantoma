import type { Proxy } from '../../../shared/types/proxy-domain.types';
import { DEFAULT_PROXY_FILTERS } from '../types/proxy.types';
import type { ProxyFilters } from '../types/proxy.types';

export function matchesFilters(p: Proxy, f: ProxyFilters): boolean {
  if (f.status !== 'all' && p.status !== f.status) return false;
  if (f.protocol !== 'all' && p.protocol !== f.protocol) return false;
  if (f.kind !== 'all' && p.kind !== f.kind) return false;
  if (f.country !== 'all' && p.country !== f.country) return false;
  const q = f.search.trim().toLowerCase();
  if (!q) return true;
  return [p.name, p.host, p.exitIp, p.isp, p.provider, p.city, ...p.tags].some((v) =>
    v.toLowerCase().includes(q),
  );
}

/** True when at least one filter differs from its default value. */
export function hasActiveFilters(filters: ProxyFilters): boolean {
  return (Object.keys(DEFAULT_PROXY_FILTERS) as (keyof ProxyFilters)[]).some(
    (k) => filters[k] !== DEFAULT_PROXY_FILTERS[k],
  );
}
