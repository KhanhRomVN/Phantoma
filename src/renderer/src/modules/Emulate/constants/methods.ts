/**
 * ------------------------------------------------------------------
 * HTTP Methods
 * ------------------------------------------------------------------
 * Cấu hình HTTP methods — nguồn dữ liệu duy nhất cho toàn bộ UI.
 * Mỗi method có title hiển thị và màu Tailwind để sinh class
 * text/bg/border (text-{color}-400, bg-{color}-500/15...).
 *
 * Các exports chính:
 * - HTTP_METHODS   : Map cấu hình tất cả HTTP methods
 * - HttpMethod     : Type suy ra từ key của HTTP_METHODS
 * - DEFAULT_METHOD : Method mặc định (GET)
 * ------------------------------------------------------------------
 */

// ─── Constants ──────────────────────────────────────────────────────────
export const HTTP_METHODS = {
  GET: { title: 'GET', color: 'emerald' },
  POST: { title: 'POST', color: 'blue' },
  PUT: { title: 'PUT', color: 'amber' },
  DELETE: { title: 'DELETE', color: 'red' },
  PATCH: { title: 'PATCH', color: 'purple' },
  HEAD: { title: 'HEAD', color: 'indigo' },
  OPTIONS: { title: 'OPTIONS', color: 'teal' },
  TRACE: { title: 'TRACE', color: 'pink' },
  CONNECT: { title: 'CONNECT', color: 'violet' },
} as const;

// ─── Types ──────────────────────────────────────────────────────────────
export type HttpMethod = keyof typeof HTTP_METHODS;

// ─── Constants ──────────────────────────────────────────────────────────
export const DEFAULT_METHOD: HttpMethod = 'GET';