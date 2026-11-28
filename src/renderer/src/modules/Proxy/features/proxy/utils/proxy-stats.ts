import type { Proxy } from '../../../shared/types/proxy-domain.types';
import { STATUSES } from '../../../shared/constants/proxy-meta.constants';
import { daysLeft } from '../../../shared/utils/format';
import { averageLatencyMs, countExpiringSoon, meteredQuota } from '../../../shared/utils/proxy-metrics';

export interface ProxyStats {
  total: number;
  byStatus: Record<string, number>;
  healthyPct: number;
  avgLatency: number;
  trend: number[];
  quotaPct: number;
  quotaUsed: number;
  quotaTotal: number;
  expiring: number;
  expired: number;
}

export function computeProxyStats(proxies: Proxy[]): ProxyStats {
  const total = proxies.length;
  const byStatus = Object.fromEntries(STATUSES.map((k) => [k, proxies.filter((p) => p.status === k).length]));
  const trend = Array.from({ length: 24 }, (_, i) => {
    const vals = proxies.map((p) => p.latencyHistory[i]).filter((v) => v > 0);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  });
  const { used: quotaUsed, total: quotaTotal } = meteredQuota(proxies);
  const expired = proxies.filter((p) => {
    const d = daysLeft(p.expiresAt);
    return d !== null && d < 0;
  }).length;
  return {
    total,
    byStatus,
    healthyPct: total ? Math.round((byStatus.healthy / total) * 100) : 0,
    avgLatency: averageLatencyMs(proxies),
    trend,
    quotaPct: quotaTotal ? Math.round((quotaUsed / quotaTotal) * 100) : 0,
    quotaUsed,
    quotaTotal,
    expiring: countExpiringSoon(proxies),
    expired,
  };
}
