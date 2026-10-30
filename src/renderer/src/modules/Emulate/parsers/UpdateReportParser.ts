import { extractParamValue } from '@renderer/components/RightPanel/Zen/feature/Chat/utils/ToolParser';
import type { UpdateReportParams } from '@renderer/components/RightPanel/Zen/feature/Chat/types/tool-types';

/**
 * Parse update_report tag from AI response.
 * Format: <update_report><report_ref>report_1</report_ref>...</update_report>
 */
export function parseUpdateReport(innerContent: string): UpdateReportParams {
  const params: UpdateReportParams = {
    report_ref: '',
    old_content: '',
    new_content: '',
  };

  const reportRefParam = extractParamValue(innerContent, 'report_ref');
  if (reportRefParam) params.report_ref = reportRefParam.trim();

  const oldParam = extractParamValue(innerContent, 'old_content');
  if (oldParam) params.old_content = oldParam;

  const newParam = extractParamValue(innerContent, 'new_content');
  if (newParam) params.new_content = newParam;

  return params;
}
