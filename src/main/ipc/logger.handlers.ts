/**
 * ------------------------------------------------------------------
 * IPC handler logger
 * ------------------------------------------------------------------
 * Nhận các mục log từ tiến trình renderer và ghi chúng
 * vào file log của tiến trình chính.
 *
 * Hàm chính:
 * - setupLoggerHandlers() : Đăng ký IPC handler log:
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Electron ──
import { ipcMain } from 'electron';

// ── Internal ──
import { writeLogFromRenderer } from '../utils/logger';

// ─── Functions ──────────────────────────────────────────────────────────
export function setupLoggerHandlers(): void {
  ipcMain.handle('log:write', (_event, level: string, ...args: any[]) => {
    writeLogFromRenderer(level, args);
  });
}