/**
 * ------------------------------------------------------------------
 * Server Spawner (packaged build only)
 * ------------------------------------------------------------------
 * - Shell server (`server/`): spawn ngay khi app ready.
 * - Emulate server (`emulate/`): spawn ON-DEMAND khi renderer vào module Emulate
 *   (gọi IPC `runtime:start-emulate`). Idempotent — gọi lại khi đang chạy thì no-op.
 * Cả 2 dùng port trống ngẫu nhiên + Electron utilityProcess.fork (ABI Electron).
 * Kill tất cả khi app quit. Dev mode: no-op.
 * ------------------------------------------------------------------
 */

import { app, utilityProcess, UtilityProcess } from 'electron';
import net from 'net';
import path from 'path';
import { logger } from '../utils/logger';
import { RuntimePorts, DEV_PORTS } from '../../shared/ports';

let currentPorts: RuntimePorts = { ...DEV_PORTS };
let serverProc: UtilityProcess | null = null;
let emulateProc: UtilityProcess | null = null;
let emulateStarting: Promise<RuntimePorts> | null = null;

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      if (typeof addr === 'object' && addr) {
        const port = addr.port;
        srv.close(() => resolve(port));
      } else {
        srv.close(() => reject(new Error('Cannot determine free port')));
      }
    });
  });
}

function resourcesRoot(): string {
  return app.isPackaged ? process.resourcesPath : process.cwd();
}

function resolveServerEntry(baseDir: string): string {
  return path.join(baseDir, 'dist', 'index.js');
}

function fork(entry: string, env: Record<string, string>, label: string): UtilityProcess {
  const child = utilityProcess.fork(entry, [], {
    env: { ...process.env, ...env },
    stdio: 'ignore',
  });
  child.on('spawn', () => logger.info(`[ServerSpawner] ${label} spawned`));
  child.on('exit', (code) => logger.info(`[ServerSpawner] ${label} exited code=${code}`));
  return child;
}

async function waitHealthy(baseUrl: string, timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return;
    } catch {
      // not ready
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`[ServerSpawner] ${baseUrl} not healthy after ${timeoutMs}ms`);
}

/** Spawn shell server ngay khi app ready (packaged only). */
export async function startShellServer(): Promise<RuntimePorts> {
  if (!app.isPackaged) {
    logger.info('[ServerSpawner] dev mode — skip shell spawn, using DEV_PORTS');
    return currentPorts;
  }
  if (serverProc) return currentPorts;

  const serverPort = await findFreePort();
  currentPorts = { ...currentPorts, server: serverPort };

  const serverEntry = resolveServerEntry(path.join(resourcesRoot(), 'server'));
  logger.info(`[ServerSpawner] starting shell server:${serverPort}`);
  serverProc = fork(serverEntry, { PORT: String(serverPort), ENV: 'production' }, 'server');
  await waitHealthy(`http://127.0.0.1:${serverPort}`);
  logger.info('[ServerSpawner] shell server healthy');
  return currentPorts;
}

/** Spawn emulate server theo yêu cầu (packaged only). Idempotent. */
export function startEmulateServer(): Promise<RuntimePorts> {
  if (!app.isPackaged) return Promise.resolve(currentPorts);
  if (emulateProc) return Promise.resolve(currentPorts);
  if (emulateStarting) return emulateStarting;

  emulateStarting = (async () => {
    const emulatePort = await findFreePort();
    currentPorts = { ...currentPorts, emulate: emulatePort };

    const emulateEntry = resolveServerEntry(path.join(resourcesRoot(), 'emulate'));
    logger.info(`[ServerSpawner] starting emulate server:${emulatePort}`);
    emulateProc = fork(emulateEntry, { EMULATE_PORT: String(emulatePort), ENV: 'production' }, 'emulate');
    await waitHealthy(`http://127.0.0.1:${emulatePort}`);
    logger.info('[ServerSpawner] emulate server healthy');
    return currentPorts;
  })();

  return emulateStarting.finally(() => {
    emulateStarting = null;
  });
}

export function getPorts(): RuntimePorts {
  return currentPorts;
}

export function stopServers(): void {
  if (serverProc) serverProc.kill();
  if (emulateProc) emulateProc.kill();
  serverProc = null;
  emulateProc = null;
}