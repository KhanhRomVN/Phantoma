/**
 * ------------------------------------------------------------------
 * Request Logger Middleware
 * ------------------------------------------------------------------
 * Ported from internal/middleware/logger.go. Logs every incoming HTTP
 * request in the form: METHOD PATH - status - durationMs. Health check
 * endpoint is skipped to reduce noise, matching the Go behavior.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── External 
import { Request, Response, NextFunction } from 'express';

// ── Local 
import { createLogger, F, Since } from '../utils/logger';

// ─── Constants ──────────────────────────────────────────────────────────
const logger = createLogger('HTTP');

// ─── Middleware ────────────────────────────────────────────────────────

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (req.path === '/health') {
    next();
    return;
  }

  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl}`, F('status', res.statusCode), Since(start));
  });

  next();
}