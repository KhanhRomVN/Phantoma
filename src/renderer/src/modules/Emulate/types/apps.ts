import type { AppPlatform } from '../constants/platforms';

export type { AppPlatform };
export type AppMode = 'intercept' | 'record' | 'observe';

export interface UserApp {
  id?: string;
  name: string;
  platform: AppPlatform;
  mode: AppMode;
  url?: string;
  executablePath?: string;
  packageName?: string;
  exec?: string;
  icon?: string;
}

export interface DiscoveredApp {
  name: string;
  description?: string;
  icon?: string;
  source?: string;
  confidence?: number;
  tags?: string[];
  discoveredAt?: string;
  platform?: AppPlatform;
  url?: string;
  executablePath?: string;
  packageName?: string;
  exec?: string;
  appSize?: string;
  lastUsed?: string;
  addedToTarget?: boolean;
}