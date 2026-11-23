import { envConfig } from './env.config';
import { paths } from './paths.config';

export const config = { ...envConfig, paths } as const;

export type AppConfig = typeof config;
export type { SystemConfig, LatencyTarget } from './env.config';
