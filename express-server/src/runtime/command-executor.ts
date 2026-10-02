/**
 * ------------------------------------------------------------------
 * Command Executor (port từ execCommand trong renderer.handlers.ts)
 * ------------------------------------------------------------------
 */

import { exec as execCallback } from 'child_process';

export interface ExecResult {
  success: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
}

export function execCommand(command: string, cwd: string): Promise<ExecResult> {
  return new Promise((resolve) => {
    execCallback(
      command,
      { cwd, timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          resolve({ success: false, error: error.message, stdout, stderr });
        } else {
          resolve({ success: true, stdout, stderr });
        }
      },
    );
  });
}