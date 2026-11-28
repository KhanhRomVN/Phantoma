// Re-export from shared location to maintain backward compatibility
export * from '@shared/types/proxy.types';

export interface CountryStat {
  code: string;
  name: string;
  count: number;
}
