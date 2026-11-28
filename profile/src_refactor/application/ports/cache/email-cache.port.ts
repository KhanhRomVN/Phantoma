export interface EmailCachePort {
  list: <T>(sourceId: string | undefined, loader: () => T | Promise<T>) => Promise<T>;
  get: <T>(id: string, loader: () => T | Promise<T>) => Promise<T>;
  invalidate: () => Promise<void>;
}