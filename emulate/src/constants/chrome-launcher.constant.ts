/**
 * ------------------------------------------------------------------
 * Chrome Launcher Constants
 * ------------------------------------------------------------------
 */

/** Well-known Chrome/Chromium locations (Linux; extend for Win/Mac if needed). */
export const CHROME_EXECUTABLE_PATHS = [
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
  '/usr/bin/chromium',
] as const;

/** Matches the name of a Chrome sub-profile directory ("Default", "Profile 2"). */
export const CHROME_PROFILE_DIR_PATTERN = /^(Default|Profile \d+)$/;

/** Cache/lock entries that are skipped when cloning a real Chrome profile. */
export const CHROME_CLONE_SKIP_NAMES: ReadonlySet<string> = new Set([
  'Cache',
  'Code Cache',
  'GPUCache',
  'GrShaderCache',
  'ShaderCache',
  'DawnCache',
  'Crashpad',
  'Service Worker',
  'lockfile',
  'SingletonLock',
  'SingletonSocket',
  'SingletonCookie',
]);

/** How long to wait for the remote-debugging port to accept connections. */
export const CDP_READY_TIMEOUT_MS = 15_000;

/** Delay between readiness probes. */
export const CDP_READY_POLL_INTERVAL_MS = 200;

/** Fallback remote-debugging port used when no process is tracked. */
export const CDP_DEFAULT_PORT = 9222;
