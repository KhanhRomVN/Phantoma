/**
 * ------------------------------------------------------------------
 * Report Resolver Util
 * ------------------------------------------------------------------
 * Tìm report theo `report_<number>` (1-indexed) hoặc id/title/file_path.
 * Dùng chung cho read_report và update_report.
 *
 * Các functions chính:
 * - resolveReport() : Validate tham số rồi lấy report từ backend API
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Services ──
import { emulateApi } from '../services/emulate-api.service';

// ─── Types ──────────────────────────────────────────────────────────────
type Report = NonNullable<Awaited<ReturnType<typeof emulateApi.listReports>>['data']>[number];

export type ReportResolution =
  | { report: Report; targetId: string; error?: undefined }
  | { report?: undefined; targetId?: undefined; error: string };

// ─── Functions ──────────────────────────────────────────────────────────
export async function resolveReport(
  tool: string,
  reportRef: string,
  targetId?: string | null,
): Promise<ReportResolution> {
  if (!reportRef) return { error: `[${tool}] Error: report reference is required` };
  if (!targetId) return { error: `[${tool}] Error: targetId is required` };

  const res = await emulateApi.listReports(targetId);
  if (!res.success) {
    return { error: `[${tool}] Error: ${res.error || 'Failed to list reports'}` };
  }

  const reports = res.data || [];
  const mapping = /^report_(\d+)$/i.exec(reportRef.trim());
  const byIndex = mapping ? reports[parseInt(mapping[1], 10) - 1] : undefined;
  const report =
    byIndex ??
    reports.find((r) => r.id === reportRef || r.title === reportRef || r.file_path === reportRef);

  if (!report) return { error: `[${tool}] Error: report not found: ${reportRef}` };
  return { report, targetId };
}