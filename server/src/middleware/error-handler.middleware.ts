/**
 * ------------------------------------------------------------------
 * Error Handler Middleware
 * ------------------------------------------------------------------
 * Adapted from AIWeb2API_temp's error handler but aligned with the Go
 * server's response envelope ({ success, data|error }) produced by
 * pkg/response. AppError carries an explicit statusCode; anything else
 * becomes a 500.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── External 
import { Request, Response, NextFunction } from 'express';

// ── Local 
import { AppError } from '../utils/api-error';
import { fail } from '../utils/response';
import { createLogger, F } from '../utils/logger';

// ─── Constants ──────────────────────────────────────────────────────────
const logger = createLogger('ErrorHandler');

// ─── Middleware ────────────────────────────────────────────────────────

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  logger.error('Unhandled error', F('path', req.originalUrl), F('method', req.method), F('error', err.message));

  if (err instanceof AppError) {
    fail(res, err.statusCode, err.message);
    return;
  }

  // Surface unexpected errors without leaking internals in production.
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  fail(res, 500, message);
}