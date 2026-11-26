import type { UpdateReportParams } from '../parsers/UpdateReportParser';
import { emulateApi } from '../services/emulate-api.service';
import { resolveReport } from '../utils/report-resolver.util';
import { runTool } from '../utils/tool-result.util';

/** Execute update_report tool — gọi emulateApi trực tiếp */
export async function executeUpdateReport(
  params: UpdateReportParams,
  contextTargetId?: string | null,
): Promise<string | null> {
  return runTool('update_report', async () => {
    if (!params.report_ref) throw new Error('report_ref is required');
    if (!params.old_content) throw new Error('old_content is required');

    const resolved = await resolveReport('update_report', params.report_ref, contextTargetId);
    if (resolved.error !== undefined) return resolved.error;

    const { report, targetId } = resolved;
    if (!report.content.includes(params.old_content)) {
      return '[update_report] Error: old_content not found in report';
    }

    const updateRes = await emulateApi.updateReport(targetId, report.id, {
      content: report.content.replace(params.old_content, params.new_content || ''),
    });
    if (!updateRes.success) {
      return '[update_report] Error: ' + (updateRes.error || 'Failed to update report');
    }

    window.dispatchEvent(new CustomEvent('report-updated'));
    return `[update_report] Updated "${report.title}"`;
  });
}