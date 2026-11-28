import type { Profile } from '../types';

const MIN_PREFIX = 4;

export interface PrefixOption {
  prefix: string;
  count: number;
}

export function emailLocal(email: string): string {
  return email.split('@')[0].toLowerCase();
}

export function collectPrefixes(profiles: Profile[]): PrefixOption[] {
  const counts = new Map<string, number>();
  for (const p of profiles) {
    const local = emailLocal(p.email);
    for (let len = MIN_PREFIX; len < local.length; len++) {
      const s = local.slice(local.length - len);
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
  }
  const shared = Array.from(counts).filter(([, n]) => n >= 2);
  return shared
    .filter(([s, n]) => !shared.some(([o, m]) => o.length > s.length && o.endsWith(s) && m === n))
    .map(([prefix, count]) => ({ prefix, count }))
    .sort((a, b) => b.count - a.count || a.prefix.localeCompare(b.prefix));
}