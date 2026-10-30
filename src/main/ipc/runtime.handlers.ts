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
import { getPorts, startEmulateServer } from '../services/server-spawner';

export function setupRuntimeHandlers(): void {
  ipcMain.handle('runtime:get-ports', () => getPorts());
  ipcMain.handle('runtime:start-emulate', () => startEmulateServer());
}