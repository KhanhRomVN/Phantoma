/**
 * ------------------------------------------------------------------
 * Status Tooltip Builder
 * ------------------------------------------------------------------
 * Build tooltip text cho status dot trong TagHeader dựa trên tool type
 * và metadata. Delegates to module-specific formatters instead of hardcoding.
 *
 * Main functions:
 * - buildStatusTooltip() : Build tooltip text từ tool state và metadata
 * ------------------------------------------------------------------
 */

import { getTagDef } from '../constants/tag-registry';
import type {
  StatusTooltipInput,
  CompletedTooltipFormatter,
  DiffStats,
  TooltipMeta,
} from '@renderer/components/RightPanel/Zen/shared/tool-display';

// Module-specific completed tooltip formatters registry
const completedTooltipFormatters: CompletedTooltipFormatter[] = [];

/**
 * Register a module-specific completed tooltip formatter.
 */
export const registerCompletedTooltipFormatter = (
  formatter: CompletedTooltipFormatter,
): void => {
  completedTooltipFormatters.push(formatter);
};

const isCompletedStatus = (statusColor?: string): boolean => {
  if (!statusColor) return false;
  return (
    statusColor.includes('gitDecoration-addedResourceForeground') ||
    statusColor.includes('#3fb950')
  );
};

const isNotStartedStatus = (statusColor?: string): boolean => {
  if (!statusColor) return false;
  return statusColor.includes('descriptionForeground');
};

const buildCompletedTooltip = (
  toolType: string,
  diffStats?: DiffStats,
  tooltipMeta?: TooltipMeta,
): string => {
  // Try module-specific formatters first
  for (const formatter of completedTooltipFormatters) {
    const result = formatter(toolType, diffStats, tooltipMeta);
    if (result !== null) return result;
  }

  // Fallback: generic completed message using tool title from registry
  const toolDef = getTagDef(toolType);
  const toolTitle = toolDef?.title || toolType;
  return `✓ ${toolTitle} completed successfully`;
};

export const buildStatusTooltip = (input: StatusTooltipInput): string => {
  const {
    customTooltip,
    isError,
    isPartial,
    isWaitingApproval,
    statusColor,
    toolType,
    diffStats,
    tooltipMeta,
  } = input;

  if (customTooltip) return customTooltip;
  if (isError) return 'Error - Action failed';
  if (isPartial) return 'In progress...';
  if (isWaitingApproval) return 'Waiting for approval';

  const isCompleted = isCompletedStatus(statusColor);

  if (isCompleted && toolType) {
    return buildCompletedTooltip(toolType, diffStats, tooltipMeta);
  }

  if (isCompleted) {
    return '✓ Completed successfully';
  }

  if (isNotStartedStatus(statusColor)) {
    return isWaitingApproval ? 'Waiting for approval' : 'Not started yet';
  }

  return 'Status';
};