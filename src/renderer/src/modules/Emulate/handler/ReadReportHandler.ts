/**
 * ------------------------------------------------------------------
 * ReadReportHandler
 * ------------------------------------------------------------------
 * Đọc nội dung report markdown từ backend API (SQLite).
 * Hỗ trợ đọc toàn bộ hoặc một đoạn bằng start_line/end_line.
 *
 * Main methods:
 * - handle() : Tìm report theo report_<number> hoặc id/title, đọc content
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Services ──
import { emulateApi } from '../services/emulate-api.service';

// ─── Class ──────────────────────────────────────────────────────────────
export class ReadReportHandler {
  /**
   * Đọc nội dung report.
   * @param reportRef  - Indexing mapping `report_<number>`, hoặc id/title/file_path
   * @param startLine  - Dòng bắt đầu (1-indexed, optional)
   * @param endLine    - Dòng kết thúc (1-indexed, optional)
   * @param targetId   - ID của target hiện tại
   */
  public async handle(
    reportRef: string,
    startLine?: number,
    endLine?: number,
    targetId?: string | null,
  ): Promise<{ text: string }> {
    if (!reportRef) {
      return { text: '[read_report] Error: report reference is required' };
    }
    if (!targetId) {
      return { text: '[read_report] Error: targetId is required' };
    }

    // Lấy danh sách report để tìm
    const listRes = await emulateApi.listReports(targetId);
    if (!listRes.success) {
      return { text: '[read_report] Error: ' + (listRes.error || 'Failed to list reports') };
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
      return { text: `[read_report] Error: report not found: ${reportRef}` };
    }

    // Áp dụng line range nếu có
    const lines = report.content.split('\n');
    let outputLines: string[];

    if (startLine !== undefined || endLine !== undefined) {
      const start = Math.max(1, startLine || 1);
      const end = Math.min(lines.length, endLine || lines.length);

      if (start > lines.length) {
        return { text: `[read_report] Error: start_line ${start} exceeds total lines ${lines.length}` };
      }

      outputLines = lines.slice(start - 1, end).map((line, i) => `${start + i}: ${line}`);
      return {
        text: `[read_report] ${reportRef} — ${report.title} (lines ${start}-${end} of ${lines.length})\n${outputLines.join('\n')}`,
      };
    }

    // Toàn bộ nội dung
    outputLines = lines.map((line, i) => `${i + 1}: ${line}`);
    return {
      text: `[read_report] ${reportRef} — ${report.title} (${lines.length} lines)\n${outputLines.join('\n')}`,
    };
  }
}