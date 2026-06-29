import { ipcMain } from 'electron';
import { proxyManager } from '../shared/proxy-state';
import { closeAllGenericWebWindows } from '../features/generic-web';
import { appState } from '../shared/state';
import { cdpManager } from '../features/cdp';
import { launchApp } from '../app-launcher';
import { scanInstalledApps } from '../utils/app-scanner';

export function setupAppHandlers() {
  ipcMain.handle('app:terminate', async () => {
    closeAllGenericWebWindows();
    if (appState.activeChildProcess) {
      appState.activeChildProcess.kill();
      appState.activeChildProcess = null;
    }
    if (appState.activeProxyUrl) {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      execAsync(`pkill -f -- "--proxy-server=${appState.activeProxyUrl}"`);
      appState.activeProxyUrl = null;
    }
    return true;
  });

  ipcMain.handle('apps:scan-pc', async () => {
    const apps = await scanInstalledApps();
    return apps;
  });

  ipcMain.handle('app:get-memory-usage', () => {
    return process.memoryUsage();
  });

  // App Launcher IPC - delegated to app-launcher
  ipcMain.handle(
    'app:launch',
    async (
      _,
      appName: string,
      proxyUrl: string,
      customUrl?: string,
      forceMode?: 'browser' | 'electron' | 'native' | 'cdp' | 'frida',
      useEnvInject?: boolean,
    ) => {
      console.log(`[IPC] app:launch called: appName=${appName}, useEnvInject=${useEnvInject}`);
      return await launchApp(appName, proxyUrl, customUrl, forceMode, useEnvInject);
    }
  );
}