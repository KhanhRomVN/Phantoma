import type { ProviderConfig } from '../types/provider.types';

const PROVIDERS_CACHE_PREFIX = 'zen.providers.cache.v2';
/** Cache cũ (v1) từng lưu nguyên FlatAccount[] kèm credential/API key → phải xóa. */
const LEGACY_KEYS = ['zen.accounts.cache.v1', 'zen.providers.cache.v1'];

interface CachedProviders {
  version: 2;
  savedAt: number;
  data: ProviderConfig[];
}

const providersKey = (scope: string): string => `${PROVIDERS_CACHE_PREFIX}:${scope}`;

const isProviderConfig = (v: unknown): v is ProviderConfig =>
  !!v &&
  typeof v === 'object' &&
  typeof (v as ProviderConfig).provider_id === 'string';

/** Xóa cache legacy có thể chứa secret. An toàn để gọi nhiều lần. */
export const purgeLegacyAccountCache = (): void => {
  try {
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  } catch {
    /* storage không khả dụng — bỏ qua */
  }
};

/**
 * Đọc provider cache theo scope (API/database context). Dữ liệu sai schema → [].
 * Provider config không chứa secret của người dùng.
 */
export const readProvidersCache = (scope: string): ProviderConfig[] => {
  try {
    const raw = localStorage.getItem(providersKey(scope));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<CachedProviders>;
    if (parsed?.version !== 2 || !Array.isArray(parsed.data)) return [];
    return parsed.data.filter(isProviderConfig);
  } catch {
    return [];
  }
};

export const writeProvidersCache = (scope: string, data: ProviderConfig[]): void => {
  try {
    const payload: CachedProviders = { version: 2, savedAt: Date.now(), data };
    localStorage.setItem(providersKey(scope), JSON.stringify(payload));
  } catch {
    /* quota exceeded — bỏ qua */
  }
};
