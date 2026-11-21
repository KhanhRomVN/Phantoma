/**
 * ------------------------------------------------------------------
 * Paths Configuration
 * ------------------------------------------------------------------
 * Single source of truth for every location on disk the service reads
 * from or writes to. All paths live under the application data
 * directory (`~/.phantoma`) so nothing is scattered across the system.
 *
 *   ~/.phantoma/
 *   ├── certs/                   MITM CA certificates
 *   ├── emulate/                 SQLite DB + one folder per target
 *   │   └── {targets.id}/        reports/, fuzzers/ (per-target files)
 *   ├── cdp-profiles/{targetId}/ Chrome profiles used by CDP launches
 *   └── preferences.json         Startup preferences (last used port, ...)
 * ------------------------------------------------------------------
 */

// ─── Imports ───────────────────────────────────────────────────────────
import os from 'os';
import path from 'path';

// ─── Constants ─────────────────────────────────────────────────────────

const APP_DATA_DIR_NAME = '.phantoma';

// ─── Helpers ───────────────────────────────────────────────────────────

/** Expands a leading `~` to the current user's home directory. */
export function expandHome(p: string): string {
  if (!p.startsWith('~')) return p;
  return path.join(os.homedir(), p.slice(1));
}

// ─── Paths ─────────────────────────────────────────────────────────────

/** Root directory for all persisted application data. */
export function getAppDataDir(): string {
  return path.join(os.homedir(), APP_DATA_DIR_NAME);
}

/** Directory holding the SQLite database and per-target files. */
export function getEmulateDataDir(): string {
  return path.join(getAppDataDir(), 'emulate');
}

/** Per-target data folder, named after targets.id. */
export function getTargetDir(targetId: string): string {
  return path.join(getEmulateDataDir(), targetId);
}

/** Folder holding every fuzzer (json files) of a target. */
export function getFuzzersDir(targetId: string): string {
  return path.join(getTargetDir(targetId), 'fuzzers');
}

/** Directory holding Chrome profiles created for CDP launches. */
export function getCdpProfilesDir(): string {
  return path.join(getAppDataDir(), 'cdp-profiles');
}

/** Directory for generated MITM CA certificates. */
export const CERTS_DIR = path.join(os.homedir(), APP_DATA_DIR_NAME, 'certs');

/** Directory where the proxy caches intercepted media (images, videos). */
export const INTERCEPTOR_MEDIA_DIR = path.join(os.homedir(), APP_DATA_DIR_NAME, 'interceptor-media');

/** JSON file storing startup preferences (available before DB init). */
export const PREFERENCES_FILE = path.join(os.homedir(), APP_DATA_DIR_NAME, 'preferences.json');