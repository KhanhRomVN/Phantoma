import { AppError } from '../errors/app.error';

export function found<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new AppError(`${what} not found`, 404);
  return value;
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AppError(`${field} is required`, 400);
  }
  return value;
}