/**
 * ------------------------------------------------------------------
 * IPC Window Control Handlers
 * ------------------------------------------------------------------
 * Điều khiển hành vi của khung cửa sổ ứng dụng (Frameless/Custom Titlebar support).
 * Cho phép Renderer gửi lệnh minimize, maximize, restore, close và query
 * trạng thái hiện tại của BrowserWindow gửi yêu cầu (hỗ trợ nhiều cửa sổ).
 *
 * Channels:
 * - window:minimize   : Thu nhỏ cửa sổ gửi yêu cầu
 * - window:maximize   : Phóng to cửa sổ gửi yêu cầu
 * - window:unmaximize : Khôi phục kích thước bình thường sau khi maximize
 * - window:close      : Đóng cửa sổ gửi yêu cầu (đóng cửa sổ cuối cùng thì thoát app)
 * - window:isMaximized: Kiểm tra xem cửa sổ có đang ở chế độ maximize hay không
 * - window:new        : Mở một cửa sổ mới
 *
 * Functions:
 * - setupWindowHandlers() : Entry point đăng ký IPC handler nhóm 'window:'
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Electron ──
import { app, BrowserWindow, ipcMain } from 'electron';

// ── Internal ──
import { windowManager } from '../core/window/WindowManager';

// ─── Functions ──────────────────────────────────────────────────────────
export function setupWindowHandlers(): void {
  const senderWindow = (sender: Electron.WebContents): BrowserWindow | null =>
    BrowserWindow.fromWebContents(sender) ?? BrowserWindow.getFocusedWindow();

  // Minimize window
  ipcMain.handle('window:minimize', (event) => {
    senderWindow(event.sender)?.minimize();
  });

  // Maximize window
  ipcMain.handle('window:maximize', (event) => {
    senderWindow(event.sender)?.maximize();
  });

  // Unmaximize window (restore)
  ipcMain.handle('window:unmaximize', (event) => {
    senderWindow(event.sender)?.unmaximize();
  });

  // Open a new window
  ipcMain.handle('window:new', () => {
    windowManager.createWindow();
  });

  // Close window
  ipcMain.handle('window:close', (event) => {
    const win = senderWindow(event.sender);
    if (BrowserWindow.getAllWindows().length > 1) {
      win?.destroy();
      return;
    }
    win?.destroy();
    app.quit();
    // ASSUMED: nếu app.quit() bị treo (tiến trình con, before-quit chặn) thì ép thoát sau 1.5s
    setTimeout(() => {
      app.exit(0);
      process.kill(process.pid, 'SIGKILL');
    }, 1500);
  });

  // Check if window is maximized
  ipcMain.handle('window:isMaximized', (event) => {
    return senderWindow(event.sender)?.isMaximized() ?? false;
  });
}