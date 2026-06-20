import { IpcRendererEvent } from 'electron';

export interface IAppAPI {
  ping: () => Promise<string>;
  quit: () => void;
}

export interface IpcAPI {
  invoke: <T = any>(channel: string, ...args: any[]) => Promise<T>;
  on: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => void;
  off: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => void;
}

export type API = {
  app: IAppAPI;
  invoke: IpcAPI['invoke'];
  on: IpcAPI['on'];
  off: IpcAPI['off'];
};
