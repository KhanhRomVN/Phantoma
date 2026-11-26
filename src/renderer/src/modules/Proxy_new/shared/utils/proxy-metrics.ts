import type { Proxy } from '../types/proxy-domain.types';
import { daysLeft } from './format';

/** Rounded mean of the known latencies, 0 when none is known. */
export function averageLatencyMs(proxies: Proxy[]): number {
  const latencies = proxies.map((p) => p.latencyMs).filter((v): v is number => v !== null);
  return latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
}

/** Bandwidth totals over the proxies that have a quota (unlimited proxies are ignored). */
export function meteredQuota(proxies: Proxy[]): { used: number; total: number } {
  const metered = proxies.filter((p) => p.quotaTotalGb);
  return {
    used: metered.reduce((a, p) => a + p.quotaUsedGb, 0),
    total: metered.reduce((a, p) => a + (p.quotaTotalGb ?? 0), 0),
  };
}

/** Proxies that expire within the next 7 days (already expired ones are not counted). */
export function countExpiringSoon(proxies: Proxy[]): number {
  return proxies.filter((p) => {
    const d = daysLeft(p.expiresAt);
    return d !== null && d >= 0 && d <= 7;
  }).length;
}
