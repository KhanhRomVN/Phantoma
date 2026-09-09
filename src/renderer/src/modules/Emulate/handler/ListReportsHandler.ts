/**
 * ------------------------------------------------------------------
 * ListReportsHandler
 * ------------------------------------------------------------------
 * Liệt kê danh sách report markdown từ backend API (SQLite).
 * Trả về text output dạng phẳng cho tool list_reports.
 *
 * Main methods:
 * - handle() : Lấy danh sách report và format thành text
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Services ──
import { emulateApi } from '../services/emulate-api.service';

// ─── Class ──────────────────────────────────────────────────────────────
export class ListReportsHandler {
  /**
   * Liệt kê report, mỗi dòng: `- report_<n> | <title> | <updatedAt>`.
   * Dùng index 1-indexed để mapping ổn định.
   */
  public async handle(targetId?: string | null): Promise<{ text: string }> {
    if (!targetId) {
      return { text: '[list_reports] Error: targetId is required' };
    }

    const res = await emulateApi.listReports(targetId);
    if (!res.success) {
      return { text: '[list_reports] Error: ' + (res.error || 'Failed to list reports') };
    }

    const reports = res.data || [];
    if (reports.length === 0) {
      return { text: '[list_reports] No reports found' };
    }

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

    return { text: `[list_reports] Total: ${reports.length}\n${lines}` };
  }
}