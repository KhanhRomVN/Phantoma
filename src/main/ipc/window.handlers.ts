/**
 * ------------------------------------------------------------------
 * IPC Window Control Handlers
 * ------------------------------------------------------------------
 * Điều khiển hành vi của khung cửa sổ ứng dụng (Frameless/Custom Titlebar support).
 * Cho phép Renderer gửi lệnh minimize, maximize, restore, close và query
 * trạng thái hiện tại của BrowserWindow tập trung.
 *
 * Channels:
 * - window:minimize   : Thu nhỏ cửa sổ hiện tại
 * - window:maximize   : Phóng to cửa sổ hiện tại
 * - window:unmaximize : Khôi phục kích thước bình thường sau khi maximize
 * - window:close      : Đóng cửa sổ hiện tại
 * - window:isMaximized: Kiểm tra xem cửa sổ có đang ở chế độ maximize hay không
 *
 * Functions:
 * - setupWindowHandlers() : Entry point đăng ký IPC handler nhóm 'window:'
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Electron ──
import { BrowserWindow, ipcMain } from 'electron';

// ─── Functions ──────────────────────────────────────────────────────────
export function setupWindowHandlers(): void {
  // Minimize window
  ipcMain.handle('window:minimize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      win.minimize();
    }
  });

  // Maximize window
  ipcMain.handle('window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      win.maximize();
    }
  });

  // Unmaximize window (restore)
  ipcMain.handle('window:unmaximize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      win.unmaximize();
    }
  });

  // Close window
  ipcMain.handle('window:close', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      win.close();
    }
  });

  // Check if window is maximized
  ipcMain.handle('window:isMaximized', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      return win.isMaximized();
    }
    return false;
  });
}