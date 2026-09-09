/**
 * ------------------------------------------------------------------
 * UpdateReportHandler
 * ------------------------------------------------------------------
 * Cập nhật nội dung report markdown bằng backend API.
 * Cơ chế old_content/new_content giống replace_in_file.
 * Nhận indexing mapping `report_<number>` từ list_reports.
 *
 * Main methods:
 * - handle() : Tìm report theo report_N hoặc id/title, replace content
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Services ──
import { emulateApi } from '../services/emulate-api.service';

// ─── Class ──────────────────────────────────────────────────────────────
export class UpdateReportHandler {
  /**
   * Cập nhật report bằng cơ chế old_content → new_content.
   * @param reportRef  - Indexing mapping `report_<number>`, hoặc id/title
   * @param oldContent - Đoạn nội dung cũ cần thay thế (khớp chính xác)
   * @param newContent - Đoạn nội dung mới
   * @param targetId   - ID của target hiện tại
   */
  public async handle(
    reportRef: string,
    oldContent: string,
    newContent: string,
    targetId?: string | null,
  ): Promise<{ text: string }> {
    if (!reportRef) {
      return { text: '[update_report] Error: report reference is required' };
    }
    if (!oldContent) {
      return { text: '[update_report] Error: old_content is required' };
    }
    if (!targetId) {
      return { text: '[update_report] Error: targetId is required' };
    }

    // Lấy danh sách report để tìm
    const listRes = await emulateApi.listReports(targetId);
    if (!listRes.success) {
      return { text: '[update_report] Error: ' + (listRes.error || 'Failed to list reports') };
    }

    const reports = listRes.data || [];
    let report: (typeof reports)[0] | undefined;

    // Try indexing mapping: report_<number>
    const mappingMatch = /^report_(\d+)$/i.exec(reportRef.trim());
    if (mappingMatch) {
      const idx = parseInt(mappingMatch[1], 10) - 1;
      if (idx >= 0 && idx < reports.length) {
        report = reports[idx];
      }
    }

    // Fallback: id, title, hoặc file_path
    if (!report) {
      report = reports.find(
        (r) => r.id === reportRef || r.title === reportRef || r.file_path === reportRef,
      );
    }

    if (!report) {
      return { text: `[update_report] Error: report not found: ${reportRef}` };
    }

    // Chỉ thay thế lần xuất hiện ĐẦU TIÊN của old_content
    if (!report.content.includes(oldContent)) {
      return { text: '[update_report] Error: old_content not found in report' };
    }

    const newFullContent = report.content.replace(oldContent, newContent);
    const updateRes = await emulateApi.updateReport(targetId, report.id, {
      content: newFullContent,
    });

    if (!updateRes.success) {
      return { text: '[update_report] Error: ' + (updateRes.error || 'Failed to update report') };
    }

    // Dispatch event để UI update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('report-updated'));
    }

    return { text: `[update_report] Updated "${report.title}"` };
  }
}