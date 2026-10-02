/**
 * ------------------------------------------------------------------
 * Report File Storage
 * ------------------------------------------------------------------
 * Ported from internal/repository/emulate/report_file_storage.go.
 * Layout on disk (unchanged from Go server for backward compatibility):
 *   ~/.phantoma/emulate:{targetId}/reports/report:{reportId}/{reportId}.md
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── External 
import fs from 'fs';
import path from 'path';

// ── Local ─
import { getAppDataDir } from '../../config/server.config';
import type { Report } from '../../domain/emulate';

// ─── Helpers ────────────────────────────────────────────────────────────

function getReportsDir(targetID: string): string {
  return path.join(getAppDataDir(), `emulate:${targetID}`, 'reports');
}

function getReportDir(targetID: string, reportID: string): string {
  return path.join(getReportsDir(targetID), `report:${reportID}`);
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
}

// parseTitleFromMarkdown extracts the first "# ..." heading, falling back
// to "Untitled Report" when missing — identical to the Go implementation.
function parseTitleFromMarkdown(content: string): string {
  const firstLine = content.split('\n')[0].trim();
  let title = firstLine.replace(/^#+\s*/, '').trim();
  if (title === '') title = 'Untitled Report';
  return title;
}

// ─── Storage ────────────────────────────────────────────────────────────

export class ReportFileStorage {
  writeReport(targetID: string, reportID: string, content: string): void {
    const dir = getReportDir(targetID, reportID);
    ensureDir(dir);
    const filePath = path.join(dir, `${reportID}.md`);
    fs.writeFileSync(filePath, content, { mode: 0o600 });
  }

  readReport(targetID: string, reportID: string): string | null {
    const filePath = path.join(getReportDir(targetID, reportID), `${reportID}.md`);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf8');
  }

  deleteReport(targetID: string, reportID: string): void {
    const dir = getReportDir(targetID, reportID);
    fs.rmSync(dir, { recursive: true, force: true });
  }

  listReports(targetID: string): Report[] {
    const reportsDir = getReportsDir(targetID);
    if (!fs.existsSync(reportsDir)) return [];

    const entries = fs.readdirSync(reportsDir, { withFileTypes: true });
    const reports: Report[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (!entry.name.startsWith('report:')) continue;

      const reportID = entry.name.slice('report:'.length);
      const content = this.readReport(targetID, reportID);
      if (content === null) continue; // empty/leftover folder → skip

      reports.push({
        id: reportID,
        emulate_target_id: targetID,
        title: parseTitleFromMarkdown(content),
        content,
        file_path: path.join(getReportDir(targetID, reportID), `${reportID}.md`),
        created_at: 0,
        updated_at: 0,
      });
    }

    return reports;
  }
}