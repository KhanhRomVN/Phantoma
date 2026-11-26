import type { CreateReportParams } from '../parsers/CreateReportParser';
import { emulateApi } from '../services/emulate-api.service';
import { runTool } from '../utils/tool-result.util';

/** Execute create_report tool — gọi emulateApi trực tiếp */
export async function executeCreateReport(
  params: CreateReportParams,
  contextTargetId?: string | null,
): Promise<string | null> {
  return runTool('create_report', async () => {
    if (!params.content || params.content.trim().length === 0) {
      return '[create_report] Error: content is required';
    }
    if (!contextTargetId) return '[create_report] Error: targetId is required';

    const res = await emulateApi.createReport(contextTargetId, {
      emulate_target_id: contextTargetId,
      title: '',
      file_path: '',
      content: params.content,
    });
    if (!res.success) {
      return '[create_report] Error: ' + (res.error || 'Failed to create report');
    }

    window.dispatchEvent(new CustomEvent('report-updated'));
    return `[create_report] Created "${res.data?.title || 'report'}" (ID: ${res.data?.id})`;
  });
}