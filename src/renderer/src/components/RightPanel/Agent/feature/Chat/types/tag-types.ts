/**
 * Định nghĩa kiểu Tag và Tool
 * 
 * File này chứa tất cả định nghĩa kiểu liên quan đến tags, tools và permissions.
 * Được tách từ constants.ts để phân tách trách nhiệm tốt hơn.
 */

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
