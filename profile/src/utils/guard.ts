import { AppError } from './http';

export const param = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : (v ?? ''));

export function found<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new AppError(`${what} not found`, 404);
  return value;
}