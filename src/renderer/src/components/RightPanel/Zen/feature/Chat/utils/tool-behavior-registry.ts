/**
 * ------------------------------------------------------------------
 * Tool Behavior Registry
 * ------------------------------------------------------------------
 * Registry cho module-specific tool behaviors.
 * Mỗi module đăng ký các behavior checkers của mình.
 * ------------------------------------------------------------------
 */

import type {
  ToolCollapseChecker,
  ToolDangerChecker,
  ToolMarkdownFormatter,
  ToolOutputTransformer,
} from '../types/tool-behaviors';
import type { ToolAction } from '../services/responseParser';

// ─── Registry State ─────────────────────────────────────────────────────
const collapseCheckers: ToolCollapseChecker[] = [];
const dangerCheckers: ToolDangerChecker[] = [];
const markdownFormatters: ToolMarkdownFormatter[] = [];
const outputTransformers: ToolOutputTransformer[] = [];

// ─── Registration API ───────────────────────────────────────────────────
export const registerToolCollapseChecker = (checker: ToolCollapseChecker): void => {
  collapseCheckers.push(checker);
};

export const registerToolDangerChecker = (checker: ToolDangerChecker): void => {
  dangerCheckers.push(checker);
};

export const registerToolMarkdownFormatter = (formatter: ToolMarkdownFormatter): void => {
  markdownFormatters.push(formatter);
};

export const registerToolOutputTransformer = (transformer: ToolOutputTransformer): void => {
  outputTransformers.push(transformer);
};

// ─── Query API ──────────────────────────────────────────────────────────
/**
 * Check if tool should be initially collapsed.
 * Returns true if ANY checker says it should be collapsed.
 */
export const shouldToolBeCollapsed = (action: ToolAction): boolean => {
  return collapseCheckers.some((check) => check(action));
};

/**
 * Check if tool action is dangerous.
 * Returns first dangerous result, or { dangerous: false } if all safe.
 */
export const checkToolDanger = (
  action: ToolAction,
): { dangerous: boolean; reason?: string } => {
  for (const check of dangerCheckers) {
    const result = check(action);
    if (result.dangerous) return result;
  }
  return { dangerous: false };
};

/**
 * Format tool for markdown display.
 * Returns first non-null result, or null if no formatter handled it.
 */
export const formatToolForMarkdown = (action: ToolAction): string | null => {
  for (const format of markdownFormatters) {
    const result = format(action);
    if (result !== null) return result;
  }
  return null;
};

/**
 * Transform tool output for storage.
 * Returns first non-null result, or null to use default (store raw cleanOutput).
 */
export const transformToolOutput = (params: {
  action: ToolAction;
  cleanOutput: string;
  isError: boolean;
}): any | null => {
  for (const transformer of outputTransformers) {
    const result = transformer(params);
    if (result !== null) return result;
  }
  return null;
};