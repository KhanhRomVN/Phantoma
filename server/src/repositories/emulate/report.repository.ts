/**
 * ------------------------------------------------------------------
 * Report Repository
 * ------------------------------------------------------------------
 * Ported from internal/repository/emulate/report.go. Reports are stored
 * as markdown files on disk via ReportFileStorage — no SQLite table for
 * reports (the legacy emulate_reports table was dropped in migration v5).
 * ------------------------------------------------------------------
 */

// ─── Imports ───────────────────────────────────────────────────────────
// ── External 
import crypto from 'crypto';

// ── Local ─
import type {
  Report,
  CreateReportInput,
  UpdateReportInput,
} from '../../domain/emulate';
import { ReportFileStorage } from './report-file-storage';

// ─── Helpers ───────────────────────────────────────────────────────────

function generateUUID(): string {
  return crypto.randomUUID();
}

// ─── Repository ────────────────────────────────────────────────────────

export class ReportRepository {
  private fileStorage = new ReportFileStorage();

  getReportsByTargetID(targetID: string): Report[] {
    return this.fileStorage.listReports(targetID);
  }

  getReportByID(targetID: string, reportID: string): Report | null {
    const content = this.fileStorage.readReport(targetID, reportID);
    if (content === null) return null;

    return {
      id: reportID,
      emulate_target_id: targetID,
      title: extractTitle(content),
      content,
      file_path: `~/.phantoma/emulate:${targetID}/reports/report:${reportID}/${reportID}.md`,
      created_at: 0,
      updated_at: 0,
    };
  }

  createReport(input: CreateReportInput): Report {
    const reportID = generateUUID();
    this.fileStorage.writeReport(input.emulate_target_id, reportID, input.content);

    return {
      id: reportID,
      emulate_target_id: input.emulate_target_id,
      title: extractTitle(input.content),
      content: input.content,
      file_path: `~/.phantoma/emulate:${input.emulate_target_id}/reports/report:${reportID}/${reportID}.md`,
      created_at: 0,
      updated_at: 0,
    };
  }

  updateReport(targetID: string, reportID: string, input: UpdateReportInput): Report | null {
    this.fileStorage.writeReport(targetID, reportID, input.content);
    return this.getReportByID(targetID, reportID);
  }

  deleteReport(targetID: string, reportID: string): boolean {
    const existing = this.getReportByID(targetID, reportID);
    if (!existing) return false;
    this.fileStorage.deleteReport(targetID, reportID);
    return true;
  }
}

function extractTitle(content: string): string {
  const firstLine = content.split('\n')[0].trim();
  let title = firstLine.replace(/^#+\s*/, '').trim();
  return title || 'Untitled Report';
}