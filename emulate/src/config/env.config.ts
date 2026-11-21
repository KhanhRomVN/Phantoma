/**
 * ------------------------------------------------------------------
 * Environment Configuration
 * ------------------------------------------------------------------
 * Typed access to environment variables with sane defaults.
 *
 * Supported variables:
 *   EMULATE_PORT     HTTP port of the service           (default 3002)
 *   EMULATE_DB_PATH  SQLite database file               (default ~/.phantoma/emulate/emulate.sql)
 *   ENV              Runtime environment name           (default development)
 *   LOG_LEVEL        DEBUG | INFO | WARN | ERROR        (read by the logger)
 * ------------------------------------------------------------------
 */

// ─── Imports ───────────────────────────────────────────────────────────
import { expandHome } from './paths.config';

// ─── Types ─────────────────────────────────────────────────────────────

export interface AppConfig {
  port: number;
  env: string;
  dbPath: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────

function getEnv(key: string, defaultVal: string): string {
  const val = process.env[key];
  return val && val !== '' ? val : defaultVal;
}

// ─── State ─────────────────────────────────────────────────────────────

const currentConfig: AppConfig = {
  port: parseInt(getEnv('EMULATE_PORT', '3002'), 10), // ASSUMED: fallback = DEFAULT_EMULATE_PORT in src/shared/ports.ts
  env: getEnv('ENV', 'development'),
  dbPath: expandHome(getEnv('EMULATE_DB_PATH', '~/.phantoma/emulate/emulate.sql')),
};

if (Number.isNaN(currentConfig.port)) {
  throw new Error('EMULATE_PORT must be a valid number');
}

// ─── Accessors ─────────────────────────────────────────────────────────

export const getConfig = (): AppConfig => currentConfig;

export const isDevelopment = (): boolean => currentConfig.env === 'development';

export function setDbPath(newPath: string): void {
  currentConfig.dbPath = newPath;
}
