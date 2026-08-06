/**
 * HTTP Status codes — màu sắc theo range.
 *
 * Cách dùng: getStatusColor(200) → 'text-emerald-400'
 * Range:
 *   0 / falsy — red (lỗi kết nối / chưa có response)
 *   1xx — blue
 *   2xx — emerald
 *   3xx — amber
 *   4xx — red
 *   5xx — rose
 */
export function getStatusColor(code: number): string {
  if (!code || code === 0) return 'text-red-400';
  if (code >= 500) return 'text-rose-400';
  if (code >= 400) return 'text-red-400';
  if (code >= 300) return 'text-amber-400';
  if (code >= 200) return 'text-emerald-400';
  if (code >= 100) return 'text-blue-400';
  return 'text-text-secondary';
}

/** Trả về background color tương ứng với status code. */
export function getStatusBgColor(code: number): string {
  if (!code || code === 0) return 'bg-red-500/10';
  if (code >= 500) return 'bg-rose-500/10';
  if (code >= 400) return 'bg-red-500/10';
  if (code >= 300) return 'bg-amber-500/10';
  if (code >= 200) return 'bg-emerald-500/10';
  if (code >= 100) return 'bg-blue-500/10';
  return 'bg-text-secondary/10';
}