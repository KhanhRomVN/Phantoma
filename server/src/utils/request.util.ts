/**
 * ------------------------------------------------------------------
 * Request Helper
 * ------------------------------------------------------------------
 * Đọc & validate param/query của Express (Express 5 trả `string | string[] | ParsedQs...`).
 * ------------------------------------------------------------------
 */

export const param = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? v[0] : (v ?? '');

/** Trả chuỗi (không rỗng) từ query value, hoặc `undefined`. */
export function queryString(v: unknown): string | undefined {
  const raw = Array.isArray(v) ? v[0] : v;
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : undefined;
}

export function queryInt(
  v: unknown,
  opts: { fallback: number; min?: number; max?: number },
): number {
  const parsed = parseInt(queryString(v) ?? '', 10);
  if (Number.isNaN(parsed)) return opts.fallback;
  return Math.min(opts.max ?? Infinity, Math.max(opts.min ?? -Infinity, parsed));
}

export function queryEnum<T extends string>(v: unknown, allowed: readonly T[]): T | undefined {
  const raw = queryString(v);
  return allowed.find((a) => a === raw);
}
