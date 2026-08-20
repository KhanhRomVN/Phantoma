/**
 * ------------------------------------------------------------------
 * Cache header
 * ------------------------------------------------------------------
 * Cache trong bộ nhớ cho các header yêu cầu gốc. Hỗ trợ xác thực
 * giao thức media bằng cách bảo toàn header qua các yêu cầu.
 *
 * Hàm chính:
 * - cacheHeaders()     : Lưu header cho một ID yêu cầu
 * - getCachedHeaders() : Lấy header đã cache theo ID
 * ------------------------------------------------------------------
 */

// ─── Constants ──────────────────────────────────────────────────────────
// Cache for original request headers to support authentication in media protocol
const headerCache = new Map<string, Record<string, string>>();
const MAX_CACHE_SIZE = 2000;

// ─── Functions ──────────────────────────────────────────────────────────
export function cacheHeaders(id: string, headers: Record<string, string>) {
  headerCache.set(id, headers);

  // Basic cleanup
  if (headerCache.size > MAX_CACHE_SIZE) {
    const firstKey = headerCache.keys().next().value;
    if (firstKey) headerCache.delete(firstKey);
  }
}

export function getCachedHeaders(id: string): Record<string, string> | undefined {
  return headerCache.get(id);
}
