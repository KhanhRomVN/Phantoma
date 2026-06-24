/**
 * Application and target types for the Emulate feature
 */

export type AppPlatform = 'windows' | 'linux' | 'macos' | 'android' | 'ios' | 'web' | 'unknown' | 'pc' | 'cli';
export type AppMode = 'emulate' | 'monitor' | 'analyze' | 'intercept' | 'replay';

export interface App {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  platform?: AppPlatform;
  mode?: AppMode;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface UserApp extends App {
  userId: string;
  presetId?: string;
  config?: Record<string, any>;
}

export interface DiscoveredApp extends App {
  source: string;
  discoveredAt: number;
  confidence: number;
  tags?: string[];
}

export interface AppTarget {
  appId: string;
  targetId: string;
  port?: number;
  protocol?: string;
  host?: string;
  path?: string;
}

export interface AppConfig {
  id: string;
  appId: string;
  name: string;
  value: string | number | boolean;
  type: 'string' | 'number' | 'boolean' | 'json';
}

export interface AppPreset {
  id: string;
  name: string;
  description?: string;
  apps: string[];
  config: Record<string, any>;
}