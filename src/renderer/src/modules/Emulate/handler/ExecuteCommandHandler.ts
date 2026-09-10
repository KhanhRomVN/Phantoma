/**
 * ------------------------------------------------------------------
 * ExecuteCommandHandler
 * ------------------------------------------------------------------
 * Handler cho tool execute_command trong Emulate module.
 * Chạy lệnh shell trong thư mục code của report thông qua IPC 'run_command'.
 * Tool này dùng để chạy lệnh bất kỳ trong context của report (vd: node script.js).
 *
 * Main functions:
 * - handle() : Validate command, resolve report folder path, và thực thi qua IPC
 * ------------------------------------------------------------------
 */

import { getReportCodeDir } from '../services/report-file.service';

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
      console.log('[DEBUG][execute_command] request:', { targetId, reportId, command });
      // Resolve thư mục code của report
      const folderPath = await getReportCodeDir(targetId, reportId);
      console.log('[DEBUG][execute_command] Resolved folder:', folderPath);

      const result = await window.api.invoke('run_command', {
        command: command.trim(),
        cwd: folderPath,
      });
      console.log('[DEBUG][execute_command] raw IPC result:', result);
      console.log('[DEBUG][execute_command] fields:', {
        success: result?.success,
        stdout: result?.stdout,
        stderr: result?.stderr,
        output: result?.output,
        data: result?.data,
        error: result?.error,
      });

      if (result?.error) {
        return { text: `[execute_command] Error: ${result.error}` };
      }

      const output = result?.stdout || result?.output || result?.data || '';
      const stderr = result?.stderr || '';
      console.log('[DEBUG][execute_command] parsed:', {
        outputLength: output.length,
        stderrLength: stderr.length,
      });

      if (stderr && !output) {
        return { text: `[execute_command] ${command}\n${stderr}` };
      }

      return { text: `[execute_command] ${command}\n${output}` };
    } catch (err: any) {
      return { text: `[execute_command] Error: ${err?.message || String(err)}` };
    }
  }
}