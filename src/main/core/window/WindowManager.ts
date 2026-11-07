/**
 * ------------------------------------------------------------------
 * Quản lý cửa sổ
 * ------------------------------------------------------------------
 * Tạo và quản lý nhiều BrowserWindow của Electron (giống VSCode).
 * Xử lý kích thước cửa sổ, cấu hình thanh tiêu đề tùy chỉnh, xử lý liên kết ngoài,
 * và logic tải dev/prod. Mỗi cửa sổ có trạng thái độc lập.
 *
 * Hàm chính:
 * - createWindow()     : Tạo và hiển thị một cửa sổ mới
 * - createMainWindow() : Alias của createWindow() (giữ tương thích)
 * - getMainWindow()    : Trả về cửa sổ đang focus (hoặc cửa sổ đầu tiên) hoặc null
 * - getWindows()       : Trả về danh sách tất cả cửa sổ đang mở
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
  private windows = new Set<BrowserWindow>();

  constructor() {}

  createWindow(initialModule?: string): BrowserWindow {
    const win = new BrowserWindow({
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
      icon: join(
        app.isPackaged ? process.resourcesPath : app.getAppPath(),
        'images/phantoma-logo.png',
      ),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true,
        webviewTag: true,
      },
    });

    this.windows.add(win);
    win.on('closed', () => {
      this.windows.delete(win);
    });

    win.on('ready-to-show', () => {
      win.show();
      // Linux workaround: Wait for window to map before maximizing
      setTimeout(() => {
        if (!win.isDestroyed()) win.maximize();
      }, 150);
    });

    // Emit maximize/unmaximize events to renderer
    win.on('maximize', () => {
      if (!win.isDestroyed()) win.webContents.send('window:maximized');
    });
    win.on('unmaximize', () => {
      if (!win.isDestroyed()) win.webContents.send('window:unmaximized');
    });

    win.webContents.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return;

      if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'n') {
        event.preventDefault();
        this.createWindow('settings');
        return;
      }

      if (input.control || input.meta) {
        const zoomIn = input.code === 'Equal' || input.code === 'NumpadAdd';
        const zoomOut = input.code === 'Minus' || input.code === 'NumpadSubtract';
        const zoomReset = input.code === 'Digit0' || input.code === 'Numpad0';
        if (zoomIn || zoomOut || zoomReset) {
          event.preventDefault();
          this.applyZoom(win, zoomIn ? 1 : zoomOut ? -1 : 0);
        }
      }
    });

    win.webContents.on('will-prevent-unload', (event) => {
      const choice = dialog.showMessageBoxSync(win, {
        type: 'warning',
        buttons: ['Leave', 'Stay'],
        defaultId: 1,
        cancelId: 1,
        title: 'Unsaved changes',
        message: 'You have unsaved changes. Leave anyway?',
      });
      if (choice === 0) event.preventDefault();
    });

    win.webContents.on('render-process-gone', (_event, details) => {
      console.error(
        `[WindowManager] Renderer process gone: reason=${details.reason}, exitCode=${details.exitCode}`,
      );
      if (win.isDestroyed()) return;
      win.webContents.send('window:renderer-crashed', {
        reason: details.reason,
        exitCode: details.exitCode,
        timestamp: Date.now(),
      });
    });

    win.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url);
      return { action: 'deny' };
    });

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    const hash = initialModule ? `module=${initialModule}` : undefined;
    if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
      win.loadURL(process.env['ELECTRON_RENDERER_URL'] + (hash ? `#${hash}` : ''));
    } else {
      win.loadFile(join(__dirname, '../renderer/index.html'), hash ? { hash } : undefined);
    }

    return win;
  }

  createMainWindow(): void {
    this.createWindow();
  }

  /** direction: 1 = phóng to, -1 = thu nhỏ, 0 = đặt lại 100% */
  private applyZoom(win: BrowserWindow, direction: number): void {
    if (win.isDestroyed()) return;
    const contents = win.webContents;
    const level =
      direction === 0 ? 0 : Math.min(5, Math.max(-3, contents.getZoomLevel() + direction * 0.5));
    contents.setZoomLevel(level);
    contents.send('window:zoom-changed', Math.round(Math.pow(1.2, level) * 100));
  }

  getWindows(): BrowserWindow[] {
    return [...this.windows];
  }

  getMainWindow(): BrowserWindow | null {
    const focused = BrowserWindow.getFocusedWindow();
    if (focused && this.windows.has(focused)) return focused;
    return this.windows.values().next().value ?? null;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────
export const windowManager = new WindowManager();
