/**
 * HTTP access cho dashboard: /v1/stats, /v1/accounts, /v1/providers.
 * Mỗi hàm độc lập; trả null khi lỗi/không thành công (chỉ throw khi bị abort).
 */

import { getFaviconUrl } from '@renderer/utils/favicon';
import type {
  ModelDistributionEntry,
  StatsPeriod,
  StatsSnapshot,
  UsageEntry,
} from './dashboard.types';

async function getJson(url: string, signal?: AbortSignal): Promise<any | null> {
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const body = await res.json();
    return body?.success && body.data ? body.data : null;
  } catch (err) {
    if (signal?.aborted) throw err;
    console.warn('[Home] Request failed:', url, err);
    return null;
  }
}

export async function fetchUsageStats(
  apiUrl: string,
  period: StatsPeriod,
  offset: number,
  signal?: AbortSignal,
): Promise<StatsSnapshot | null> {
  // 'all' dùng dữ liệu year/offset 0 (giữ nguyên hành vi cũ)
  const p = period === 'all' ? 'year' : period;
  const o = period === 'all' ? 0 : offset;
  const data = await getJson(`${apiUrl}/v1/stats?period=${p}&offset=${o}`, signal);
  if (!data) return null;

  const usage: UsageEntry[] = Array.isArray(data.usage) ? data.usage : [];
  const models: ModelDistributionEntry[] = (Array.isArray(data.models) ? data.models : [])
    .filter((m: ModelDistributionEntry) => m.total_requests > 0)
    .sort(
      (a: ModelDistributionEntry, b: ModelDistributionEntry) => b.total_requests - a.total_requests,
    );

  return {
    periodTokens: usage.reduce((s, u) => s + (u.tokens || 0), 0),
    periodRequests: usage.reduce((s, u) => s + (u.requests || 0), 0),
    favoriteModel: models[0]?.model_id ?? '—',
    modelDistribution: models.slice(0, 5),
    dailyUsage: usage,
  };
}

export async function fetchAccountCount(
  apiUrl: string,
  signal?: AbortSignal,
): Promise<number | null> {
  const data = await getJson(`${apiUrl}/v1/accounts?page=1&limit=1000`, signal);
  if (!data) return null;
  return data.total ?? data.accounts?.length ?? 0;
}

export async function fetchProviderFavicons(
  apiUrl: string,
  signal?: AbortSignal,
): Promise<Record<string, string> | null> {
  const data = await getJson(`${apiUrl}/v1/providers`, signal);
  if (!Array.isArray(data)) return null;
  const favicons: Record<string, string> = {};
  for (const p of data) {
    if (p.provider_id && p.website) {
      try {
        favicons[p.provider_id] = getFaviconUrl(p.website);
      } catch {
        console.warn('[Home] Invalid website URL for favicon:', p.website);
      }
    }
  }
  return favicons;
}
