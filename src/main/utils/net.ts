/**
 * ------------------------------------------------------------------
 * Tiện ích mạng
 * ------------------------------------------------------------------
 * Trợ giúp mạng cho tiến trình chính: phát hiện IP cục bộ và
 * tìm cổng khả dụng.
 *
 * Hàm chính:
 * - getLocalIp()         : Lấy địa chỉ IPv4 cục bộ
 * - findAvailablePort()  : Tìm một cặp cổng khả dụng
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Node.js ──
import * as net from 'net';
import * as os from 'os';

// ── Internal ──
import { logger } from './logger';

// ─── Functions ──────────────────────────────────────────────────────────
export const getLocalIp = (): string => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      // Skip internal (non-127.0.0.1) and non-ipv4 addresses
      if ('IPv4' !== iface.family || iface.internal) {
        continue;
      }
      return iface.address;
    }
  }
  return '127.0.0.1';
};

export const findAvailablePort = async (startPort: number = 8081): Promise<number> => {
  const isPortAvailable = (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.close();
        resolve(true);
      });
      server.on('error', () => {
        logger.warn(`[Net] Port ${port} is not available`);
        resolve(false);
      });
    });
  };

  let port = startPort;
  while (port < 65535) {
    const proxyAvailable = await isPortAvailable(port);
    const wssAvailable = await isPortAvailable(port + 1);

    if (proxyAvailable && wssAvailable) {
      return port;
    }
    port++;
  }
  throw new Error('No available port pairs found');
};