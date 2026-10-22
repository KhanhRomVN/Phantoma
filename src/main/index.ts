/**
 * ------------------------------------------------------------------
 * Điểm vào chính
 * ------------------------------------------------------------------
 * Điểm vào tiến trình chính Electron. Khởi tạo logging, trạng thái
 * chia sẻ, IPC handler, phiên proxy và cửa sổ chính.
 *
 * Hàm chính:
 * - app.whenReady() : Thiết lập và khởi chạy ứng dụng
 * - cleanup()       : Dọn dẹp khi tắt máy (tái xuất)
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Electron ──
import { app } from 'electron';

// ── External ──
// Removed @electron-toolkit/utils due to initialization error in dev mode

// ── Node.js ──
import * as path from 'path';
import * as fs from 'fs';

// Setup file logger FIRST to capture all logs
import { setupLogger, logger } from './utils/logger';
setupLogger();

// Import core modules
import { windowManager } from './core/window/WindowManager';

// Import IPC handlers
import {
  setupAppHandlers,
  setupFSHandlers,
  setupDialogHandlers,
  setupWindowHandlers,
  setupTerminalHandlers,
  setupGitHandlers,
  setupTaskHandlers,
  setupLoggerHandlers,
  registerWorkspaceHandlers,
  setupReconHandlers,
  setupMemoryHandlers,
  setupSkillHandlers,
  setupTitleHandlers,
  setupWorkspaceDataHandlers,
  setupDesignHandlers,
  setupConversationHandlers,
} from './ipc';

// Ensure certificate directory exists for http-mitm-proxy
const certDir = path.join(process.cwd(), '.http-mitm-proxy', 'certs');
try {
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }
} catch (e) {
  logger.error('[Cert] Failed to create certificate directory:', e);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  // Setup all IPC handlers
  setupLoggerHandlers();
  setupAppHandlers();
  setupFSHandlers();
  setupDialogHandlers();
  setupWindowHandlers();
  setupTerminalHandlers();
  setupGitHandlers();
  setupTaskHandlers();
  registerWorkspaceHandlers();
  setupReconHandlers(); // Browser automation via recon server
  setupMemoryHandlers();
  setupSkillHandlers();
  setupTitleHandlers();
  setupWorkspaceDataHandlers();
  setupDesignHandlers();
  setupConversationHandlers();

  // Create main window
  windowManager.createMainWindow();

  // Lifecycle: Quit behavior
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (require('electron').BrowserWindow.getAllWindows().length === 0) {
      windowManager.createMainWindow();
    }
  });
});
