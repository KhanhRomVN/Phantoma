import { contextBridge, IpcRendererEvent } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import { appAPI } from './api';

// Build API object
const api = {
  app: appAPI,
  invoke: (channel: string, ...args: any[]) => electronAPI.ipcRenderer.invoke(channel, ...args),
  on: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => {
    electronAPI.ipcRenderer.on(channel, listener);
  },
  off: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) =>
    electronAPI.ipcRenderer.removeListener(channel, listener),
  removeAllListeners: (channel: string) => {
    electronAPI.ipcRenderer.removeAllListeners(channel);
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
  // @ts-expect-error - window.electron is defined in d.ts
  window.electron = electronAPI;
  // @ts-expect-error - window.api is defined in d.ts
  window.api = api;
}
