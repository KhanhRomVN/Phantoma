import type { FlatAccount, Pagination } from '../types/account.types';
import type { ProviderConfig } from '../types/provider.types';

/** Transport do caller cung cấp (vd. kết quả của useDbFetch). Service không gọi React hooks. */
export type Fetcher = (endpoint: string, init?: RequestInit) => Promise<Response>;

export interface ApiResult<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface MutationResult {
  success: boolean;
  error?: string;
}

/** Số request stats tối đa chạy đồng thời (tránh N+1 bùng nổ với limit lớn). */
const STATS_CONCURRENCY = 8;

export const callJson = async (
  fetcher: Fetcher,
  endpoint: string,
  method: string = 'GET',
  body?: unknown,
): Promise<ApiResult> => {
  const options: RequestInit = { method, cache: 'no-store' };
  if (body) options.body = JSON.stringify(body);
  const response = await fetcher(endpoint, options);
  return response.json();
};

const errorOf = (result: ApiResult | undefined, fallback: string): string =>
  result?.message || result?.error || fallback;

/** Chạy `worker` trên `items` với tối đa `limit` tác vụ song song, giữ nguyên thứ tự kết quả. */
export const mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
};

// ── Providers ──
export const fetchProviderConfigs = async (fetcher: Fetcher): Promise<ProviderConfig[] | null> => {
  const result = await callJson(fetcher, '/v1/providers');
  return result.success && result.data ? (result.data as ProviderConfig[]) : null;
};

// ── Regular accounts ──
export interface AccountListQuery {
  page: number;
  limit: number;
  period: string;
  email?: string;
}

export interface AccountListResult {
  accounts: any[];
  pagination: Pagination;
}

export const fetchAccountList = async (
  fetcher: Fetcher,
  query: AccountListQuery,
): Promise<AccountListResult | null> => {
  const params = new URLSearchParams({
    page: query.page.toString(),
    limit: query.limit.toString(),
    period: query.period,
    offset: '0',
  });
  if (query.email) params.append('email', query.email);
  const result = await callJson(fetcher, `/v1/accounts?${params.toString()}`);
  if (!(result.success && result.data)) return null;
  return {
    accounts: result.data.accounts || [],
    pagination: {
      total: result.data.pagination?.total || 0,
      page: result.data.pagination?.page || query.page,
      limit: result.data.pagination?.limit || query.limit,
      total_pages: result.data.pagination?.total_pages || 1,
    },
  };
};

const toFlatAccount = (
  acc: any,
  totalRequests: number,
  successfulRequests: number,
  totalTokens: number,
  periodRequests: number,
  periodTokens: number,
): FlatAccount => ({
  id: acc.id,
  provider_id: acc.provider_id,
  email: acc.email,
  credential: acc.credential,
  total_requests: totalRequests,
  successful_requests: successfulRequests,
  total_tokens: totalTokens,
  period_requests: periodRequests,
  period_tokens: periodTokens,
  user_data_dir: acc.user_data_dir,
  is_active_cli: acc.is_active_cli,
  usage: acc.usage ?? null,
  reset_usage_at: acc.reset_usage_at ?? null,
  auth_method: acc.auth_method ?? null,
});

/** Lấy stats cho từng account (giới hạn concurrency); lỗi một account → fallback số liệu từ account. */
export const attachAccountStats = (
  fetcher: Fetcher,
  accounts: any[],
  period: string,
): Promise<FlatAccount[]> =>
  mapWithConcurrency(accounts, STATS_CONCURRENCY, async (acc): Promise<FlatAccount> => {
    try {
      const statsResult = await callJson(fetcher, `/v1/stats?period=${period}&account_id=${acc.id}`);
      let periodTokens = 0;
      let periodRequests = 0;
      let totalRequests = acc.total_requests || 0;
      let successfulRequests = acc.successful_requests || 0;
      let totalTokens = acc.total_tokens || 0;

      if (statsResult.success && statsResult.data) {
        if (statsResult.data.usage) {
          periodTokens = statsResult.data.usage.reduce(
            (sum: number, entry: any) => sum + (entry.tokens || 0),
            0,
          );
          periodRequests = statsResult.data.usage.reduce(
            (sum: number, entry: any) => sum + (entry.requests || 0),
            0,
          );
        }
        if (statsResult.data.accounts?.length) {
          const accountStat = statsResult.data.accounts.find((s: any) => s.id === acc.id);
          if (accountStat) {
            totalRequests = accountStat.total_requests ?? totalRequests;
            successfulRequests = accountStat.successful_requests ?? successfulRequests;
            totalTokens = accountStat.total_tokens ?? totalTokens;
          }
        }
      }
      return toFlatAccount(acc, totalRequests, successfulRequests, totalTokens, periodRequests, periodTokens);
    } catch (err) {
      console.warn(`Failed to fetch stats for account ${acc.id}:`, err);
      return toFlatAccount(
        acc,
        acc.total_requests || 0,
        acc.successful_requests || 0,
        acc.total_tokens || 0,
        0,
        0,
      );
    }
  });

