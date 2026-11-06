/**
 * ------------------------------------------------------------------
 * Tool Status Registry
 * ------------------------------------------------------------------
 * Registry cho module-specific tool status checkers.
 * Zen gọi các checker này thay vì hardcode logic kiểm tra tool status.
 * ------------------------------------------------------------------
 */

import type { ToolStatusChecker } from '@renderer/components/RightPanel/Zen/shared/tool-status';

// Module-specific status checkers registry
const statusCheckers: ToolStatusChecker[] = [];

/**
 * Register a module-specific tool status checker.
 */
export const registerToolStatusChecker = (checker: ToolStatusChecker): void => {
  statusCheckers.push(checker);
};

/**
 * Check if a tool is busy using registered checkers.
 * Returns true if any checker reports the tool as busy.
 */
export const isToolBusy: ToolStatusChecker = (context) => {
  for (const checker of statusCheckers) {
    if (checker(context)) return true;
  }
  return false;
};