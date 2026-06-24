// Re-export and extend global types for Emulate feature
import type {
  AppPlatform as GlobalAppPlatform,
  AppMode as GlobalAppMode,
  UserApp as GlobalUserApp,
  DiscoveredApp as GlobalDiscoveredApp,
} from '../../../types/apps';

export type AppPlatform = GlobalAppPlatform | 'pc' | 'cli';
export type AppMode = GlobalAppMode;

export interface UserApp extends GlobalUserApp {
  platform: AppPlatform;
  url?: string;
  executablePath?: string;
  packageName?: string;
  exec?: string;
}

export interface DiscoveredApp extends GlobalDiscoveredApp {
  platform: AppPlatform;
  url?: string;
  executablePath?: string;
  packageName?: string;
  exec?: string;
}