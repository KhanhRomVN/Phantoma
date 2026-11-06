import { emulateApi } from '../services/emulate-api.service';
import { runTool } from '../utils/tool-result.util';

/** Execute list_reports tool — gọi emulateApi trực tiếp */
export async function executeListReports(contextTargetId?: string | null): Promise<string | null> {
  return runTool('list_reports', async () => {
    if (!contextTargetId) return '[list_reports] Error: targetId is required';

    const res = await emulateApi.listReports(contextTargetId);
    if (!res.success) {
      return '[list_reports] Error: ' + (res.error || 'Failed to list reports');
    }

    const reports = res.data || [];
    if (reports.length === 0) return '[list_reports] No reports found';

    const lines = reports
      .map((r, i) => {
        const date = new Date(r.updated_at * 1000).toLocaleString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
        return `- report_${i + 1} | ${r.title} | ${date}`;
      })
      .join('\n');

    return `[list_reports] Total: ${reports.length}\n${lines}`;
  });
}