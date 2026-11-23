/**
 * ------------------------------------------------------------------
 * Tag Types
 * ------------------------------------------------------------------
 * Định nghĩa các type cho hệ thống tag và tool.
 * Bao gồm tag definition và tool type unions.
 *
 * Main types:
 * - TagDefinition   : Cấu trúc metadata cho một tag/tool
 * - ToolType        : Union type cho các tool
 * - TagCategory     : Phân loại tag (tool/ui)
 * ------------------------------------------------------------------
 */

// ─── Types ──────────────────────────────────────────────────────────────
// ============= TAG TYPES =============

export interface TagDefinition {
  id: string;
  title?: string | null;
  timeout?: number;

  features?: {
    /** `false` = click vào tool call không kích hoạt gì. Mặc định (bỏ trống) = clickable. */
    clickable?: boolean;
    showFileStats?: boolean;
    validateFuzzyMatch?: boolean;
    isFileMutation?: boolean;
  };

  params?: {
    required: string[];
    optional?: string[];
  };
}

/**
 * Type-safe tool type union (only tools)
 * This type is computed from TAG_REGISTRY at runtime
 */
export type ToolType = string;

/**
 * Type-safe unified tag type union (all tool calls)
 * This type is computed from TAG_REGISTRY at runtime
 */
export type TagType = string;
