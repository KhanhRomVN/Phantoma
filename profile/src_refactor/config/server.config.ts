import os from 'os';
import path from 'path';

export interface AppConfig {
  port: number;
  env: string;
  dataDir: string;
  dbPath: string;
  profilesDir: string;
}

function expandHome(p: string): string {
  if (!p.startsWith('~')) return p;
  return path.join(os.homedir(), p.slice(1));
}

function getEnv(key: string, defaultVal: string): string {
  const val = process.env[key];
  return val && val !== '' ? val : defaultVal;
}

const dataDir = expandHome(getEnv('PROFILE_DATA_DIR', '~/.phantoma/profile'));

const currentConfig: AppConfig = {
  port: parseInt(getEnv('PROFILE_PORT', '3033'), 10), // ASSUMED: fallback = DEFAULT_PROFILE_PORT in src/renderer/src/config/ports.ts
  env: getEnv('ENV', 'development'),
  dataDir,
  dbPath: path.join(dataDir, 'profile.sql'),
  profilesDir: path.join(dataDir, 'profiles'),
};

if (Number.isNaN(currentConfig.port)) {
  throw new Error('PROFILE_PORT must be a valid number');
}

export const getConfig = (): AppConfig => currentConfig;

export const isDevelopment = (): boolean => currentConfig.env === 'development';