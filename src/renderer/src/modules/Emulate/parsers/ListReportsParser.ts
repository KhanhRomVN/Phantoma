import type { ListReportsParams } from '@renderer/components/RightPanel/Zen/feature/Chat/types/tool-types';

/**
 * Parse list_reports tag from AI response.
 * Format: <list_reports /> (no params)
 */
export function parseListReports(_innerContent: string): ListReportsParams {
  return {};
}
