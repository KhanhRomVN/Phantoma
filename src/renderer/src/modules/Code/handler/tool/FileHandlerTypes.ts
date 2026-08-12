/**
 * ------------------------------------------------------------------
 * File Handler Types
 * ------------------------------------------------------------------
 * Shared types used across file handler classes.
 * ------------------------------------------------------------------
 */

export interface BaseParams {
  requestId?: string;
}

export interface BaseResult {
  command: string;
  requestId?: string;
  error?: string;
  [key: string]: any;
}