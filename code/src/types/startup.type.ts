/**
 * ------------------------------------------------------------------
 * Startup Types (CODE)
 * ------------------------------------------------------------------
 */

export interface ServerAddress {
  host: string;
  port: number;
}

export interface StartedOptions {
  wsPath?: string;
}