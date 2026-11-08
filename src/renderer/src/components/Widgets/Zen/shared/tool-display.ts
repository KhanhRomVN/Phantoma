/**
 * ------------------------------------------------------------------
 * Tool Display Types
 * ------------------------------------------------------------------
 * Interface cho module-specific display formatting của tool actions.
 * Mỗi module tự định nghĩa cách hiển thị params của các tool của mình.
 * ------------------------------------------------------------------
 */

import type { ToolAction } from '@renderer/components/Widgets/Zen/feature/Chat/services/responseParser';

export interface TooltipMeta {
  lineCount?: number;
  lineRange?: string;
  matchCount?: number;
  fileCount?: number;
}

export interface DiffStats {
  added: number;
  removed: number;
}

export interface StatusTooltipInput {
  customTooltip?: string;
  isError?: boolean;
  isPartial?: boolean;
  isWaitingApproval?: boolean;
  statusColor?: string;
  toolType?: string;
  diffStats?: DiffStats;
  tooltipMeta?: TooltipMeta;
}

/**
 * Module-specific formatter cho action display string.
 * Return null nếu tool không thuộc module này.
 */
export type ActionDisplayFormatter = (action: ToolAction, moduleId: string) => string | null;

/**
 * Module-specific formatter cho completed tooltip với metadata.
 * Return null nếu tool không thuộc module này hoặc không cần custom formatting.
 */
export type CompletedTooltipFormatter = (
  toolType: string,
  diffStats?: DiffStats,
  tooltipMeta?: TooltipMeta,
) => string | null;
