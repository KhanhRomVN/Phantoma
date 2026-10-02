/**
 * ------------------------------------------------------------------
 * ExecuteCommandHandler
 * ------------------------------------------------------------------
 * Handler cho tool execute_command trong Emulate module.
 * Chạy lệnh shell trong thư mục code của report thông qua runtimeApi.exec (REST tới express-server).
 * Tool này dùng để chạy lệnh bất kỳ trong context của report (vd: node script.js).
 *
 * Main functions:
 * - handle() : Validate command, resolve report folder path, và thực thi qua IPC
 * ------------------------------------------------------------------
 */

import { getReportCodeDir } from '../services/report-file.service';
import { runtimeApi } from '../services/runtime-api.service';

// ─── Types ──────────────────────────────────────────────────────────────
export interface ExecuteCommandResult {
  text: string;
}

// ─── Class ──────────────────────────────────────────────────────────────
export class ExecuteCommandHandler {
  /**
   * Thực thi lệnh shell trong thư mục code của report qua IPC.
   * @param targetId ID của target hiện tại
   * @param reportId ID của report (format: report_X)
   * @param command Lệnh cần chạy
   */
  public async handle(
    targetId: string,
    reportId: string,
    command: string,
  ): Promise<ExecuteCommandResult> {
    if (!command || !command.trim()) {
      return { text: '[execute_command] Error: command is required' };
    }

    if (!reportId || !reportId.trim()) {
      return { text: '[execute_command] Error: report_id is required' };
    }

    try {
      // Resolve thư mục code của report
      const folderPath = await getReportCodeDir(targetId, reportId);

      const execRes = await runtimeApi.exec(command.trim(), folderPath);
      const result = execRes.data as
        { success: boolean; stdout?: string; stderr?: string; error?: string } | undefined;

      if (result?.error) {
        return { text: `[execute_command] Error: ${result.error}` };
      }

      const output = result?.stdout || '';
      const stderr = result?.stderr || '';

      if (stderr && !output) {
        return { text: `[execute_command] ${command}\n${stderr}` };
      }

      return { text: `[execute_command] ${command}\n${output}` };
    } catch (err: any) {
      return { text: `[execute_command] Error: ${err?.message || String(err)}` };
    }
  }
}
