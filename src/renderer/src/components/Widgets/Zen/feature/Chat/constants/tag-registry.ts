/**
 * ------------------------------------------------------------------
 * Tag Registry & Tool Constants
 * ------------------------------------------------------------------
 * Tổng hợp tag registry từ tất cả modules và cung cấp các helper
 * functions để tra cứu metadata cho hệ thống tag/tool.
 *
 * Main exports:
 * - TAG_REGISTRY           : Registry hợp nhất từ UI tags + module tags
 * - TOOL_ACTION_TYPES      : Các loại action (accept/reject)
 * - EXECUTION_STATUS       : Trạng thái thực thi tool
 * - FILE_MUTATION_TOOLS    : Danh sách tool có thay đổi file
 * - Helper functions       : getTagDef, getAllToolTypes, shouldShowFileStats, etc.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import type { TagDefinition, ToolType, TagType } from '../types/tag-types';

// ─── Re-exports ─────────────────────────────────────────────────────────
export type { TagDefinition, ToolType, TagType };

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
export { TOOL_ACTION_TYPES } from '@renderer/components/Widgets/Zen/shared/tool-constants';

// ===== EXECUTION STATUS =====
export const EXECUTION_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  ERROR: 'error',
  DONE: 'done',
} as const;

// ===== TERMINAL STATUS =====
export { TERMINAL_STATUS } from '@renderer/components/Widgets/Zen/shared/tool-constants';
export type { TerminalStatus } from '@renderer/components/Widgets/Zen/shared/tool-constants';

// ===== UI CONSTANTS =====
// Moved to constants/ui.ts
import { STREAM_BOX_HEIGHT } from './ui';
export { STREAM_BOX_HEIGHT };

// ===== CORE TAG REGISTRY (cross-module tool calls) =====
/**
 * Tool call dùng chung cho mọi module (markdown, thinking, question, conversation_title) —
 * tự động được phép, không cần xác nhận. Mỗi tool call tự quyết định cách xử lý của nó.
 */
export const CORE_TAG_REGISTRY: Record<string, TagDefinition> = {
  markdown: {
    id: 'markdown',
    features: { clickable: false },
  },
  thinking: {
    id: 'thinking',
    features: { clickable: false },
  },
  question: {
    id: 'question',
    features: { clickable: false },
  },
  conversation_title: {
    id: 'conversation_title',
    title: 'Set Conversation Title',
    features: { clickable: false },
  },
};

// ============= AGGREGATED TAG REGISTRY =============
let _moduleRegistries: Record<string, TagDefinition> = {};
let _perModuleRegistries: Record<string, Record<string, TagDefinition>> = {};

export const injectModuleRegistries = (
  registries: Record<string, TagDefinition>,
  perModule?: Record<string, Record<string, TagDefinition>>,
): void => {
  _moduleRegistries = registries;
  if (perModule) _perModuleRegistries = perModule;
};

export const TAG_REGISTRY = new Proxy({} as Record<string, TagDefinition>, {
  get(_target, prop: string) {
    if (prop in CORE_TAG_REGISTRY) {
      return CORE_TAG_REGISTRY[prop];
    }
    return _moduleRegistries[prop];
  },
  has(_target, prop: string) {
    return prop in CORE_TAG_REGISTRY || prop in _moduleRegistries;
  },
  ownKeys(_target) {
    const keys = new Set([...Object.keys(CORE_TAG_REGISTRY), ...Object.keys(_moduleRegistries)]);
    return Array.from(keys);
  },
  getOwnPropertyDescriptor(_target, prop: string) {
    if (prop in CORE_TAG_REGISTRY || prop in _moduleRegistries) {
      return {
        enumerable: true,
        configurable: true,
      };
    }
    return undefined;
  },
});

// ============= HELPER FUNCTIONS =============

export const getTagDef = (type: string): TagDefinition | undefined => {
  return TAG_REGISTRY[type];
};

/**
 * Lấy tất cả tool call types từ TAG_REGISTRY
 */
export const getAllToolTypes = (): string[] => {
  return Object.keys(TAG_REGISTRY);
};

/**
 * Check if a tool should show file stats after execution
 */
export const shouldShowFileStats = (toolType: string): boolean => {
  return TAG_REGISTRY[toolType]?.features?.showFileStats ?? false;
};

/**
 * Check if a tool should validate fuzzy match before execution
 */
export const shouldValidateFuzzyMatch = (toolType: string): boolean => {
  return TAG_REGISTRY[toolType]?.features?.validateFuzzyMatch ?? false;
};

/**
 * Get timeout (ms) for a tool. Default: 60000ms (60s)
 */
export const getToolTimeout = (toolType: string): number => {
  return TAG_REGISTRY[toolType]?.timeout ?? 60000;
};

/**
 * Check if a tool call is clickable. Default: true unless `features.clickable === false`
 */
export const isToolClickable = (type: string): boolean => {
  const tag = TAG_REGISTRY[type];
  return !!tag && tag.features?.clickable !== false;
};

/**
 * Get the display label for a tool type.
 *
 * Nếu truyền `moduleId`, ưu tiên label khai báo trong registry của ĐÚNG module đó —
 * tránh việc module khác (vd: Recon) ghi đè label của tool trùng tên)
 */
export const getToolLabel = (toolType: string, moduleId?: string | null): string => {
  if (moduleId) {
    const own = _perModuleRegistries[moduleId]?.[toolType]?.title;
    if (own) return own;
  }
  return TAG_REGISTRY[toolType]?.title ?? toolType.toUpperCase().replace(/_/g, ' ');
};

// ============= FILE_MUTATION_TOOLS =============

/**
 * Danh sách các tool có khả năng thay đổi nội dung file trên disk.
 * Dùng cho logic revert, undo, và hiển thị diff summary.
 */
// Lazy getter — TAG_REGISTRY is a Proxy whose module registries are injected
// after module load, so a top-level const would freeze an empty list.
export const getFileMutationTools = (): readonly string[] =>
  Object.entries(TAG_REGISTRY)
    .filter(([_, def]) => def.features?.isFileMutation === true)
    .map(([key]) => key);

export type FileMutationTool = string;
