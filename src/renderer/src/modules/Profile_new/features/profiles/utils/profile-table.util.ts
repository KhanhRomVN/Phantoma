import type { Profile, ServiceLink, SyncState } from '../../../shared/types';
import { computeSecurity } from '../../security';
import { getActivities } from '../../activity';
import { SERVICE_STATUS } from '../../services';

export type SortKey = 'profile' | 'security' | 'chrome';

export type SortDir = 'asc' | 'desc';

export interface SortState {
  key: SortKey;
  dir: SortDir;
}

export const SYNC_RANK: Record<SyncState, number> = { synced: 0, unsynced: 1, error: 2 };

export function sortValue(p: Profile, key: SortKey): string | number {
  switch (key) {
    case 'profile':
      return p.displayName;

    case 'security':
      return computeSecurity(p).score;
    case 'chrome':
      return SYNC_RANK[p.chromeSync];
  }
}

export function charRank(c: string): number {
  if (c >= 'a' && c <= 'z') return 0;
  if (c >= 'A' && c <= 'Z') return 1;
  if (c >= '0' && c <= '9') return 2;
  return 3;
}

export function compareEmail(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const ra = charRank(a[i]);
    const rb = charRank(b[i]);
    if (ra !== rb) return ra - rb;
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return a.length - b.length;
}

export function defaultSort(list: Profile[]): Profile[] {
  return list
    .map((p) => {
      const acts = getActivities(p);
      const last = acts[0]?.at ? Date.parse(acts[0].at) || 0 : 0;
      return { p, at: Math.max(Date.parse(p.lastActive) || 0, last), n: acts.length };
    })
    .sort((a, b) => {
      if (a.at > 0 !== b.at > 0) return a.at > 0 ? -1 : 1;
      if (a.at !== b.at) return b.at - a.at;
      if (a.n !== b.n) return b.n - a.n;
      return compareEmail(a.p.email, b.p.email);
    })
    .map((x) => x.p);
}

export function compareValues(a: string | number, b: string | number): number {
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b, 'vi');
  return (a as number) - (b as number);
}

export function prioritizeServices(services: ServiceLink[]): ServiceLink[] {
  const rank = (s: ServiceLink): number => (SERVICE_STATUS[s.status].tone === 'error' ? 0 : 1);
  return [...services].sort((a, b) => rank(a) - rank(b));
}
