/**
 * ------------------------------------------------------------------
 * Action Display Formatter
 * ------------------------------------------------------------------
 * Format tool action thành display string cho UI.
 * Delegates to module-specific formatters instead of hardcoding tool names.
 *
 * Main functions:
 * - formatActionForDisplay() : Format ToolAction thành display string
 * ------------------------------------------------------------------
 */

import { getToolLabel } from '../constants/tag-registry';
import type { ToolAction } from '../services/responseParser';
import type { ActionDisplayFormatter } from '@renderer/components/RightPanel/Zen/shared/tool-display';

// Module-specific formatters registry
const moduleFormatters = new Map<string, ActionDisplayFormatter>();

/**
 * Register a module-specific action display formatter.
 */
export const registerActionDisplayFormatter = (
  moduleId: string,
  formatter: ActionDisplayFormatter,
): void => {
  moduleFormatters.set(moduleId, formatter);
};

/**
 * Format tool action for display.
 * Tries module-specific formatter first, falls back to generic label.
 */
export const formatActionForDisplay = (action: ToolAction, moduleId?: string): string => {
  // Try module-specific formatter
  if (moduleId) {
    const formatter = moduleFormatters.get(moduleId);
    if (formatter) {
      const result = formatter(action, moduleId);
      if (result !== null) return result;
    }
  }

  // Fallback: generic label from registry
  return getToolLabel(action.type, moduleId);
};