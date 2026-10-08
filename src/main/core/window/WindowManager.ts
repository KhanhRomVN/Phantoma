/**
 * ------------------------------------------------------------------
 * Quản lý cửa sổ
 * ------------------------------------------------------------------
 * Tạo và quản lý BrowserWindow chính của Electron. Xử lý
 * kích thước cửa sổ, cấu hình thanh tiêu đề tùy chỉnh, xử lý liên kết ngoài,
 * và logic tải dev/prod.
 *
 * Hàm chính:
 * - createMainWindow() : Tạo và hiển thị cửa sổ chính
 * - getMainWindow()    : Trả về tham chiếu cửa sổ hiện tại hoặc null
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Electron ──
import { BrowserWindow, shell } from 'electron';

// ── Node.js ──
import { join } from 'path';

// ── External ──
import { is } from '@electron-toolkit/utils';

// ── Internal ──
import { windowConfig } from '../config/window.config';
import { clearAllTargetProcesses } from '../../shared/state';

// ─── Class ──────────────────────────────────────────────────────────────
export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  /** Cờ phân biệt manual reload (Ctrl+R) vs auto-recovery sau crash */
  private isManualReload = false;

  constructor() {}

  createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: windowConfig.defaultWidth,
      height: windowConfig.defaultHeight,
      minWidth: windowConfig.minWidth,
      minHeight: windowConfig.minHeight,
      show: false,
      frame: false, // Remove default title bar completely
      autoHideMenuBar: true, // Use custom titlebar
      titleBarStyle: 'hidden', // Hide native titlebar
      trafficLightPosition: { x: 20, y: 20 }, // Adjust traffic light position for macOS
      title: windowConfig.title,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true,
        webviewTag: true,
      },
    });

    this.mainWindow.on('ready-to-show', () => {
      this.mainWindow?.show();
      // Linux workaround: Wait for window to map before maximizing
      setTimeout(() => {
        this.mainWindow?.maximize();
      }, 150);

      if (is.dev) {
        // keep window maximized in dev
      }
    });

    // Emit maximize/unmaximize events to renderer
    this.mainWindow.on('maximize', () => {
      this.mainWindow?.webContents.send('window:maximized');
    });
    this.mainWindow.on('unmaximize', () => {
      this.mainWindow?.webContents.send('window:unmaximized');
    });

    // Phát hiện manual reload (Ctrl+R / Cmd+R / F5) để set cờ trước khi did-start-loading fire.
    // Electron bắn keydown trên webContents trước navigation, nên thứ tự là:
    //   keydown → did-start-loading → (reload diễn ra).
    this.mainWindow.webContents.on('before-input-event', (_event, input) => {
      if (input.type !== 'keyDown') return;
      const isReloadShortcut =
        (input.control && input.key.toLowerCase() === 'r') ||
        (input.meta && input.key.toLowerCase() === 'r') ||
        input.key === 'F5';
      if (isReloadShortcut) {
        this.isManualReload = true;
      }
    });

    // Chỉ cleanup target processes khi ĐÚNG LÀ manual reload.
    // Crash recovery (Electron tự reload sau render-process-gone) KHÔNG được giết target —
    // người dùng vẫn muốn capture tiếp tục chạy ngầm trong lúc UI hồi phục.
    this.mainWindow.webContents.on('did-start-loading', () => {
      if (this.isManualReload) {
        clearAllTargetProcesses();
        this.isManualReload = false;
      }
    });

    // Renderer crash (OOM, unhandled exception, v8 fatal…) → log + thông báo renderer,
    // nhưng KHÔNG kill target processes và KHÔNG chủ động reload ở đây
    // (Electron sẽ tự reload nếu enableRemoteModule/reloadAfterCrash được bật ở mức framework).
    this.mainWindow.webContents.on('render-process-gone', (_event, details) => {
      console.error(
        `[WindowManager] Renderer process gone: reason=${details.reason}, exitCode=${details.exitCode}`,
      );
      this.mainWindow?.webContents.send('window:renderer-crashed', {
        reason: details.reason,
        exitCode: details.exitCode,
        timestamp: Date.now(),
      });
    });

    this.mainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url);
      return { action: 'deny' };
    });

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────
export const windowManager = new WindowManager();
