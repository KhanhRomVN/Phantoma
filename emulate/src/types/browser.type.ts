/**
 * Browser (Chrome / CDP) launch types.
 */

export interface ChromeLaunchOptions {
  targetId: string;
  /** URL of a local proxy to open; used when `customUrl` is empty. */
  proxyUrl?: string;
  /** URL the user explicitly asked to open. */
  customUrl?: string;
  /** Existing Chrome user-data-dir (optionally ending in a profile dir). */
  userDataDir?: string;
}

export interface ChromeLaunchResult {
  debugPort: number;
  pid: number | undefined;
  url: string;
}
