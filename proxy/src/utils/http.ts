import { randomUUID } from 'crypto';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { createLogger } from './logger';

const logger = createLogger('ErrorHandler');

export class AppError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const json = <T>(res: Response, status: number, data: T): void => {
  res.status(status).json({ success: true, data });
};

export const fail = (res: Response, status: number, message: string): void => {
  res.status(status).json({ success: false, error: message });
};

export const handle =
  (fn: (req: Request, res: Response) => void | Promise<void>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
  };

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError && err.statusCode < 500) {
    logger.warn(`${req.method} ${req.originalUrl} -> ${err.message}`);
  } else {
    logger.error(`${req.method} ${req.originalUrl} -> ${err.message}`, err);
  }
  if (err instanceof AppError) {
    fail(res, err.statusCode, err.message);
    return;
  }
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  fail(res, 500, message);
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AppError(`${field} is required`, 400);
  }
  return value;
}

export const param = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : (v ?? ''));

export function found<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new AppError(`${what} not found`, 404);
  return value;
}

export function newId(): string {
  return randomUUID();
}