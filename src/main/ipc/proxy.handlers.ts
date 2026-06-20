import { ipcMain, net } from 'electron';
import { proxyManager } from '../shared/proxy-state';
import { closeAllGenericWebWindows } from '../features/generic-web';
import { appState } from '../shared/state';
import { cleanup } from '../lifecycle';

export function setupProxyHandlers() {
  // Phantoma internal fetch — bypass proxy, dùng electron net module
  ipcMain.handle('phantoma:fetch', async (_, url: string, method: string, body?: string) => {
    try {
      const response = await net.fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ?? undefined,
        bypassCustomProtocolHandlers: true,
      });
      const text = await response.text();
      return { ok: response.ok, status: response.status, body: text };
    } catch (e: any) {
      return { ok: false, status: 0, body: '', error: e?.message ?? String(e) };
    }
  });

  // Proxy IPC
  ipcMain.handle('proxy:create-session', async (_, appId: string) => {
    return await proxyManager.createSession(appId);
  });

  ipcMain.handle('proxy:start', async () => {
    // This old signature is likely obsolete.
    // Let's assume frontend now calls 'proxy:create-session'
    return true;
  });

  ipcMain.handle('proxy:set-intercept', async (_, enabled: boolean, appId: string) => {
    const result = appId
      ? proxyManager.setIntercept(appId, enabled)
      : proxyManager.setInterceptAll(enabled);
    return result;
  });

  ipcMain.handle('proxy:set-breakpoint-rules', async (_, rules) => {
    proxyManager.setBreakpointRules(rules);
    return true;
  });

  ipcMain.handle('proxy:resolve-breakpoint', async (_, requestId: string, edited: any) => {
    return proxyManager.resolveBreakpoint(requestId, edited);
  });

  ipcMain.handle('proxy:forward-request', async (_, id: string) => {
    return proxyManager.forwardRequest(id);
  });

  ipcMain.handle('proxy:drop-request', async (_, id: string) => {
    return proxyManager.dropRequest(id);
  });

  ipcMain.handle('proxy:stop', async () => {
    await proxyManager.stopAll();
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

  ipcMain.handle('proxy:stop-session', async (_, appId: string) => {
    await proxyManager.stopSession(appId);
    return true;
  });
}