/**
 * ------------------------------------------------------------------
 * Outcome Types
 * ------------------------------------------------------------------
 * Kiểu kết quả thành công/thất bại dùng chung cho các API.
 *
 * Main types:
 * - Outcome<T> : { ok: true } & T hoặc { ok: false, error, code? }
 * ------------------------------------------------------------------
 */

// ─── Types ───────────────────────────────────────────────────────────────────
export type Outcome<T = object> = ({ ok: true } & T) | { ok: false; error: string; code?: string };