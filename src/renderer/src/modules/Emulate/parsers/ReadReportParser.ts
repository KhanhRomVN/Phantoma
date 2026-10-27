import { extractParamValue } from '@renderer/components/RightPanel/Zen/feature/Chat/utils/ToolParser';
import type { ReadReportParams } from '@renderer/components/RightPanel/Zen/feature/Chat/types/tool-types';

/**
 * Parse read_report tag from AI response.
 * Format: <read_report><report_id>report_1</report_id><start_line>1</start_line><end_line>50</end_line></read_report>
 */
export function parseReadReport(innerContent: string): ReadReportParams {
  const params: ReadReportParams = { report_id: '' };

  const reportIdParam = extractParamValue(innerContent, 'report_id');
  if (reportIdParam) params.report_id = reportIdParam.trim();

  const startLineParam = extractParamValue(innerContent, 'start_line');
  if (startLineParam) {
    const parsed = parseInt(startLineParam, 10);
    if (!isNaN(parsed)) params.start_line = parsed;
  }

  const endLineParam = extractParamValue(innerContent, 'end_line');
  if (endLineParam) {
    const parsed = parseInt(endLineParam, 10);
    if (!isNaN(parsed)) params.end_line = parsed;
  }

  return params;
}
