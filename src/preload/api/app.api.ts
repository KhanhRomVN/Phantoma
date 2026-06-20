import { ipcRenderer } from 'electron';

/**
 * Application API - provides basic app controls
 */
export const appAPI = {
  /**
   * Ping the main process to check connectivity
   * @returns Promise with 'pong' response
   */
  ping: () => ipcRenderer.invoke('ping'),

  /**
   * Quit the application
   */
  quit: () => ipcRenderer.send('app:quit'),
};
