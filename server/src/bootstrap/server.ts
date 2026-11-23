/**
 * ------------------------------------------------------------------
 * Server Bootstrap
 * ------------------------------------------------------------------
 * - applyNetworkDefaults()   : sửa mặc định mạng của Node cho mạng chỉ có IPv4
 * - startServer()            : tạo HTTP server và listen
 * - registerShutdownHandlers : graceful shutdown (SIGINT/SIGTERM)
 * - registerProcessGuards    : log lỗi không bắt được thay vì để process chết
 * ------------------------------------------------------------------
 */

import dns from 'dns';
import http from 'http';
import net from 'net';
import { createApp } from '../app';
import { SHUTDOWN_TIMEOUT_MS } from '../constants';
import { createLogger, F } from '../utils/logger.util';
import type { AppContainer } from './container';

const logger = createLogger('Bootstrap');

/**
 * Node 20+ bật autoSelectFamily mặc định, làm hỏng kết nối trên các mạng
 * chỉ có IPv4 (phổ biến ở Việt Nam). Tắt toàn cục trước khi có connect() nào.
 */
export function applyNetworkDefaults(): void {
  const netWithFamily = net as typeof net & { setDefaultAutoSelectFamily?: (v: boolean) => void };
  netWithFamily.setDefaultAutoSelectFamily?.(false);
  dns.setDefaultResultOrder?.('ipv4first');
}

export async function startServer(
  container: AppContainer,
  host: string,
  port: number,
): Promise<http.Server> {
  const server = http.createServer(createApp(container));
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.removeListener('error', reject);
      resolve();
    });
  });
  return server;
}

export function registerShutdownHandlers(server: http.Server, container: AppContainer): void {
  const shutdown = (): void => {
    container.dispose();
    server.close(() => process.exit(0));
    // Ép thoát sau 10s nếu còn kết nối treo.
    setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

export function registerProcessGuards(): void {
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection (kept alive)', F('reason', String(reason)));
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception (kept alive)', F('error', err.message));
  });
}
