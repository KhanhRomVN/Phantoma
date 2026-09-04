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

    // Cleanup target processes on renderer reload (Ctrl+R)
    this.mainWindow.webContents.on('did-start-loading', () => {
      clearAllTargetProcesses();
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
