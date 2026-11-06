export type ListReportsParams = Record<string, never>;

/**
 * Parse list_reports tag from AI response.
 * Format: <list_reports /> (no params)
 */
export function parseListReports(_innerContent: string): ListReportsParams {
  return {};
}
