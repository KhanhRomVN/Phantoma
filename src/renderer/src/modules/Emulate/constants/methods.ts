/**
 * Cấu hình HTTP methods — nguồn dữ liệu duy nhất.
 *
 * Mỗi method có:
 * - title: tên hiển thị (vd: "GET")
 * - color: tên màu Tailwind, dùng để sinh class text/bg/border trong UI
 *   Cách dùng: text-{color}-400, bg-{color}-500/15, border-{color}-500/20
 *
 * Type HttpMethod được suy ra từ keyof typeof HTTP_METHODS.
 * Duyệt danh sách method qua Object.keys(HTTP_METHODS).
 */

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

export type HttpMethod = keyof typeof HTTP_METHODS;

export const DEFAULT_METHOD: HttpMethod = 'GET';
