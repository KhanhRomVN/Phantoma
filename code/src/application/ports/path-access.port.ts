export interface SafePathOptions {
  write?: boolean;
  withinProject?: boolean;
  allowSensitive?: boolean;
}

export type RootProvider = () => string[];

export interface PathAccessPort {
  safePath(value: unknown, field: string, options?: SafePathOptions): string;
}