/**
 * ------------------------------------------------------------------
 * ExecuteCommandHandler
 * ------------------------------------------------------------------
 * Handler cho tool execute_command trong Emulate module.
 * Chạy lệnh shell thông qua IPC 'run_command' sẵn có từ main process.
 * Tool này dùng để chạy lệnh bất kỳ (vd: chạy file .js report).
 *
 * Main functions:
 * - handle() : Validate command và thực thi qua IPC
 * ------------------------------------------------------------------
 */

// ─── Types ──────────────────────────────────────────────────────────────
export interface ExecuteCommandResult {
  text: string;
}

// ─── Class ──────────────────────────────────────────────────────────────
export class ExecuteCommandHandler {
  /**
   * Thực thi lệnh shell qua IPC.
   * @param command Lệnh cần chạy
   * @param folderPath Thư mục chạy lệnh (mặc định: workspace root)
   */
  public async handle(command: string, folderPath?: string): Promise<ExecuteCommandResult> {
    if (!command || !command.trim()) {
      return { text: '[execute_command] Error: command is required' };
    }

    try {
      const result = await window.api.invoke('run_command', {
        command: command.trim(),
        cwd: folderPath || undefined,
      });

      if (result?.error) {
        return { text: `[execute_command] Error: ${result.error}` };
      }

      const output = result?.stdout || result?.output || result?.data || '';
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