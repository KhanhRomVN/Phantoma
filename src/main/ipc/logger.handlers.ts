/**
 * ------------------------------------------------------------------
 * IPC Logger Handlers
 * ------------------------------------------------------------------
 * Cầu nối logging giữa Renderer và Main process. Cho phép frontend gửi
 * các sự kiện log (info, warn, error) xuống backend để ghi vào file
 * log tập trung hoặc console system, đảm bảo tính minh bạch khi debug.
 *
 * Channels:
 * - log:write : Ghi một dòng log từ renderer xuống main process logger
 *
 * Functions:
 * - setupLoggerHandlers() : Entry point đăng ký IPC handler nhóm 'log:'
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