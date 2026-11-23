/**
 * ------------------------------------------------------------------
 * Error Handler Middleware
 * ------------------------------------------------------------------
 * Chuyển mọi lỗi thành envelope `{ success: false, error }`.
 * AppError mang status code riêng; lỗi khác trở thành 500 (ẩn chi tiết
 * khi chạy production). Lỗi 4xx log ở mức warn, 5xx ở mức error.
 * ------------------------------------------------------------------
 */

import type { NextFunction, Request, Response } from 'express';
import { config } from '../../config';
import { AppError } from '../../errors/app.error';
import { createLogger, F } from '../../utils/logger.util';
import { sendError } from '../../utils/http-response.util';

const logger = createLogger('ErrorHandler');

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  const status = err instanceof AppError ? err.statusCode : 500;
  const fields = [F('path', req.originalUrl), F('method', req.method), F('error', err.message)];
  if (status >= 500) logger.error('Unhandled error', ...fields);
  else logger.warn('Request failed', ...fields);

  if (err instanceof AppError) {
    sendError(res, status, err.message, err.code);
    return;
  }
  sendError(res, 500, config.isProduction ? 'Internal server error' : err.message);
}
