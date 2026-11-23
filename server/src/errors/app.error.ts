/**
 * ------------------------------------------------------------------
 * App Error
 * ------------------------------------------------------------------
 * AppError mang theo HTTP status code đi qua middleware stack. Dùng cho
 * các lỗi "dự kiến" (validate, not-found, bị chặn...) thay vì throw Error thô.
 * ------------------------------------------------------------------
 */

export class AppError extends Error {
  readonly statusCode: number;
  readonly code?: string;

  constructor(message: string, statusCode = 500, code?: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}
