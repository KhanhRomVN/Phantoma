import { extractParamValue } from '@renderer/components/RightPanel/Zen/feature/Chat/utils/ToolParser';
import type { CreateReportParams } from '@renderer/components/RightPanel/Zen/feature/Chat/types/tool-types';

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
