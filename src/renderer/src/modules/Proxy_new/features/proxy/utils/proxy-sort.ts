import type { Proxy, ProxyStatus } from '../../../shared/types/proxy-domain.types';
import { daysLeft } from '../../../shared/utils/format';

export type SortKey = 'name' | 'status' | 'latency' | 'success' | 'expiry';

export interface SortState {
  key: SortKey;
  dir: 'asc' | 'desc';
}

const STATUS_RANK: Record<ProxyStatus, number> = { healthy: 0, testing: 1, degraded: 2, dead: 3, unchecked: 4 };

export function sortValue(p: Proxy, key: SortKey): string | number {
  switch (key) {
    case 'name':
      return p.name;
    case 'status':
      return STATUS_RANK[p.status];
    case 'latency':
      return p.latencyMs ?? 999999;
    case 'success':
      return p.successRate;
    case 'expiry':
      return daysLeft(p.expiresAt) ?? 999999;
  }
}

export function compare(a: string | number, b: string | number): number {
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
  return (a as number) - (b as number);
}

/**
 * Returns a sorted copy. Dead proxies that have not expired yet always float to the top,
 * because they need attention; the optional `sort` only orders within each group.
 */
export function sortProxies(proxies: Proxy[], sort: SortState | null): Proxy[] {
  const now = Date.now();
  // failing but not expired (expiry unknown or still in the future) needs attention, so it always floats to the top
  const urgent = (p: Proxy): number => (p.status === 'dead' && !(p.expiresAt && Date.parse(p.expiresAt) <= now) ? 0 : 1);
  const f = sort ? (sort.dir === 'asc' ? 1 : -1) : 0;
  return [...proxies].sort((a, b) => urgent(a) - urgent(b) || (sort ? f * compare(sortValue(a, sort.key), sortValue(b, sort.key)) : 0));
}

/** Next sort state when a column header is clicked: asc → desc → off. */
export function nextSort(prev: SortState | null, key: SortKey): SortState | null {
  return !prev || prev.key !== key ? { key, dir: 'asc' } : prev.dir === 'asc' ? { key, dir: 'desc' } : null;
}
