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
import { app, BrowserWindow } from 'electron';

// ── External ──
import { electronApp, optimizer } from '@electron-toolkit/utils';

// ── Node.js ──
import * as path from 'path';
import * as fs from 'fs';

// Setup file logger FIRST to capture all logs
import { setupLogger, logger } from './utils/logger';
setupLogger();

// Import shared state
import { proxyManager } from './shared/proxy-state';
import { wsManager } from './shared/ws-state';

// Import core modules
import { windowManager } from './core/window/WindowManager';
import { setupEventHandlers } from './core/events';
import { mediaCache } from './proxy/mediaCache';
import { cdpManager } from './features/cdp';

// Import lifecycle
import { setupLifecycleHandlers, cleanup } from './lifecycle';

// Import server manager (khởi động express-server chung)
import { startServer } from './server-manager';

// Import protocol handlers
import { registerMediaScheme, registerMediaProtocol } from './protocol-handlers';

// Register media protocol scheme (must be done before app ready)
registerMediaScheme();
// Import IPC handlers
import {
  setupProxyHandlers,
  setupCDPHandlers,
  setupAppHandlers,
  setupSessionHandlers,
  setupFSHandlers,
  setupTLSHandlers,
  setupRendererHandlers,
  setupMobileHandlers,
  setupConversationHandlers,
  setupWindowHandlers,
  setupTerminalHandlers,
  setupGitHandlers,
  setupTaskHandlers,
  setupLoggerHandlers,
  setupBrowserHandlers,
  setupTargetHandlers,
  setupCliCaptureHandlers,
  closeAllBrowserSessions,
  registerWorkspaceHandlers,
} from './ipc';

// Import LSP handlers
import './ipc/lsp-handlers';

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
app.whenReady().then(async () => {
  // Khởi động express-server (runtime backend) trước khi mở cửa sổ.
  await startServer();

  // Initialize WS Server
  await wsManager.initialize();

  // Clear media cache for a fresh session
  mediaCache.clear();

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron');

  // Default open or close DevTools by F12 in development
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);

    // CRITICAL: Only set window for Phantoma Inspector (main window)
    const allWindows = BrowserWindow.getAllWindows();
    const isMainWindow = allWindows.length === 1;

    if (isMainWindow) {
      proxyManager.setMainWindow(window);
      wsManager.setWindow(window);
      cdpManager.setMainWindow(window);
      // Create a default session so intercept works before any app is launched
      proxyManager.createSession('default').catch(() => {});
    }
  });

  // Setup IPC event handlers (from core/events)
  setupEventHandlers();

  // Register media protocol handler (must be done after app ready)
  registerMediaProtocol();

  // Setup all IPC handlers
  setupLoggerHandlers();
  setupProxyHandlers(); // chỉ còn phantoma:fetch — proxy:* đã chuyển sang express-server
  setupCDPHandlers(); // chỉ còn inspector:fetch-wasm — cdp:* đã chuyển
  setupAppHandlers(); // chỉ còn apps:scan-pc — app:launch/terminate đã chuyển
  setupSessionHandlers();
  setupFSHandlers();
  setupTLSHandlers();
  setupRendererHandlers(); // run_command đã chuyển (xem ghi chú trong file)
  // setupMobileHandlers();     // ĐÃ CHUYỂN sang express-server (/api/v1/runtime/mobile/*)
  setupConversationHandlers();
  setupWindowHandlers();
  setupTerminalHandlers(); // Re-enabled for IPC support
  setupGitHandlers();
  setupTaskHandlers();
  setupBrowserHandlers();
  // setupTargetHandlers();     // ĐÃ CHUYỂN sang express-server (/api/v1/runtime/targets/*)
  // setupCliCaptureHandlers(); // ĐÃ CHUYỂN sang express-server (/api/v1/runtime/cli/*)
  registerWorkspaceHandlers();

  // Auto-install certificate when proxy session is created
  const originalCreateSession = proxyManager.createSession.bind(proxyManager);
  proxyManager.createSession = async (id: string) => {
    // Try to install certificate (non-blocking)
    try {
      const { installSystemCA } = await import('./ipc/fs.handlers');
      installSystemCA().catch((e) => {
        logger.error('[Cert] Auto-install failed:', e);
      });
    } catch (e) {
      // Silently fail - user can install manually
    }
    return originalCreateSession(id);
  };

  // Create main window
  windowManager.createMainWindow();

  // Setup lifecycle handlers (activate, before-quit, window-all-closed)
  setupLifecycleHandlers();
});

// Export cleanup for external use
export { cleanup };
