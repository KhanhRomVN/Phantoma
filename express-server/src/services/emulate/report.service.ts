/**
 * ------------------------------------------------------------------
 * Report Service
 * ------------------------------------------------------------------
 * Ported from internal/service/emulate/report.go. Reports are file-based;
 * no timestamp stamping is done here because the storage layer derives
 * created_at/updated_at lazily (both stay 0 in the current design).
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Local 
import type { Report, CreateReportInput, UpdateReportInput } from '../../domain/emulate';
import { ReportRepository } from '../../repositories/emulate/report.repository';

// ─── Service ───────────────────────────────────────────────────────────

export class ReportService {
  constructor(private repo: ReportRepository) {}

  getReportsByTarget(targetID: string): Report[] {
    return this.repo.getReportsByTargetID(targetID);
  }

  getReportByID(targetID: string, id: string): Report | null {
    return this.repo.getReportByID(targetID, id);
  }

  createReport(input: CreateReportInput): Report {
    return this.repo.createReport(input);
  }

  updateReport(targetID: string, id: string, input: UpdateReportInput): Report | null {
    return this.repo.updateReport(targetID, id, input);
  }

  deleteReport(targetID: string, id: string): boolean {
    return this.repo.deleteReport(targetID, id);
  }
}