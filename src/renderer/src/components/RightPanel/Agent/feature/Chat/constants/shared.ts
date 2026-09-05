/**
 * ------------------------------------------------------------------
 * Shared Constants & Helpers
 * ------------------------------------------------------------------
 * Định nghĩa các hằng số dùng chung, UI tag registry, và các helper
 * functions tra cứu metadata cho toàn bộ hệ thống tag/tool.
 *
 * Main exports:
 * - TOOL_ACTION_TYPES     : Các loại action (accept/reject)
 * - EXECUTION_STATUS      : Trạng thái thực thi tool
 * - SHARED_TAG_REGISTRY   : Registry cho UI tags (markdown, thinking, question)
 * - getTagDef()           : Tra cứu định nghĩa tag
 * - requiresConfirmation() : Kiểm tra tool có cần xác nhận không
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Types ──
import type {
  PermissionMode,
  PermissionValue,
  TagCategory,
  TagDefinition,
  ToolType,
  UITagType,
  TagType,
} from '../types/tag-types';

// ─── Re-exports ─────────────────────────────────────────────────────────
// Re-export types for backward compatibility
export type {
  PermissionMode,
  PermissionValue,
  TagCategory,
  TagDefinition,
  ToolType,
  UITagType,
  TagType,
};

// ─── Constants ──────────────────────────────────────────────────────────
// Whitelist of allowed file extensions for external files
export const ALLOWED_FILE_EXTENSIONS = [
  '.txt',
  '.md',
  '.json',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.py',
  '.java',
  '.cpp',
  '.c',
  '.h',
  '.hpp',
  '.css',
  '.html',
  '.xml',
  '.yaml',
  '.yml',
  '.toml',
  '.ini',
  '.cfg',
  '.sh',
  '.go',
  '.rs',
  '.rb',
  '.php',
  '.swift',
  '.kt',
  '.scala',
];

// ===== TOOL ACTION TYPES =====
export const TOOL_ACTION_TYPES = {
  ACCEPT: 'accept',
  REJECT: 'reject',
} as const;

// ===== EXECUTION STATUS =====
export const EXECUTION_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  ERROR: 'error',
  DONE: 'done',
} as const;

// ===== TERMINAL STATUS =====
export const TERMINAL_STATUS = {
  BUSY: 'busy',
  FREE: 'free',
} as const;

export type TerminalStatus = (typeof TERMINAL_STATUS)[keyof typeof TERMINAL_STATUS];

// ===== SHARED TAG REGISTRY (UI tags only) =====
export const SHARED_TAG_REGISTRY: Record<string, TagDefinition> = {
  // UI TAGS
  markdown: {
    id: 'markdown',
    category: 'ui',
  },
  thinking: {
    id: 'thinking',
    category: 'ui',
  },
  question: {
    id: 'question',
    category: 'ui',
  },
};

// ============= HELPER FUNCTIONS =============

/**
 * Lấy tag definition từ registry tổng hợp
 */
export const getTagDef = (
  registry: Record<string, TagDefinition>,
  type: string,
): TagDefinition | undefined => {
  return registry[type];
};

/**
 * Lấy tất cả tool types từ registry
 */
export const getAllToolTypes = (registry: Record<string, TagDefinition>): string[] => {
  return Object.entries(registry)
    .filter(([_, def]) => def.category === 'tool')
    .map(([key]) => key);
};

/**
 * Lấy tất cả UI tag types từ registry
 */
export const getAllUITagTypes = (registry: Record<string, TagDefinition>): string[] => {
  return Object.entries(registry)
    .filter(([_, def]) => def.category === 'ui')
    .map(([key]) => key);
};

/**
 * Lấy tất cả tag types từ registry
 */
export const getAllTagTypes = (registry: Record<string, TagDefinition>): string[] => {
  return Object.keys(registry);
};

/**
 * Kiểm tra xem tool có yêu cầu xác nhận hay không dựa trên permission mode hiện tại
 */
export const requiresConfirmation = (
  registry: Record<string, TagDefinition>,
  type: string,
  mode: 'approval' | 'fullAccess' = 'approval',
): boolean => {
  const tag = registry[type];
  if (!tag || tag.category !== 'tool' || !tag.permissions) return false;

  const permission = tag.permissions[mode];
  return permission === 'confirm';
};

// ============= HELPER FUNCTIONS FOR FILE STATS =============

export const shouldShowFileStats = (
  registry: Record<string, TagDefinition>,
  toolType: string,
): boolean => {
  const tag = registry[toolType];
  return tag?.category === 'tool' ? (tag.features?.showFileStats ?? false) : false;
};

/**
 * Check if a tool should validate fuzzy match before execution
 */
export const shouldValidateFuzzyMatch = (
  registry: Record<string, TagDefinition>,
  toolType: string,
): boolean => {
  const tag = registry[toolType];
  return tag?.category === 'tool' ? (tag.features?.validateFuzzyMatch ?? false) : false;
};

/**
 * Get timeout (ms) for a tool. Default: 60000ms (60s)
 */
export const getToolTimeout = (
  registry: Record<string, TagDefinition>,
  toolType: string,
): number => {
  const tag = registry[toolType];
  return tag?.category === 'tool' ? (tag.timeout ?? 60000) : 60000;
};

/**
 * Check if a tool type is clickable (i.e., it's a tool, not a UI tag)
 */
export const isToolClickable = (registry: Record<string, TagDefinition>, type: string): boolean => {
  const tag = registry[type];
  return tag?.category === 'tool';
};

/**
 * Get the display label for a tool type from registry
 */
export const getToolLabel = (registry: Record<string, TagDefinition>, toolType: string): string => {
  return registry[toolType]?.title ?? toolType.toUpperCase().replace(/_/g, ' ');
};
