/**
 * ------------------------------------------------------------------
 * Process Util
 * ------------------------------------------------------------------
 * Chạy lệnh hệ thống an toàn: dùng execFile (không qua shell), có timeout,
 * ẩn cửa sổ trên Windows, ép locale C để output ổn định khi parse.
 * ------------------------------------------------------------------
 */

import { execFile } from 'child_process';
import { promisify } from 'util';

export const execFileAsync = promisify(execFile);

export interface RunOptions {
  timeoutMs?: number;
  maxBufferBytes?: number;
}

export interface CommandResult {
  ok: boolean;
  /** Exit code; `null` nếu không chạy được (ENOENT, timeout...). */
  code: number | null;
  stdout: string;
  stderr: string;
}

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_BUFFER = 8 * 1024 * 1024;

/** Chạy lệnh, không bao giờ throw — trả cả stdout/stderr/exit code. */
export function runCommandResult(
  file: string,
  args: string[],
  opts: RunOptions = {},
): Promise<CommandResult> {
  return new Promise((resolve) => {
    execFile(
      file,
      args,
      {
        timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        maxBuffer: opts.maxBufferBytes ?? DEFAULT_MAX_BUFFER,
        windowsHide: true,
        env: { ...process.env, LC_ALL: 'C', LANG: 'C' },
      },
      (err, stdout, stderr) => {
        const rawCode = (err as NodeJS.ErrnoException | null)?.code;
        resolve({
          ok: !err,
          code: err ? (typeof rawCode === 'number' ? rawCode : null) : 0,
          stdout: String(stdout ?? ''),
          stderr: String(stderr ?? ''),
        });
      },
    );
  });
}

/** Chạy lệnh và trả stdout; trả chuỗi rỗng nếu lệnh lỗi. */
export async function tryCommand(
  file: string,
  args: string[],
  opts: RunOptions = {},
): Promise<string> {
  const res = await runCommandResult(file, args, opts);
  return res.ok ? res.stdout : '';
}

/** Chạy 1 đoạn PowerShell (Windows) và trả stdout; rỗng nếu lỗi. */
export const tryPowerShell = (script: string, opts: RunOptions = {}): Promise<string> =>
  tryCommand('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
    timeoutMs: 8_000,
    ...opts,
  });

/** Parse JSON từ PowerShell: PowerShell trả object đơn thay vì mảng khi chỉ có 1 phần tử. */
export function parseJsonList<T>(raw: string): T[] {
  const text = raw.trim();
  if (!text) return [];
  try {
    const parsed: unknown = JSON.parse(text);
    return (Array.isArray(parsed) ? parsed : [parsed]) as T[];
  } catch {
    return [];
  }
}