// ── API accounts ──
export const fetchApiAccountsAsFlat = async (fetcher: Fetcher): Promise<FlatAccount[]> => {
  const apiResult = await callJson(fetcher, '/v1/api-accounts?page=1&limit=10000');
  if (!(apiResult.success && apiResult.data)) return [];
  return (apiResult.data.accounts || []).map(
    (a: any): FlatAccount => ({
      id: a.id,
      provider_id: `api:${a.provider_name}`,
      email: a.label || a.provider_name,
      credential: a.api_key || '',
      usage: a.usage ?? undefined,
      reset_usage_at: a.reset_usage_at ?? undefined,
      is_active_cli: true,
      is_api_account: true,
      auth_method: 'API',
      base_url: a.base_url,
      api_type: a.api_type,
      label: a.label ?? undefined,
      website: a.config?.website,
      config: a.config ?? null,
      expires_at: a.expires_at ?? null,
    }),
  );
};

// ── Mutations ──
export const accountEndpoint = (id: string, isApiAccount: boolean | undefined): string =>
  isApiAccount ? `/v1/api-accounts/${id}` : `/v1/accounts/${id}`;

export const deleteAccount = async (
  fetcher: Fetcher,
  id: string,
  isApiAccount: boolean | undefined,
): Promise<MutationResult> => {
  try {
    const result = await callJson(fetcher, accountEndpoint(id, isApiAccount), 'DELETE');
    return result?.success
      ? { success: true }
      : { success: false, error: errorOf(result, 'Delete failed') };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
};

export const switchAccount = async (fetcher: Fetcher, id: string): Promise<MutationResult> => {
  const result = await callJson(fetcher, `/v1/accounts/${id}/switch`, 'POST');
  return result.success ? { success: true } : { success: false, error: errorOf(result, 'Switch failed') };
};

export const refreshAccountTokenRequest = async (
  fetcher: Fetcher,
  id: string,
  providerId: string,
): Promise<MutationResult> => {
  try {
    const result = await callJson(fetcher, `/v1/accounts/${id}/refresh-token`, 'POST', {
      provider_id: providerId,
    });
    if (result.success) return { success: true };
    const errMsg = errorOf(result, 'Refresh failed');
    console.warn('[account-api][refreshAccountToken] Failed:', errMsg);
    return { success: false, error: errMsg };
  } catch (err: any) {
    console.error('[account-api][refreshAccountToken] Exception:', err);
    return { success: false, error: err?.message || 'Network error' };
  }
};

// ── Import / override (transport riêng: giữ semantics `${apiUrl}${path}` của raw fetch hiện tại) ──
export interface ImportOutcome {
  succeeded: number;
  failed: { label: string; error: string }[];
}

const postJson = async (
  transport: Fetcher,
  path: string,
  body: unknown,
): Promise<MutationResult> => {
  const response = await transport(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let json: ApiResult | undefined;
  try {
    json = await response.json();
  } catch {
    json = undefined;
  }
  if (response.ok && json?.success !== false) return { success: true };
  return { success: false, error: errorOf(json, `HTTP ${response.status}`) };
};

/** Insert các entry mới + override các entry đã đổi. Trả kết quả theo từng thao tác. */
export const submitImport = async (
  transport: Fetcher,
  toInsert: unknown[],
  toOverride: { existingId?: string; incoming: unknown; label: string }[],
): Promise<ImportOutcome> => {
  const outcome: ImportOutcome = { succeeded: 0, failed: [] };
  const record = (label: string, count: number, r: MutationResult) => {
    if (r.success) outcome.succeeded += count;
    else outcome.failed.push({ label, error: r.error || 'Unknown error' });
  };

  const tasks: Promise<void>[] = [];
  if (toInsert.length > 0) {
    tasks.push(
      postJson(transport, '/v1/accounts/import', toInsert)
        .catch((e): MutationResult => ({ success: false, error: e?.message || 'Network error' }))
        .then((r) => record('insert', toInsert.length, r)),
    );
  }
  for (const entry of toOverride) {
    tasks.push(
      postJson(transport, '/v1/accounts/override', {
        existingId: entry.existingId,
        incoming: entry.incoming,
      })
        .catch((e): MutationResult => ({ success: false, error: e?.message || 'Network error' }))
        .then((r) => record(entry.label, 1, r)),
    );
  }
  await Promise.all(tasks);
  return outcome;
};
