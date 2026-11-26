import type { Profile, ProfileStatus } from '../../../shared/types';
import { computeSecurity } from '../../security';

export type ServiceMode = 'include' | 'exclude';

export interface QuickFilters {
  search: string;
  status: ProfileStatus | 'all';
  group: string;
  services: Record<string, ServiceMode>;
  onlyUnsynced: boolean;
  onlyLowSecurity: boolean;
  onlyBannedService: boolean;
}

export const DEFAULT_QUICK_FILTERS: QuickFilters = {
  search: '',
  status: 'all',
  group: 'all',
  services: {},
  onlyUnsynced: false,
  onlyLowSecurity: false,
  onlyBannedService: false,
};

export function isQuickFilterDirty(f: QuickFilters): boolean {
  return (
    f.search !== '' ||
    f.status !== 'all' ||
    f.group !== 'all' ||
    Object.keys(f.services).length > 0 ||
    f.onlyUnsynced ||
    f.onlyLowSecurity ||
    f.onlyBannedService
  );
}

export function focusService(f: QuickFilters): string {
  const included = Object.entries(f.services).filter(([, mode]) => mode === 'include');
  return included.length === 1 ? included[0][0] : 'all';
}

export function matchQuickFilters(p: Profile, f: QuickFilters): boolean {
  if (f.status !== 'all' && p.status !== f.status) return false;
  if (f.group !== 'all' && p.group !== f.group) return false;
  for (const [name, mode] of Object.entries(f.services)) {
    const has = p.services.some((s) => s.name === name);
    if (mode === 'include' ? !has : has) return false;
  }
  if (f.onlyUnsynced && p.chromeSync === 'synced') return false;
  if (f.onlyLowSecurity && computeSecurity(p).score >= 60) return false;
  if (f.onlyBannedService && !p.services.some((s) => s.status === 'banned')) return false;

  const q = f.search.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    p.email,
    p.displayName,
    p.phone ?? '',
    p.recoveryEmail ?? '',
    p.group,
    ...p.services.map((s) => s.name),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}