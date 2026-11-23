export const MIB = 1024 * 1024;

/** Số hữu hạn hoặc `null` (loại bỏ NaN/Infinity/undefined/null/không phải số). */
export const finiteOrNull = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

/** Số hữu hạn > 0 hoặc `null` — dùng cho cảm biến trả 0/-1 khi không hỗ trợ. */
export const positiveOrNull = (v: unknown): number | null => {
  const n = finiteOrNull(v);
  return n !== null && n > 0 ? n : null;
};

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export const round = (v: number, digits = 1): number => {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

export const mibToBytes = (mib: unknown): number | null => {
  const n = finiteOrNull(mib);
  return n === null ? null : Math.round(n * MIB);
};

/** Cộng các giá trị không-null; `null` nếu tất cả đều null. */
export function sumOrNull(...values: (number | null | undefined)[]): number | null {
  const valid = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  return valid.length ? valid.reduce((s, v) => s + v, 0) : null;
}
