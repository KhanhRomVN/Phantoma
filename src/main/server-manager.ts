/**
 * ------------------------------------------------------------------
 * Server Manager
 * ------------------------------------------------------------------
 * Khởi động và quản lý vòng đời express-server cùng với Electron.
 *
 * - DEV: spawn `npx tsx src/index.ts` từ thư mục express-server/
 * - PROD: spawn `node dist/index.js`
 * - Trước khi spawn: health-check — nếu server đã sống thì tái sử dụng,
 *   tránh EADDRINUSE và tránh kill nhầm server không do ta tạo.
 * - Kill server khi Electron thoát (chỉ khi ta là bên spawn).
 * ------------------------------------------------------------------
 */

import { spawn, type ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import { logger } from './utils/logger';

const SERVER_PORT = process.env.PHANTOMA_SERVER_PORT || '8080';
const HEALTH_URL = `http://127.0.0.1:${SERVER_PORT}/health`;

let serverProcess: ChildProcess | null = null;
let spawnedByUs = false;

/** Resolve đường dẫn thư mục express-server/ tùy môi trường. */
function resolveServerDir(): string {
  // DEV: project root/express-server
  // PROD (packaged): resources/express-server (nếu được bundle kèm)
  const candidates = [
    path.join(process.cwd(), 'express-server'),
    path.join(app.getAppPath(), '..', 'express-server'),
    path.join(process.resourcesPath || '', 'express-server'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'package.json'))) return c;
  }
  return candidates[0];
}

/** Kiểm tra server đã chạy chưa (health check). */
async function isServerUp(): Promise<boolean> {
  try {
    const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Chờ server sẵn sàng với timeout (ms). */
async function waitForServer(timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerUp()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

/**
 * Khởi động express-server nếu chưa chạy.
 * Trả về true nếu server sẵn sàng (dù do ta spawn hay đã có sẵn).
 */
export async function startServer(): Promise<boolean> {
  if (await isServerUp()) {
    logger.info('[ServerManager] Server đã chạy sẵn — tái sử dụng');
    return true;
  }

  const serverDir = resolveServerDir();
  const isDev = !app.isPackaged;

  const cmd = isDev ? 'npx' : 'node';
  const args = isDev ? ['tsx', 'src/index.ts'] : ['dist/index.js'];

  logger.info(`[ServerManager] Spawning: ${cmd} ${args.join(' ')} (cwd=${serverDir})`);

  serverProcess = spawn(cmd, args, {
    cwd: serverDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: SERVER_PORT },
  });
  spawnedByUs = true;

  serverProcess.stdout?.on('data', (data) => {
    logger.info(`[Server] ${data.toString().trim()}`);
  });
  serverProcess.stderr?.on('data', (data) => {
    logger.warn(`[Server] ${data.toString().trim()}`);
  });
  serverProcess.on('exit', (code) => {
    logger.info(`[ServerManager] Server exited with code ${code}`);
    serverProcess = null;
    spawnedByUs = false;
  });
  serverProcess.on('error', (err) => {
    logger.error('[ServerManager] Server spawn error:', { err: String(err) });
    serverProcess = null;
    spawnedByUs = false;
  });

  const ready = await waitForServer(15000);
  if (ready) {
    logger.info('[ServerManager] Server sẵn sàng');
  } else {
    logger.error('[ServerManager] Server không phản hồi sau 15s');
  }
  return ready;
}

/** Dừng server — chỉ kill nếu chính ta spawn. */
export function stopServer(): void {
  if (!spawnedByUs || !serverProcess) {
    return;
  }
  logger.info('[ServerManager] Stopping server (spawned by us)');
  try {
    serverProcess.kill('SIGTERM');
    // Force kill sau 5s nếu chưa thoát
    setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        serverProcess.kill('SIGKILL');
      }
    }, 5000).unref();
  } catch (e) {
    logger.error('[ServerManager] Failed to stop server:', { err: String(e) });
  }
  serverProcess = null;
  spawnedByUs = false;
}