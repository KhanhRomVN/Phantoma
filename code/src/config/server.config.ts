import os from 'os';
import path from 'path';

export interface AppConfig {
  port: number;
  env: string;
  dataDir: string;
  dbPath: string;
}

function expandHome(p: string): string {
  if (!p.startsWith('~')) return p;
  return path.join(os.homedir(), p.slice(1));
}

function getEnv(key: string, defaultVal: string): string {
  const val = process.env[key];
  return val && val !== '' ? val : defaultVal;
}

const dataDir = expandHome(getEnv('CODE_DATA_DIR', '~/.phantoma/code'));

const currentConfig: AppConfig = {
  port: parseInt(getEnv('CODE_PORT', '3055'), 10), // ASSUMED: fallback = DEFAULT_CODE_PORT (3055) cần thêm vào src/renderer/src/config/ports.ts
  env: getEnv('ENV', 'development'),
  dataDir,
  dbPath: path.join(dataDir, 'code.sql'),
};

if (Number.isNaN(currentConfig.port)) {
  throw new Error('CODE_PORT must be a valid number');
}

export const getConfig = (): AppConfig => currentConfig;