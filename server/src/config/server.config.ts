/**
 * ------------------------------------------------------------------
 * Server Configuration
 * ------------------------------------------------------------------
 * Configuration for Phantoma Server (Health Check + Browser engines).
 * All Emulation logic has been moved to Phantoma/emulate service.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import os from 'os';
import path from 'path';

// ─── Types ───────────────────────────────────────────────────────────

export interface AppConfig {
  port: number;
  env: string;
  dataDir: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────

function getEnv(key: string, defaultVal: string): string {
  const val = process.env[key];
  return val && val !== '' ? val : defaultVal;
}

function expandHome(p: string): string {
  if (!p.startsWith('~')) return p;
  return path.join(os.homedir(), p.slice(1));
}

// ─── State ────────────────────────────────────────────────────────────

const currentConfig: AppConfig = {
  port: parseInt(getEnv('PORT', '8080'), 10), // ASSUMED: fallback = DEFAULT_SERVER_PORT in src/shared/ports.ts
  env: getEnv('ENV', 'development'),
  // ASSUMED: giữ nguyên thư mục cũ của profile server để các bản browser đã cài vẫn dùng được
  dataDir: expandHome(getEnv('PROFILE_DATA_DIR', '~/.phantoma/profile')),
};

if (Number.isNaN(currentConfig.port)) {
  throw new Error('PORT must be a valid number');
}

// ─── Functions ──────────────────────────────────────────────────────────

export const getConfig = (): AppConfig => currentConfig;

export const isDevelopment = (): boolean => currentConfig.env === 'development';