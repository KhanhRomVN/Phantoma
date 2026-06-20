import { app, BrowserWindow, ipcMain } from 'electron';
import { electronApp, optimizer } from '@electron-toolkit/utils';
import * as path from 'path';
import * as fs from 'fs';

// Import shared state
import { proxyManager } from './shared/proxy-state';
import { wsManager } from './shared/ws-state';

// Import core modules
import { windowManager } from './core/window';
import { setupEventHandlers } from './core/events';
import { mediaCache } from './proxy/mediaCache';
import { cdpManager } from './features/cdp';

// Import lifecycle
import { setupLifecycleHandlers, cleanup } from './lifecycle';

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
  setupAppsHandlers,
  setupFSHandlers,
  setupTLSHandlers,
  setupMobileHandlers,
} from './ipc';

// Import app launcher
import { launchApp } from './app-launcher';

// Ensure certificate directory exists for http-mitm-proxy
const certDir = path.join(process.cwd(), '.http-mitm-proxy', 'certs');
try {
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }
} catch (e) {
  console.error('[Cert] Failed to create certificate directory:', e);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(async () => {
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
  setupProxyHandlers();
  setupCDPHandlers();
  setupAppHandlers();
  setupSessionHandlers();
  setupAppsHandlers();
  setupFSHandlers();
  setupTLSHandlers();
  setupMobileHandlers();

  // Auto-install certificate when proxy session is created
  const originalCreateSession = proxyManager.createSession.bind(proxyManager);
  proxyManager.createSession = async (id: string) => {
    // Try to install certificate (non-blocking)
    try {
      const { installSystemCA } = await import('./ipc/fs.handlers');
      installSystemCA().catch((e) => {
        console.error('[Cert] Auto-install failed:', e);
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