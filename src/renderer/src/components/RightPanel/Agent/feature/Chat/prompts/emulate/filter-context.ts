/**
 * Filter Context — Cung cấp thông tin filter hiện tại đang áp dụng
 * để AI biết phạm vi dữ liệu đang bị giới hạn.
 *
 * File này được inject vào mọi request (cả request đầu tiên và các request sau).
 * Dữ liệu được bọc trong <filter_context> XML tag.
 */

/**
 * Build filter context string từ text mô tả filter (lấy từ EmulateController.getFilterText()).
 * Kết quả được bọc trong <filter_context> XML tag.
 */
export const buildFilterContext = (filterText: string): string => {
  // [DEBUG] Log khi build filter context — xoá sau khi fix xong
  console.log('[buildFilterContext] called');

  return [
    '<filter_context>',
    filterText,
    'Note: only values listed above are visible in the request table. Use them when filtering list_https or list_sources.',
    '</filter_context>',
  ].join('\n');
};

/**
 * Build empty filter context (khi không có filter hoặc requests).
 */
export const buildEmptyFilterContext = (): string => {
  return [
    '<filter_context>',
    'No request filters applied.',
    '</filter_context>',
  ].join('\n');
};