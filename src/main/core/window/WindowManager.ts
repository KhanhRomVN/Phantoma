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
import { app, BrowserWindow, dialog, shell } from 'electron';

// ── Node.js ──
import { join } from 'path';

// ── Internal ─
import { windowConfig } from '../config/window.config';
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
      icon: join(app.isPackaged ? process.resourcesPath : app.getAppPath(), 'images/phantoma-logo.png'),
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

      if (!app.isPackaged) {
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
    this.mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return;
      const isReloadShortcut =
        (input.control && input.key.toLowerCase() === 'r') ||
        (input.meta && input.key.toLowerCase() === 'r') ||
        input.key === 'F5';
      if (isReloadShortcut) {
        this.isManualReload = true;
      }

      if (input.control || input.meta) {
        const zoomIn = input.code === 'Equal' || input.code === 'NumpadAdd';
        const zoomOut = input.code === 'Minus' || input.code === 'NumpadSubtract';
        const zoomReset = input.code === 'Digit0' || input.code === 'Numpad0';
        if (zoomIn || zoomOut || zoomReset) {
          event.preventDefault();
          this.applyZoom(zoomIn ? 1 : zoomOut ? -1 : 0);
        }
      }
    });

    this.mainWindow.webContents.on('will-prevent-unload', (event) => {
      const choice = dialog.showMessageBoxSync(this.mainWindow!, {
        type: 'warning',
        buttons: ['Leave', 'Stay'],
        defaultId: 1,
        cancelId: 1,
        title: 'Unsaved changes',
        message: 'You have unsaved changes. Leave anyway?',
      });
      if (choice === 0) event.preventDefault();
    });

    this.mainWindow.webContents.on('did-start-loading', () => {
      if (this.isManualReload) {
        this.isManualReload = false;
      }
    });

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
    if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
      this.mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }
  }

  /** direction: 1 = phóng to, -1 = thu nhỏ, 0 = đặt lại 100% */
  private applyZoom(direction: number): void {
    const contents = this.mainWindow?.webContents;
    if (!contents) return;
    const level =
      direction === 0 ? 0 : Math.min(5, Math.max(-3, contents.getZoomLevel() + direction * 0.5));
    contents.setZoomLevel(level);
    contents.send('window:zoom-changed', Math.round(Math.pow(1.2, level) * 100));
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────
export const windowManager = new WindowManager();
