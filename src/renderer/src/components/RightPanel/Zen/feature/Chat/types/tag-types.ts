/**
 * ------------------------------------------------------------------
 * Tag Types
 * ------------------------------------------------------------------
 * Định nghĩa các type cho hệ thống tag và tool.
 * Bao gồm permission types, tag definition, và tool type unions.
 *
 * Main types:
 * - PermissionMode  : Chế độ permission (fullAccess/approval)
 * - TagDefinition   : Cấu trúc metadata cho một tag/tool
 * - ToolType        : Union type cho các tool
 * - TagCategory     : Phân loại tag (tool/ui)
 * ------------------------------------------------------------------
 */

// ─── Types ──────────────────────────────────────────────────────────────
// ============= PERMISSION TYPES =============

export type PermissionMode = "fullAccess" | "approval";
export type PermissionValue = "allow" | "confirm" | "reject" | RegExp;

// ============= TAG TYPES =============

export type TagCategory = "tool" | "ui";

export interface TagDefinition {
  id: string;
  title?: string | null;
  category: TagCategory;

  // Only tools have permissions
  permissions?: {
    approval: PermissionValue;
    fullAccess: PermissionValue;
  };

  timeout?: number;

  features?: {
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
 * Type-safe UI tag type union (only ui tags)
 * This type is computed from TAG_REGISTRY at runtime
 */
export type UITagType = string;

/**
 * Type-safe unified tag type union (all tags)
 * This type is computed from TAG_REGISTRY at runtime
 */
export type TagType = string;
