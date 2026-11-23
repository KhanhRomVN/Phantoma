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
import { RuntimePorts, DEV_PORTS } from '../../renderer/src/config/ports';

let currentPorts: RuntimePorts = { ...DEV_PORTS };
let serverProc: UtilityProcess | null = null;
let emulateProc: UtilityProcess | null = null;
let emulateStarting: Promise<RuntimePorts> | null = null;
let profileProc: UtilityProcess | null = null;
let profileStarting: Promise<RuntimePorts> | null = null;

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

function resolveServerEntry(baseDir: string, entryFile = 'index.js'): string {
  return path.join(baseDir, 'dist', entryFile);
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
    return currentPorts;
  }
  if (serverProc) return currentPorts;

  const serverPort = await findFreePort();
  currentPorts = { ...currentPorts, server: serverPort };

  const serverEntry = resolveServerEntry(path.join(resourcesRoot(), 'server'), 'main.js');
  serverProc = fork(serverEntry, { PORT: String(serverPort), ENV: 'production' }, 'server');
  await waitHealthy(`http://127.0.0.1:${serverPort}`);
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
    emulateProc = fork(
      emulateEntry,
      { EMULATE_PORT: String(emulatePort), ENV: 'production' },
      'emulate',
    );
    await waitHealthy(`http://127.0.0.1:${emulatePort}`);
    return currentPorts;
  })();

  return emulateStarting.finally(() => {
    emulateStarting = null;
  });
}

/** Spawn profile server theo yêu cầu (packaged only). Idempotent. */
export function startProfileServer(): Promise<RuntimePorts> {
  if (!app.isPackaged) return Promise.resolve(currentPorts);
  if (profileProc) return Promise.resolve(currentPorts);
  if (profileStarting) return profileStarting;

  profileStarting = (async () => {
    const profilePort = await findFreePort();
    currentPorts = { ...currentPorts, profile: profilePort };

    const profileEntry = resolveServerEntry(path.join(resourcesRoot(), 'profile-server'));
    profileProc = fork(
      profileEntry,
      { PROFILE_PORT: String(profilePort), ENV: 'production' },
      'profile-server',
    );
    await waitHealthy(`http://127.0.0.1:${profilePort}`);
    return currentPorts;
  })();

  return profileStarting.finally(() => {
    profileStarting = null;
  });
}

let codeProc: UtilityProcess | null = null;
let codeStarting: Promise<RuntimePorts> | null = null;

/** Spawn code server theo yêu cầu (packaged only). Idempotent. */
export function startCodeServer(): Promise<RuntimePorts> {
  if (!app.isPackaged) return Promise.resolve(currentPorts);
  if (codeProc) return Promise.resolve(currentPorts);
  if (codeStarting) return codeStarting;

  codeStarting = (async () => {
    const codePort = await findFreePort();
    currentPorts = { ...currentPorts, code: codePort };

    const codeEntry = resolveServerEntry(path.join(resourcesRoot(), 'code'));
    codeProc = fork(codeEntry, { CODE_PORT: String(codePort), ENV: 'production' }, 'code');
    await waitHealthy(`http://127.0.0.1:${codePort}`);
    return currentPorts;
  })();

  return codeStarting.finally(() => {
    codeStarting = null;
  });
}

export function getPorts(): RuntimePorts {
  return currentPorts;
}

export function stopServers(): void {
  if (serverProc) serverProc.kill();
  if (emulateProc) emulateProc.kill();
  if (profileProc) profileProc.kill();
  if (codeProc) codeProc.kill();
  codeProc = null;
  serverProc = null;
  emulateProc = null;
  profileProc = null;
}
