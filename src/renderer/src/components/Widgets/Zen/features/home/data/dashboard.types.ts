/**
 * Shared dashboard data contracts (API ↔ hooks ↔ cache ↔ presentation).
 */

export type StatsPeriod = 'day' | 'week' | 'month' | 'year' | 'all';

export interface StatsPeriodState {
  period: StatsPeriod;
  offset: number;
}

export interface UsageEntry {
  date: string;
  requests: number;
  tokens: number;
}

export interface ModelDistributionEntry {
  model_id: string;
  provider_id: string;
  total_requests: number;
  total_tokens: number;
  [key: string]: any;
}

/** Dữ liệu phụ thuộc period/offset — cache theo từng kỳ. */
export interface StatsSnapshot {
  periodTokens: number;
  periodRequests: number;
  favoriteModel: string;
  modelDistribution: ModelDistributionEntry[];
  dailyUsage: UsageEntry[];
}

/** Dữ liệu không phụ thuộc period — cache 1 bản duy nhất. */
export interface GlobalSnapshot {
  totalAccounts: number;
  providerFavicons: Record<string, string>;
}
