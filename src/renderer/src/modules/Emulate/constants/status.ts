/**
 * ------------------------------------------------------------------
 * Status Code Colors
 * ------------------------------------------------------------------
 * Hàm trả về màu sắc (text/bg) theo HTTP status code range.
 * Dùng để hiển thị trạng thái request trong UI.
 *
 * Các functions chính:
 * - getStatusColor()   : Màu chữ theo status code
 * - getStatusBgColor() : Màu nền theo status code
 * ------------------------------------------------------------------
 */

// ─── Functions ──────────────────────────────────────────────────────────
export function getStatusColor(code: number): string {
  if (!code || code === 0) return 'text-red-400';
  if (code >= 500) return 'text-rose-400';
  if (code >= 400) return 'text-red-400';
  if (code >= 300) return 'text-amber-400';
  if (code >= 200) return 'text-emerald-400';
  if (code >= 100) return 'text-blue-400';
  return 'text-text-secondary';
}

export function getStatusBgColor(code: number): string {
  if (!code || code === 0) return 'bg-red-500/10';
  if (code >= 500) return 'bg-rose-500/10';
  if (code >= 400) return 'bg-red-500/10';
  if (code >= 300) return 'bg-amber-500/10';
  if (code >= 200) return 'bg-emerald-500/10';
  if (code >= 100) return 'bg-blue-500/10';
  return 'bg-text-secondary/10';
}