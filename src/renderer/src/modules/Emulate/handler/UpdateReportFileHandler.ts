/**
 * ------------------------------------------------------------------
 * UpdateReportFileHandler
 * ------------------------------------------------------------------
 * Cập nhật nội dung file code trong report (đuôi .html, .css, .js).
 * ------------------------------------------------------------------
 */

// ─── Services ──
import { reportFileService } from '../services/report-file.service';

export class UpdateReportFileHandler {
  /**
   * Cập nhật nội dung file code (ghi đè toàn bộ nội dung).
   * @param targetId - ID của target
   * @param reportId - ID của report
   * @param fileName - Tên file cần cập nhật
   * @param content  - Nội dung mới
   */
  public async handle(
    targetId: string,
    reportId: string,
    fileName: string,
    content: string,
  ): Promise<{ text: string }> {
    if (!targetId) return { text: '[update_report_file] Error: target_id is required' };
    if (!reportId) return { text: '[update_report_file] Error: report_id is required' };
    if (!fileName) return { text: '[update_report_file] Error: file_name is required' };
    if (content === undefined) return { text: '[update_report_file] Error: content is required' };

    try {
      await reportFileService.writeFile(targetId, reportId, fileName, content);
      return { text: `[update_report_file] Updated ${fileName} in ${reportId}` };
    } catch (e: any) {
      return { text: '[update_report_file] Error: ' + (e.message || String(e)) };
    }
  }
}