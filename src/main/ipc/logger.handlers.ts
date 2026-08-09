/**
 * Logger IPC Handlers
 * Receives log entries from renderer process and writes them to log file.
 */

import { ipcMain } from 'electron';
import { writeLogFromRenderer } from '../utils/logger';

export function setupLoggerHandlers(): void {
  ipcMain.handle('log:write', (_event, level: string, ...args: any[]) => {
    writeLogFromRenderer(level, args);
  });
}