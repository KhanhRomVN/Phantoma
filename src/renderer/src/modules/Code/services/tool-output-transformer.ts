/**
 * ------------------------------------------------------------------
 * Code Tool Output Transformer
 * ------------------------------------------------------------------
 * Transform tool output for internal storage in Code module.
 * Handles special cases like list_files (parse to array) and view_replace_history.
 * ------------------------------------------------------------------
 */

import type { ToolOutputTransformer } from '@renderer/components/RightPanel/Zen/feature/Chat/types/tool-behaviors';

/**
 * Transform output for Code module tools.
 * Returns transformed output or null to use default (store raw cleanOutput).
 */
export const transformCodeToolOutput: ToolOutputTransformer = ({
  action,
  cleanOutput,
  isError,
}) => {
  // view_replace_history: extract version metadata
  if (action.type === 'view_replace_history' && !isError) {
    const versions = Array.from(
      cleanOutput.matchAll(/\*\*Version (\d+)\*\*\n- Errors: (\d+), Warnings: (\d+)/g),
    ).map((m) => ({
      version: Number(m[1]),
      errorCount: Number(m[2]),
      warningCount: Number(m[3]),
    }));
    return versions.length > 0 ? JSON.stringify(versions) : 'No history';
  }

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