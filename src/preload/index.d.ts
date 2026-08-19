import { ElectronAPI } from '@electron-toolkit/preload';
import { conversationAPI } from './api';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface API {
  conversation: typeof conversationAPI;
  invoke(channel: string, ...args: any[]): Promise<any>;
  send(channel: string, ...args: any[]): void;
  on(channel: string, func: (...args: any[]) => void): (...args: any[]) => void;
  off(channel: string, func: (...args: any[]) => void): void;
}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ElectronIpcRenderer {}

declare global {
  interface Window {
    electron: ElectronAPI & {
      ipcRenderer: ElectronIpcRenderer;
    };
    api: API;
    electronAPI: API;
  }
}
