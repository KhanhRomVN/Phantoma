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
