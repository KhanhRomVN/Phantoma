/**
 * ------------------------------------------------------------------
 * ReadReportFileHandler
 * ------------------------------------------------------------------
 * Xem nội dung file code trong report (đuôi .html, .css, .js).
 * ------------------------------------------------------------------
 */

// ─── Services ──
import { reportFileService } from '../services/report-file.service';

export class ReadReportFileHandler {
  /**
   * Đọc nội dung file code.
   * @param targetId - ID của target
   * @param reportId - ID của report
   * @param fileName - Tên file cần đọc
   */
  public async handle(
    targetId: string,
    reportId: string,
    fileName: string,
  ): Promise<{ text: string }> {
    if (!targetId) return { text: '[read_report_file] Error: target_id is required' };
    if (!reportId) return { text: '[read_report_file] Error: report_id is required' };
    if (!fileName) return { text: '[read_report_file] Error: file_name is required' };

    try {
      const content = await reportFileService.readFile(targetId, reportId, fileName);
      return {
        text: `[read_report_file] ${fileName} (${content.split('\n').length} lines)\n${content}`,
      };
    } catch (e: any) {
      return { text: '[read_report_file] Error: ' + (e.message || String(e)) };
    }
  }
}