/**
 * ------------------------------------------------------------------
 * Server Configuration
 * ------------------------------------------------------------------
 * Ported from internal/config/config.go. Values come from env vars
 * with the same defaults as the Go server (PORT=8080, ENV=development,
 * DB_PATH=~/.phantoma/phantoma.sql).
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── External 
import os from 'os';
import path from 'path';

// ─── Types ────────────────────────────────────────────────────────────

export interface AppConfig {
  port: number;
  env: string;
  dbPath: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────

// expandHome replaces a leading ~ with the user's home directory.
function expandHome(p: string): string {
  if (!p.startsWith('~')) return p;
  return path.join(os.homedir(), p.slice(1));
}

function getEnv(key: string, defaultVal: string): string {
  const val = process.env[key];
  return val && val !== '' ? val : defaultVal;
}

// getAppDataDir returns the app data directory (~/.phantoma), matching
// GetAppDataDir() in the Go config package.
export function getAppDataDir(): string {
  return expandHome('~/.phantoma');
}

// ─── State ─────────────────────────────────────────────────────────────

const currentConfig: AppConfig = {
  port: parseInt(getEnv('PORT', '8080'), 10),
  env: getEnv('ENV', 'development'),
  dbPath: expandHome(getEnv('DB_PATH', '~/.phantoma/phantoma.sql')),
};

if (Number.isNaN(currentConfig.port)) {
  throw new Error('PORT must be a valid number');
}

// ─── Functions ──────────────────────────────────────────────────────────

export const getConfig = (): AppConfig => currentConfig;

export const isDevelopment = (): boolean => currentConfig.env === 'development';

// setDbPath updates the database path at runtime (used by PUT /database/path).
export function setDbPath(newPath: string): void {
  currentConfig.dbPath = newPath;
}