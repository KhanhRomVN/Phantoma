import { AppError } from '../../application/errors/app.error';

export const param = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : (v ?? ''));

const first = (v: unknown): string | undefined => {
  const raw = Array.isArray(v) ? v[0] : v;
  return typeof raw === 'string' ? raw : undefined;
};

export function queryBool(v: unknown): boolean {
  return first(v) === 'true';
}

export function queryInt(v: unknown, field: string): number | undefined {
  const raw = first(v);
  if (raw === undefined || raw === '') return undefined;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) throw new AppError(`${field} must be an integer`, 400);
  return n;
}

export function queryCsv(v: unknown): string[] {
  const raw = first(v);
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function queryJson<T>(v: unknown, field: string): T | undefined {
  const raw = first(v);
  if (raw === undefined || raw === '') return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new AppError(`${field} must be valid JSON`, 400);
  }
}

export function bodyStringArray(v: unknown, field: string): string[] {
  if (!Array.isArray(v) || v.some((s) => typeof s !== 'string')) {
    throw new AppError(`${field} must be an array of strings`, 400);
  }
  return v as string[];
}