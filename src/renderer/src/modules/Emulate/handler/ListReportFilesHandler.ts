/**
 * ------------------------------------------------------------------
 * ListReportFilesHandler
 * ------------------------------------------------------------------
 * Xem danh sách toàn bộ file code (.html, .css, .js) trong một
 * report chỉ định.
 * ------------------------------------------------------------------
 */

// ─── Services ──
import { reportFileService } from '../services/report-file.service';

export class ListReportFilesHandler {
  /**
   * Liệt kê file code của report.
   * @param targetId - ID của target
   * @param reportId - ID của report
   */
  public async handle(targetId: string, reportId: string): Promise<{ text: string }> {
    if (!targetId) {
      return { text: '[list_report_files] Error: target_id is required' };
    }
    if (!reportId) {
      return { text: '[list_report_files] Error: report_id is required' };
    }

    try {
      const files = await reportFileService.listFiles(targetId, reportId);
      if (files.length === 0) {
        return { text: `[list_report_files] ${reportId} (0 files)` };
      }
      const lines = files.map((f) => `- ${f.name}`).join('\n');
      return {
        text: `[list_report_files] ${reportId} (${files.length} files)\n${lines}`,
      };
    } catch (e: any) {
      return { text: '[list_report_files] Error: ' + (e.message || String(e)) };
    }
  }
}