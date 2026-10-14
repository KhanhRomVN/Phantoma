/**
 * ------------------------------------------------------------------
 * App Error Utility
 * ------------------------------------------------------------------
 * Custom error class carrying an HTTP status code so the global
 * error-handler middleware can map it to a proper JSON response.
 * ------------------------------------------------------------------
 */

export class AppError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}