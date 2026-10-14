/**
 * ------------------------------------------------------------------
 * IPC Dialog & System Handlers
 * ------------------------------------------------------------------
 * Quản lý các tương tác với hệ thống điều hành và giao diện người dùng
 * cấp thấp (Native Dialogs, Notifications, System Info).
 * Tách biệt khỏi logic nghiệp vụ (Business Logic) để dễ dàng mock/test.
 *
 * Channels:
 * - dialog:show-save       : Generic Save Dialog wrapper
 * - system:get-info        : Lấy thông tin OS, Shell, Home Dir
 *
 * Functions:
 * - setupDialogHandlers() : Entry point đăng ký IPC handler nhóm 'dialog:' và 'system:'
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { ipcMain, BrowserWindow, dialog } from 'electron';
import * as os from 'os';
import { logger } from '../utils/logger';

// ─── Helpers ───────────────────────────────────────────────────────────
function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows();
  return windows.length > 0 ? windows[0] : null;
}

// ─── Setup ──────────────────────────────────────────────────────────────
export function setupDialogHandlers(): void {
  // ── Show Save Dialog ──
  ipcMain.handle('dialog:show-save', async (_event, options: any) => {
    try {
      const win = getMainWindow();
      if (!win) return { success: false, canceled: true, error: 'No window' };

      const result = await dialog.showSaveDialog(win, {
        title: options.title || 'Save File As',
        defaultPath: options.defaultPath,
        filters: options.filters,
        properties: options.properties || ['createDirectory'],
      });

      if (!result.canceled && result.filePath) {
        return { success: true, filePath: result.filePath };
      }
      return { success: false, canceled: true };
    } catch (e: any) {
      logger.error('[dialog:show-save] Error:', e);
      return { success: false, error: e.message };
    }
  });

  // ── Get System Info ──
  ipcMain.handle('system:get-info', async () => {
    return {
      os: `${os.platform()} ${os.release()}`,
      arch: os.arch(),
      ide: 'Phantoma (Electron)',
      shell: process.env.SHELL || (os.platform() === 'win32' ? 'powershell' : '/bin/bash'),
      homeDir: os.homedir(),
      cwd: process.cwd(),
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
    };
  });
}
