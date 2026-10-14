/**
 * ------------------------------------------------------------------
 * Server Configuration
 * ------------------------------------------------------------------
 * Minimal configuration for Phantoma Server (Health Check only).
 * All Emulation logic has been moved to Phantoma/emulate service.
 * ------------------------------------------------------------------
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface AppConfig {
  port: number;
  env: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────

function getEnv(key: string, defaultVal: string): string {
  const val = process.env[key];
  return val && val !== '' ? val : defaultVal;
}

// ─── State ────────────────────────────────────────────────────────────

const currentConfig: AppConfig = {
  port: parseInt(getEnv('PORT', '8080'), 10),
  env: getEnv('ENV', 'development'),
};

if (Number.isNaN(currentConfig.port)) {
  throw new Error('PORT must be a valid number');
}

// ─── Functions ──────────────────────────────────────────────────────────

export const getConfig = (): AppConfig => currentConfig;

export const isDevelopment = (): boolean => currentConfig.env === 'development';