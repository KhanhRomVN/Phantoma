/**
 * ------------------------------------------------------------------
 * Runtime IPC Handlers
 * ------------------------------------------------------------------
 * - runtime:get-ports        → port hiện tại của shell + emulate.
 * - runtime:start-emulate    → spawn emulate nếu chưa chạy (packaged only).
 * Dev mode: no-op, trả DEV_PORTS.
 * ------------------------------------------------------------------
 */

import { ipcMain } from 'electron';
import { constants } from 'fs';
import { access, stat } from 'fs/promises';
import { homedir } from 'os';
import { isAbsolute, join } from 'path';
import { getPorts, startEmulateServer, startProfileServer } from '../services/server-spawner';
import { getDeviceFingerprint } from '../services/device-fingerprint';

function chromeDefaultDir(): string {
  if (process.platform === 'win32') {
    return join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'Google', 'Chrome', 'User Data');
  }
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'Google', 'Chrome');
  }
  return join(homedir(), '.config', 'google-chrome');
}

async function validateFolder(target: string): Promise<{ valid: boolean; reason?: string }> {
  if (!isAbsolute(target)) return { valid: false, reason: 'Path must be absolute' };
  try {
    const info = await stat(target);
    if (!info.isDirectory()) return { valid: false, reason: 'This path is not a folder' };
    await access(target, constants.R_OK | constants.W_OK);
    return { valid: true };
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return { valid: false, reason: 'Folder does not exist' };
    if (code === 'EACCES' || code === 'EPERM') return { valid: false, reason: 'No read/write permission for this folder' };
    return { valid: false, reason: 'Cannot access this folder' };
  }
}

export function setupRuntimeHandlers(): void {
  ipcMain.handle('fs:validate-folder', (_event, target: string) => validateFolder(target));

  ipcMain.handle('runtime:get-chrome-default-dir', () => chromeDefaultDir());
  ipcMain.handle('runtime:get-ports', () => getPorts());
  ipcMain.handle('runtime:start-emulate', () => startEmulateServer());
  ipcMain.handle('runtime:start-profile', () => startProfileServer());
  ipcMain.handle('runtime:get-device-fingerprint', () => getDeviceFingerprint());
}