/**
 * ------------------------------------------------------------------
 * API Error
 * ------------------------------------------------------------------
 * AppError carries an HTTP status code through the middleware stack.
 * Used by controllers/services to signal expected failures (validation,
 * not-found, etc.) instead of throwing raw Errors.
 * ------------------------------------------------------------------
 */

export class AppError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}