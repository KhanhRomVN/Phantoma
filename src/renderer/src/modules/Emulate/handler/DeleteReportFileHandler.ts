/**
 * ------------------------------------------------------------------
 * DeleteReportFileHandler
 * ------------------------------------------------------------------
 * Xóa file code trong report (đuôi .html, .css, .js).
 * ------------------------------------------------------------------
 */

// ─── Services ──
import { reportFileService } from '../services/report-file.service';

export class DeleteReportFileHandler {
  /**
   * Xóa file code.
   * @param targetId - ID của target
   * @param reportId - ID của report
   * @param fileName - Tên file cần xóa
   */
  public async handle(
    targetId: string,
    reportId: string,
    fileName: string,
  ): Promise<{ text: string }> {
    if (!targetId) return { text: '[delete_report_file] Error: target_id is required' };
    if (!reportId) return { text: '[delete_report_file] Error: report_id is required' };
    if (!fileName) return { text: '[delete_report_file] Error: file_name is required' };

    try {
      await reportFileService.deleteFile(targetId, reportId, fileName);
      return { text: `[delete_report_file] Deleted ${fileName} from ${reportId}` };
    } catch (e: any) {
      return { text: '[delete_report_file] Error: ' + (e.message || String(e)) };
    }
  }
}