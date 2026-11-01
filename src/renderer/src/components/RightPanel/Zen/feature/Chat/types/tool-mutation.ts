/**
 * ------------------------------------------------------------------
 * Tool Mutation Types
 * ------------------------------------------------------------------
 * Interface cho các tool có khả năng thay đổi filesystem/state.
 * ------------------------------------------------------------------
 */

import type { ToolAction } from '../services/responseParser';

/**
 * Check if a tool mutates files/state.
 * Used for insights, stats, and revert preview.
 */
export type ToolMutationChecker = (action: ToolAction) => {
  mutates: boolean;
  mutationType?: 'create' | 'modify' | 'delete';
};

/**
 * Extract file path from a tool action.
 */
export type FilePathExtractor = (action: ToolAction) => string | null;

/**
 * Check if a tool needs single-line content review.
 * Returns true if content should be reviewed before execution.
 */
export type SingleLineReviewChecker = (action: ToolAction) => boolean;

/**
 * Calculate additions/deletions for a file mutation tool.
 */
export type DiffCalculator = (action: ToolAction) => {
  additions: number;
  deletions: number;
} | null;

/**
 * Extract diff stats from raw XML/JSON content.
 * Used for streaming/incomplete messages where parsed actions not available.
 */
export type RawContentDiffExtractor = (content: string) => Map<
  string,
  { additions: number; deletions: number }
>;