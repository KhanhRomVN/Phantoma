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
import type {
  TagCategory,
  TagDefinition,
  ToolType,
  UITagType,
  TagType,
} from '../types/tag-types';

// ─── Re-exports ─────────────────────────────────────────────────────────
export type { TagCategory, TagDefinition, ToolType, UITagType, TagType };

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

// ===== UI CONSTANTS =====
/** Chiều cao mặc định cho khung hiển thị streaming output */
export const STREAM_BOX_HEIGHT = 154;

// ===== SHARED TAG REGISTRY (UI tags only) =====
export const SHARED_TAG_REGISTRY: Record<string, TagDefinition> = {
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

// ===== CORE TOOL REGISTRY (cross-module tools) =====
/**
 * Tools that are not specific to any module but are shared across all features.
 * These tools are automatically allowed and don't require user confirmation.
 */
export const CORE_TOOL_REGISTRY: Record<string, TagDefinition> = {
  conversation_title: {
    id: 'conversation_title',
    category: 'ui',
    title: 'Set Conversation Title',
  },
};

// ============= AGGREGATED TAG REGISTRY =============
/**
 * TAG_REGISTRY tổng hợp từ:
 * - SHARED_TAG_REGISTRY: UI tags (markdown, thinking, question)
 * - CORE_TOOL_REGISTRY: Cross-module tools (conversation_title, etc.)
 * - Module tag registries: Được inject từ ModuleRegistry sau khi modules được register
 *
 * Note: To avoid circular dependency, module registries are injected via injectModuleRegistries()
 * after modules are registered in ModuleRegistry.
 */
let _moduleRegistries: Record<string, TagDefinition> = {};
let _perModuleRegistries: Record<string, Record<string, TagDefinition>> = {};

/**
 * Inject module tag registries from ModuleRegistry.
 * Called by ModuleRegistry after all modules are registered.
 *
 * @param registries  Registry hợp nhất (fallback toàn cục, module sau đè module trước)
 * @param perModule   Registry RIÊNG theo từng module — dùng để tránh trường hợp các module
 *                    trùng tên tool (read_file, list_files, ...) đè label của nhau.
 */
export const injectModuleRegistries = (
  registries: Record<string, TagDefinition>,
  perModule?: Record<string, Record<string, TagDefinition>>,
): void => {
  _moduleRegistries = registries;
  if (perModule) _perModuleRegistries = perModule;
};

export const TAG_REGISTRY = new Proxy(
  {} as Record<string, TagDefinition>,
  {
    get(_target, prop: string) {
      if (prop in SHARED_TAG_REGISTRY) {
        return SHARED_TAG_REGISTRY[prop];
      }
      if (prop in CORE_TOOL_REGISTRY) {
        return CORE_TOOL_REGISTRY[prop];
      }
      return _moduleRegistries[prop];
    },
    has(_target, prop: string) {
      return prop in SHARED_TAG_REGISTRY || prop in CORE_TOOL_REGISTRY || prop in _moduleRegistries;
    },
    ownKeys(_target) {
      const keys = new Set([
        ...Object.keys(SHARED_TAG_REGISTRY),
        ...Object.keys(CORE_TOOL_REGISTRY),
        ...Object.keys(_moduleRegistries),
      ]);
      return Array.from(keys);
    },
    getOwnPropertyDescriptor(_target, prop: string) {
      if (prop in SHARED_TAG_REGISTRY || prop in CORE_TOOL_REGISTRY || prop in _moduleRegistries) {
        return {
          enumerable: true,
          configurable: true,
        };
      }
      return undefined;
    },
  },
);

// ============= HELPER FUNCTIONS =============

/**
 * Lấy tag definition từ TAG_REGISTRY
 */
export const getTagDef = (type: string): TagDefinition | undefined => {
  return TAG_REGISTRY[type];
};

/**
 * Lấy tất cả tool types từ TAG_REGISTRY
 */
export const getAllToolTypes = (): string[] => {
  return Object.entries(TAG_REGISTRY)
    .filter(([_, def]) => def.category === 'tool')
    .map(([key]) => key);
};

/**
 * Lấy tất cả UI tag types từ TAG_REGISTRY
 */
export const getAllUITagTypes = (): string[] => {
  return Object.entries(TAG_REGISTRY)
    .filter(([_, def]) => def.category === 'ui')
    .map(([key]) => key);
};

/**
 * Lấy tất cả tag types từ TAG_REGISTRY
 */
export const getAllTagTypes = (): string[] => {
  return Object.keys(TAG_REGISTRY);
};

/**
 * Check if a tool should show file stats after execution
 */
export const shouldShowFileStats = (toolType: string): boolean => {
  const tag = TAG_REGISTRY[toolType];
  return tag?.category === 'tool' ? (tag.features?.showFileStats ?? false) : false;
};

/**
 * Check if a tool should validate fuzzy match before execution
 */
export const shouldValidateFuzzyMatch = (toolType: string): boolean => {
  const tag = TAG_REGISTRY[toolType];
  return tag?.category === 'tool' ? (tag.features?.validateFuzzyMatch ?? false) : false;
};

/**
 * Get timeout (ms) for a tool. Default: 60000ms (60s)
 */
export const getToolTimeout = (toolType: string): number => {
  const tag = TAG_REGISTRY[toolType];
  return tag?.category === 'tool' ? (tag.timeout ?? 60000) : 60000;
};

/**
 * Check if a tool type is clickable (i.e., it's a tool, not a UI tag)
 */
export const isToolClickable = (type: string): boolean => {
  const tag = TAG_REGISTRY[type];
  return tag?.category === 'tool';
};

/**
 * Get the display label for a tool type.
 *
 * Nếu truyền `moduleId`, ưu tiên label khai báo trong registry của ĐÚNG module đó —
 * tránh việc module khác (vd: Recon) ghi đè label của tool trùng tên (vd: read_file).
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