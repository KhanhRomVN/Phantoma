import { contextBridge, IpcRendererEvent } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

// Build API object
const api = {
  invoke: (channel: string, ...args: any[]) => electronAPI.ipcRenderer.invoke(channel, ...args),
  send: (channel: string, ...args: any[]) => electronAPI.ipcRenderer.send(channel, ...args),
  on: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => {
    electronAPI.ipcRenderer.on(channel, listener);
    return () => electronAPI.ipcRenderer.removeListener(channel, listener);
  },
  off: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) =>
    electronAPI.ipcRenderer.removeListener(channel, listener),
  removeAllListeners: (channel: string) => {
    electronAPI.ipcRenderer.removeAllListeners(channel);
  },
  runtime: {
    getPorts: () => electronAPI.ipcRenderer.invoke('runtime:get-ports'),
    startEmulate: () => electronAPI.ipcRenderer.invoke('runtime:start-emulate'),
  },
  agentTool: {
    discover: (config: any) => electronAPI.ipcRenderer.invoke('agent-tool:discover', config),
    listSessions: (config: any) =>
      electronAPI.ipcRenderer.invoke('agent-tool:list-sessions', config),
    resolvePermission: (id: string, approved: boolean) =>
      electronAPI.ipcRenderer.invoke('agent-tool:resolve-permission', id, approved),
    requestPermission: (id: string, question: string, options: string[]) =>
      electronAPI.ipcRenderer.invoke('agent-tool:request-permission', id, question, options),
    run: (request: any) => electronAPI.ipcRenderer.invoke('agent-tool:run', request),
    interrupt: (runId: string) => electronAPI.ipcRenderer.invoke('agent-tool:interrupt', runId),
    onEvent: (callback: (data: { runId: string; event: any }) => void) => {
      const listener = (_event: any, data: any) => callback(data)
      electronAPI.ipcRenderer.on('agent-tool:event', listener)
      return () => electronAPI.ipcRenderer.removeListener('agent-tool:event', listener)
    },
    onPermissionRequest: (callback: (data: any) => void) => {
      const listener = (_event: any, data: any) => callback(data)
      electronAPI.ipcRenderer.on('agent-tool:permission-request', listener)
      return () => electronAPI.ipcRenderer.removeListener('agent-tool:permission-request', listener)
    },
  },
};

// Expose APIs to renderer
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error('[Preload] Failed to expose APIs:', error);
  }
} else {
  // Fallback for non-context-isolated (development only)
  window.electron = electronAPI;
  // @ts-expect-error - window.api is defined in d.ts
  window.api = api;
}
