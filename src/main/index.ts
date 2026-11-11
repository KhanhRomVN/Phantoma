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
import { startShellServer, stopServers } from './services/server-spawner';
import { killAllTerminals } from './ipc/terminal.handlers';
import { migrateModuleDirs } from './storage/migrateModuleDirs';
import { stopAllDebug } from './ipc/debug.handlers';

// Import IPC handlers
import {
  setupAppHandlers,
  setupFSHandlers,
  setupDialogHandlers,
  setupWindowHandlers,
  setupTargetLockHandlers,
  setupTerminalHandlers,
  setupGitHandlers,
  setupPullRequestHandlers,
  setupTaskHandlers,
  setupWorkflowHandlers,
  setupLoggerHandlers,
  registerWorkspaceHandlers,
  setupReconHandlers,
  setupMemoryHandlers,
  setupSkillHandlers,
  setupTitleHandlers,
  setupWorkspaceDataHandlers,
  setupDesignHandlers,
  setupConversationHandlers,
  setupRuntimeHandlers,
  setupDebugHandlers,
} from './ipc';
import { registerAgentToolHandlers } from './ipc/agent-tool.handlers';

import { createHash } from 'crypto';

if (!app.isPackaged) {
  const projectHash = createHash('md5').update(process.cwd()).digest('hex').slice(0, 8);
  app.setPath('userData', path.join(app.getPath('appData'), `${app.getName()}-dev-${projectHash}`));
  app.commandLine.appendSwitch('remote-debugging-port', String(40000 + (parseInt(projectHash, 16) % 20000)));
}

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
  migrateModuleDirs();

  // Setup all IPC handlers
  setupLoggerHandlers();
  setupAppHandlers();
  setupFSHandlers();
  setupDialogHandlers();
  setupWindowHandlers();
  setupTargetLockHandlers();
  setupTerminalHandlers();
  setupGitHandlers();
  setupPullRequestHandlers();
  setupTaskHandlers();
  setupWorkflowHandlers();
  registerWorkspaceHandlers();
  setupReconHandlers(); // Browser automation via recon server
  setupMemoryHandlers();
  setupSkillHandlers();
  setupTitleHandlers();
  setupWorkspaceDataHandlers();
  setupDesignHandlers();
  setupConversationHandlers();
  setupRuntimeHandlers();
  setupDebugHandlers();
  registerAgentToolHandlers();

  // Packaged build: spawn shell server (emulate starts on-demand)
  startShellServer()
    .catch((err) => logger.error('[Main] startShellServer failed:', err))
    .finally(() => windowManager.createMainWindow());

  let cleanedUp = false;
  app.on('before-quit', (event) => {
    if (cleanedUp) return;
    cleanedUp = true;
    event.preventDefault();
    stopAllDebug();
    stopServers();
    killAllTerminals()
      .catch((err) => logger.error('[Main] killAllTerminals failed:', err))
      .finally(() => app.quit());
  });

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