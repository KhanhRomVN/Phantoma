import type { Proxy } from '../../../shared/types/proxy-domain.types';
import type { ProxySource } from '../../../shared/types/source-domain.types';
import { averageLatencyMs, countExpiringSoon, meteredQuota } from '../../../shared/utils/proxy-metrics';
import type { SourceStats } from '../types/source.types';

export const EMPTY_STATS: SourceStats = { healthy: 0, dead: 0, avgLatency: 0, quotaUsedGb: 0, quotaTotalGb: 0, expiring: 0 };

/** Per-source health, latency, bandwidth and expiry numbers, keyed by source id. */
export function computeSourceStats(sources: ProxySource[], proxies: Proxy[]): Record<string, SourceStats> {
  const result: Record<string, SourceStats> = {};
  for (const s of sources) {
    const list = proxies.filter((p) => p.sourceId === s.id);
    const quota = meteredQuota(list);
    result[s.id] = {
      healthy: list.filter((p) => p.status === 'healthy').length,
      dead: list.filter((p) => p.status === 'dead').length,
      avgLatency: averageLatencyMs(list),
      quotaUsedGb: quota.used,
      quotaTotalGb: quota.total,
      expiring: countExpiringSoon(list),
    };
  }
  return result;
}

/** Sources with `count` replaced by the number of proxies that currently belong to them. */
export function withProxyCounts(sources: ProxySource[], proxies: Proxy[]): ProxySource[] {
  return sources.map((s) => ({ ...s, count: proxies.filter((p) => p.sourceId === s.id).length }));
}
