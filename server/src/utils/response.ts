/**
 * ------------------------------------------------------------------
 * Response Helper
 * ------------------------------------------------------------------
 * Standardized JSON envelope matching the Go pkg/response package:
 *   success → { success: true, data }
 *   error   → { success: false, error }
 *
 * All controllers should use these helpers so clients receive a uniform
 * shape regardless of which module served the request.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── External ─
import { Response } from 'express';

// ─── Types ─────────────────────────────────────────────────────────────

interface Envelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Functions ──────────────────────────────────────────────────────────

export const json = <T>(res: Response, status: number, data: T): void => {
  res.status(status).json({ success: true, data } satisfies Envelope<T>);
};

export const fail = (res: Response, status: number, message: string): void => {
  res.status(status).json({ success: false, error: message } satisfies Envelope);
};