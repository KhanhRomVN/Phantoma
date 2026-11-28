export interface ServiceEmailCachePort {
  list: <T>(profileId: string, loader: () => T | Promise<T>) => Promise<T>;
  invalidate: (profileId?: string) => Promise<void>;
}