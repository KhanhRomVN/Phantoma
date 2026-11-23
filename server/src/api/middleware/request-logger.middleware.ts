/**
 * ------------------------------------------------------------------
 * Request Logger Middleware
 * ------------------------------------------------------------------
 * Log mỗi request khi hoàn tất: `METHOD PATH - status - duration`.
 * Bỏ qua /health để giảm nhiễu. 5xx → error, 4xx → warn, còn lại → debug.
 * (Kết nối SSE chỉ được log khi client ngắt kết nối.)
 * ------------------------------------------------------------------
 */

import type { NextFunction, Request, Response } from 'express';
import { HEALTH_PATH } from '../../constants';
import { createLogger, Since } from '../../utils/logger.util';

const logger = createLogger('HTTP');

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (req.path === HEALTH_PATH) {
    next();
    return;
  }

  const start = Date.now();
  let logged = false;

  const log = (): void => {
    if (logged) return;
    logged = true;
    const status = res.statusCode;
    const message = `${req.method} ${req.originalUrl} - ${status}`;
    if (status >= 500) logger.error(message, Since(start));
    else if (status >= 400) logger.warn(message, Since(start));
    else logger.debug(message, Since(start));
  };

  res.on('finish', log);
  res.on('close', log);
  next();
}
