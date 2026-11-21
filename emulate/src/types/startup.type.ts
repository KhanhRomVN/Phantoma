/**
 * Startup / welcome screen types.
 */

export interface Preferences {
  /** Port được chọn lần cuối qua Welcome UI. */
  lastPort?: number;
}

export interface ServerAddress {
  host: string;
  port: number;
}

export interface StartedOptions {
  /** WebSocket path on the same port. Default: '/ws' */
  wsPath?: string;
}

