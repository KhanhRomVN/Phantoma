/**
 * ------------------------------------------------------------------
 * Capture Method Service
 * ------------------------------------------------------------------
 * Resolves which traffic-capture methods are available for a platform.
 * ------------------------------------------------------------------
 */

import { CAPTURE_METHOD_DEFINITIONS, PLATFORM_CAPTURE_METHODS } from '../../constants';
import type { CaptureMethodMeta, Platform } from '../../types';

/**
 * Lấy danh sách phương pháp hỗ trợ cho một platform cụ thể.
 */
export function getCaptureMethodsForPlatform(platform: Platform): CaptureMethodMeta[] {
  const methodKeys = PLATFORM_CAPTURE_METHODS[platform] || [];
  return methodKeys.map((key) => CAPTURE_METHOD_DEFINITIONS[key]).filter(Boolean);
}
