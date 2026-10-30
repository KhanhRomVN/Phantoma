/**
 * ------------------------------------------------------------------
 * Emulate Service Configuration
 * ------------------------------------------------------------------
 * Adapted from server/src/config/server.config.ts for the standalone
 * emulate service. Uses same ~/.phantoma base dir but allows overriding
 * via EMULATE_DB_PATH if needed in future.
 * ------------------------------------------------------------------
 */

// ─── Imports ───────────────────────────────────────────────────────────
import os from 'os';
import path from 'path';

// ─── Types ─────────────────────────────────────────────────────────────

export interface AppConfig {
  port: number;
  env: string;
  dbPath: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────

function expandHome(p: string): string {
  if (!p.startsWith('~')) return p;
  return path.join(os.homedir(), p.slice(1));
}

function getEnv(key: string, defaultVal: string): string {
  const val = process.env[key];
  return val && val !== '' ? val : defaultVal;
}


export function getAppDataDir(): string {
  return expandHome('~/.phantoma');
}

// ─── State ─────────────────────────────────────────────────────────────

const currentConfig: AppConfig = {
  port: parseInt(getEnv('EMULATE_PORT', '3002'), 10), // ASSUMED: fallback = DEFAULT_EMULATE_PORT in src/shared/ports.ts
  env: getEnv('ENV', 'development'),
  dbPath: expandHome(getEnv('EMULATE_DB_PATH', '~/.phantoma/phantoma.sql')),
};

if (Number.isNaN(currentConfig.port)) {
  throw new Error('EMULATE_PORT must be a valid number');
}

// ─── Functions ──────────────────────────────────────────────────────────

export const getConfig = (): AppConfig => currentConfig;

export const isDevelopment = (): boolean => currentConfig.env === 'development';

export function setDbPath(newPath: string): void {
  currentConfig.dbPath = newPath;
}