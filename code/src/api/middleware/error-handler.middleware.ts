import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../application/errors/app.error';
import { fail } from '../http/envelope';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError && err.statusCode < 500) {
    console.warn(`[HTTP] ${req.method} ${req.originalUrl} -> ${err.message}`);
  } else {
    console.error(`[HTTP] ${req.method} ${req.originalUrl} -> ${err.message}`, err);
  }
  if (err instanceof AppError) {
    fail(res, err.statusCode, err.message);
    return;
  }
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  fail(res, 500, message);
}