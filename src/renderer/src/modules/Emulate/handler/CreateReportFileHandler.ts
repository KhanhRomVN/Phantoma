/**
 * ------------------------------------------------------------------
 * CreateReportFileHandler
 * ------------------------------------------------------------------
 * Tạo file code mới hoàn toàn trong report (đuôi .html, .css, .js).
 * ------------------------------------------------------------------
 */

// ─── Services ──
import { reportFileService } from '../services/report-file.service';

export class CreateReportFileHandler {
  /**
   * Tạo file code mới.
   * @param targetId - ID của target
   * @param reportId - ID của report
   * @param fileName - Tên file (ví dụ: index.html)
   * @param content  - Nội dung file
   */
  public async handle(
    targetId: string,
    reportId: string,
    fileName: string,
    content: string,
  ): Promise<{ text: string }> {
    if (!targetId) return { text: '[create_report_file] Error: target_id is required' };
    if (!reportId) return { text: '[create_report_file] Error: report_id is required' };
    if (!fileName) return { text: '[create_report_file] Error: file_name is required' };

    try {
      await reportFileService.writeFile(targetId, reportId, fileName, content || '');
      return { text: `[create_report_file] Created ${fileName} in ${reportId}` };
    } catch (e: any) {
      return { text: '[create_report_file] Error: ' + (e.message || String(e)) };
    }
  }
}