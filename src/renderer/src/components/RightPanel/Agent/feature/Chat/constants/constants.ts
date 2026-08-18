/**
 * Central constants — re-exports from split files for backward compatibility.
 *
 * Structure:
 *   shared.ts  — shared enums, helpers, UI tags, permission metadata
 *   code.ts    — code tool TAG_REGISTRY (read_file, write_to_file, ...)
 *   emulate.ts — emulate tool TAG_REGISTRY (list_https, get_https_detail)
 */

// Re-export raw values
export {
  STREAM_BOX_HEIGHT,
  ALLOWED_FILE_EXTENSIONS,
  TOOL_ACTION_TYPES,
  EXECUTION_STATUS,
  TERMINAL_STATUS,
  PERMISSION_MODE,
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
  shouldShowApprovalUI as _shouldShowApprovalUI,
  getConfigurableTools as _getConfigurableTools,
  shouldShowFileStats as _shouldShowFileStats,
  shouldValidateFuzzyMatch as _shouldValidateFuzzyMatch,
  getFileMutationTools as _getFileMutationTools,
  getToolTimeout as _getToolTimeout,
  isToolClickable as _isToolClickable,
  getToolLabel as _getToolLabel,
} from './shared';

export const getTagDef = (type: string): TagDefinition | undefined =>
  _getTagDef(TAG_REGISTRY, type);

export const getAllToolTypes = (): string[] =>
  _getAllToolTypes(TAG_REGISTRY);

export const getAllUITagTypes = (): string[] =>
  _getAllUITagTypes(TAG_REGISTRY);

export const getAllTagTypes = (): string[] =>
  _getAllTagTypes(TAG_REGISTRY);

export const requiresConfirmation = (
  type: string,
  mode: "approval" | "fullAccess" = "approval",
): boolean => _requiresConfirmation(TAG_REGISTRY, type, mode);

export const shouldShowApprovalUI = (
  type: string,
  mode: "approval" | "fullAccess" = "approval",
): boolean => _shouldShowApprovalUI(TAG_REGISTRY, type, mode);

export const getConfigurableTools = (): string[] =>
  _getConfigurableTools(TAG_REGISTRY);

export const shouldShowFileStats = (toolType: string): boolean =>
  _shouldShowFileStats(TAG_REGISTRY, toolType);

export const shouldValidateFuzzyMatch = (toolType: string): boolean =>
  _shouldValidateFuzzyMatch(TAG_REGISTRY, toolType);

export const getFileMutationTools = (): readonly string[] =>
  _getFileMutationTools(TAG_REGISTRY);

export const getToolTimeout = (toolType: string): number =>
  _getToolTimeout(TAG_REGISTRY, toolType);

export const isToolClickable = (type: string): boolean =>
  _isToolClickable(TAG_REGISTRY, type);

export const getToolLabel = (toolType: string): string =>
  _getToolLabel(TAG_REGISTRY, toolType);

// ============= FILE_MUTATION_TOOLS (backward compatibility) =============
export const FILE_MUTATION_TOOLS = _getFileMutationTools(TAG_REGISTRY) as readonly [
  "write_to_file",
  "replace_in_file",
  "revert_file",
];

export type FileMutationTool = (typeof FILE_MUTATION_TOOLS)[number];