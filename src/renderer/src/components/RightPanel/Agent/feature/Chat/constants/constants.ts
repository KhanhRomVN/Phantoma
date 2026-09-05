/**
 * ------------------------------------------------------------------
 * Central Constants
 * ------------------------------------------------------------------
 * Re-export tổng hợp từ các file constants tách rời để giữ backward
 * compatibility. Cung cấp TAG_REGISTRY hợp nhất và các wrapper functions.
 *
 * Main exports:
 * - TAG_REGISTRY           : Registry hợp nhất từ shared + code + emulate + recon
 * - getTagDef()            : Tra cứu định nghĩa tag theo type
 * - requiresConfirmation() : Kiểm tra tool có cần xác nhận không
 * - FILE_MUTATION_TOOLS    : Danh sách tool có thay đổi file
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// Re-export raw values
export {
  ALLOWED_FILE_EXTENSIONS,
  TOOL_ACTION_TYPES,
  EXECUTION_STATUS,
  TERMINAL_STATUS,
} from './shared';
export type { TerminalStatus } from './shared';
export type {
  PermissionMode,
  PermissionValue,
  TagCategory,
  TagDefinition,
  ToolType,
  UITagType,
  TagType,
} from './shared';

// ============= AGGREGATED TAG REGISTRY =============
import { SHARED_TAG_REGISTRY } from './shared';
import { CODE_TAG_REGISTRY } from './code';
import { EMULATE_TAG_REGISTRY } from './emulate';
import { RECON_TAG_REGISTRY } from './recon';
import type { TagDefinition } from '../types/tag-types';

export const TAG_REGISTRY: Record<string, TagDefinition> = {
  ...SHARED_TAG_REGISTRY,
  ...CODE_TAG_REGISTRY,
  ...EMULATE_TAG_REGISTRY,
  ...RECON_TAG_REGISTRY,
};

// Re-export individual registries
export { SHARED_TAG_REGISTRY } from './shared';
export { CODE_TAG_REGISTRY } from './code';
export { EMULATE_TAG_REGISTRY } from './emulate';
export { RECON_TAG_REGISTRY } from './recon';

// ============= BACKWARD-COMPATIBLE WRAPPERS =============
// Các hàm từ shared.ts yêu cầu tham số registry.
// Wrapper dưới đây tự động dùng TAG_REGISTRY tổng hợp.

import {
  getTagDef as _getTagDef,
  getAllToolTypes as _getAllToolTypes,
  getAllUITagTypes as _getAllUITagTypes,
  getAllTagTypes as _getAllTagTypes,
  requiresConfirmation as _requiresConfirmation,
  shouldShowFileStats as _shouldShowFileStats,
  shouldValidateFuzzyMatch as _shouldValidateFuzzyMatch,
  getToolTimeout as _getToolTimeout,
  isToolClickable as _isToolClickable,
  getToolLabel as _getToolLabel,
} from './shared';

export const getAllToolTypes = (): string[] => _getAllToolTypes(TAG_REGISTRY);

export const shouldShowFileStats = (toolType: string): boolean =>
  _shouldShowFileStats(TAG_REGISTRY, toolType);

export const shouldValidateFuzzyMatch = (toolType: string): boolean =>
  _shouldValidateFuzzyMatch(TAG_REGISTRY, toolType);

export const getToolTimeout = (toolType: string): number => _getToolTimeout(TAG_REGISTRY, toolType);

export const isToolClickable = (type: string): boolean => _isToolClickable(TAG_REGISTRY, type);

export const getToolLabel = (toolType: string): string => _getToolLabel(TAG_REGISTRY, toolType);

// ============= FILE_MUTATION_TOOLS (backward compatibility) =============
