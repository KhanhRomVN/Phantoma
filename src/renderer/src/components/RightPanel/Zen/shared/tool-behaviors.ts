/**
 * ------------------------------------------------------------------
 * Tool Behaviors Types
 * ------------------------------------------------------------------
 * Interface cho module-specific tool behaviors:
 * - Collapsed state mặc định (initial UI state)
 * - Dangerous command detection
 * - Display formatting helpers
 * ------------------------------------------------------------------
 */

import type { ToolAction } from '@renderer/components/RightPanel/Zen/feature/Chat/services/responseParser';

/**
 * Check if a tool should be initially collapsed in UI.
 * Return true if the tool should start collapsed.
 */
export type ToolCollapseChecker = (action: ToolAction) => boolean;

/**
 * Check if a tool action is dangerous and needs user confirmation.
 * Return { dangerous: true, reason: string } if dangerous.
 */
export type ToolDangerChecker = (action: ToolAction) => {
  dangerous: boolean;
  reason?: string;
};

/**
 * Format tool params for markdown display (e.g., terminal id + command preview).
 * Return formatted string or null to use default.
 */
export type ToolMarkdownFormatter = (action: ToolAction) => string | null;

/**
 * Transform tool output for internal storage.
 * Used for special cases like list_files (parse to array).
 * Return transformed output or null to store raw cleanOutput.
 */
export type ToolOutputTransformer = (params: {
  action: ToolAction;
  cleanOutput: string;
  isError: boolean;
}) => any | null;