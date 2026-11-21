import { extractParamValue } from '@renderer/components/Widgets/Zen/feature/Chat/utils/toolParser';
export interface CreateReportParams {
  content: string;
}

/**
 * Parse create_report tag from AI response.
 * Format: <create_report><content>...</content></create_report>
 */
export function parseCreateReport(innerContent: string): CreateReportParams {
  const params: CreateReportParams = { content: '' };

  const contentParam = extractParamValue(innerContent, 'content');
  if (contentParam) params.content = contentParam;

  return params;
}
