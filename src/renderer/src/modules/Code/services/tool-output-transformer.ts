/**
 * ------------------------------------------------------------------
 * Code Tool Output Transformer
 * ------------------------------------------------------------------
 * Transform tool output for internal storage in Code module.
 * Handles special cases like list_files (parse to array) and view_replace_history.
 * ------------------------------------------------------------------
 */

import type { ToolOutputTransformer } from '@renderer/components/Widgets/Zen/shared/tool-behaviors';

/**
 * Transform output for Code module tools.
 * Returns transformed output or null to use default (store raw cleanOutput).
 */
export const transformCodeToolOutput: ToolOutputTransformer = ({
  action,
  cleanOutput,
  isError,
}) => {
  // list_files: parse to array if valid JSON
  if (action.type === 'list_files' && !isError) {
    try {
      const parsedTree = JSON.parse(cleanOutput);
      return Array.isArray(parsedTree) ? parsedTree : cleanOutput;
    } catch {
      return cleanOutput;
    }
  }

  return null; // Use default (store raw cleanOutput)
};
