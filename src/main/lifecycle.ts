import { app, BrowserWindow } from 'electron';
import * as dns from 'dns';
import { proxyManager } from './shared/proxy-state';
import { closeAllGenericWebWindows } from './features/generic-web';
import { execSync } from 'child_process';
import { appState, clearActiveState } from './shared/state';

// Fix EAI_AGAIN DNS errors by preferring IPv4
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (e) {
  // Ignore errors
}

// Ignore all certificate errors globally (fixes Proxy CA issues)
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('allow-insecure-localhost', 'true');

// Fix GPU errors on some Linux distributions
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

// Global certificate error handler
app.on('certificate-error', (event, _webContents, _url, _error, _certificate, callback) => {
  // On certificate error we disable default behaviour (stop loading the page)
  // and we then say "it is all fine - true" to the callback
  event.preventDefault();
  callback(true);
});

export async function cleanup() {
  await proxyManager.stopAll();
  closeAllGenericWebWindows();
  if (appState.activeChildProcess) {
    appState.activeChildProcess.kill();
    appState.activeChildProcess = null;
  }
  if (appState.activeProxyUrl) {
    // Attempt to kill processes launched with this specific proxy
    try {
      execSync(`pkill -f -- "--proxy-server=${appState.activeProxyUrl}"`);
    } catch (e: any) {
      // pkill returns exit code 1 if no matched processes are found, which is fine
      if (e.status !== 1) {
        console.error('Failed to pkill process during cleanup:', e);
      }
    }
    appState.activeProxyUrl = null;
  }
  clearActiveState();
}

export function setupLifecycleHandlers() {
  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      // Create main window is handled elsewhere
    }
  });

  app.on('before-quit', () => {
    cleanup();
  });

  app.on('window-all-closed', () => {
    cleanup();
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}