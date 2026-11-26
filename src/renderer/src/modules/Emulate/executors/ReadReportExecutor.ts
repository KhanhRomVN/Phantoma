import type { ReadReportParams } from '../parsers/ReadReportParser';
import { resolveReport } from '../utils/report-resolver.util';
import { runTool } from '../utils/tool-result.util';

/** Execute read_report tool — gọi emulateApi trực tiếp */
export async function executeReadReport(
  params: ReadReportParams,
  contextTargetId?: string | null,
): Promise<string | null> {
  return runTool('read_report', async () => {
    if (!params.report_id) throw new Error('report_id is required');

    const resolved = await resolveReport('read_report', params.report_id, contextTargetId);
    if (resolved.error !== undefined) return resolved.error;

    const { report } = resolved;
    const lines = report.content.split('\n');
    const { start_line, end_line } = params;

    if (start_line !== undefined || end_line !== undefined) {
      const start = Math.max(1, start_line || 1);
      const end = Math.min(lines.length, end_line || lines.length);

      if (start > lines.length) {
        return `[read_report] Error: start_line ${start} exceeds total lines ${lines.length}`;
      }

      const numbered = lines.slice(start - 1, end).map((line, i) => `${start + i}: ${line}`);
      return `[read_report] ${params.report_id} — ${report.title} (lines ${start}-${end} of ${lines.length})\n${numbered.join('\n')}`;
    }

    const numbered = lines.map((line, i) => `${i + 1}: ${line}`);
    return `[read_report] ${params.report_id} — ${report.title} (${lines.length} lines)\n${numbered.join('\n')}`;
  });
}