/**
 * ------------------------------------------------------------------
 * HTTP Response Helper
 * ------------------------------------------------------------------
 * Envelope JSON thống nhất cho mọi controller:
 *   success → { success: true, data }
 *   error   → { success: false, error, code? }
 * ------------------------------------------------------------------
 */

import type { Response } from 'express';
import type { ApiEnvelope } from '../types/api.type';

export const sendSuccess = <T>(res: Response, data: T, status = 200): void => {
  res.status(status).json({ success: true, data } satisfies ApiEnvelope<T>);
};

export const sendError = (res: Response, status: number, message: string, code?: string): void => {
  const body: ApiEnvelope = { success: false, error: message };
  if (code) body.code = code;
  res.status(status).json(body);
};
