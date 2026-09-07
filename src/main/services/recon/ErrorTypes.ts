/**
 * ErrorTypes — Chuẩn hóa schema lỗi cho browser agent tools (spec v2)
 */

export type ErrorReason =
  | 'element_not_found'
  | 'stale_ref'
  | 'element_not_visible'
  | 'element_disabled'
  | 'intercepted'
  | 'timeout'
  | 'frame_not_found';

export interface ToolError {
  status: 'error';
  tool: string;
  ref?: string;
  reason: ErrorReason;
  message: string;
}

/**
 * Tạo ToolError object theo schema thống nhất.
 */
export function createToolError(
  tool: string,
  reason: ErrorReason,
  message: string,
  ref?: string,
): ToolError {
  return {
    status: 'error',
    tool,
    reason,
    message,
    ...(ref ? { ref } : {}),
  };
}

/**
 * Phân loại lỗi Puppeteer thành ErrorReason.
 * @param wasFromMap — true nếu selector được resolve từ elementRefMap (ref từng hợp lệ)
 */
export function classifyError(error: any, wasFromMap?: boolean): ErrorReason {
  const msg = error?.message || String(error);

  if (/timeout/i.test(msg)) return 'timeout';
  if (/not found|no element|failed to find/i.test(msg)) {
    // Nếu ref từng hợp lệ nhưng giờ fail → stale_ref
    return wasFromMap ? 'stale_ref' : 'element_not_found';
  }
  if (/not visible|hidden|outside.*viewport/i.test(msg)) return 'element_not_visible';
  if (/disabled/i.test(msg)) return 'element_disabled';
  if (/intercept|covered|overlay/i.test(msg)) return 'intercepted';
  if (/frame/i.test(msg)) return 'frame_not_found';

  return 'element_not_found';
}