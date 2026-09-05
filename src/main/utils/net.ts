/**
 * ------------------------------------------------------------------
 * Tiện ích mạng
 * ------------------------------------------------------------------
 * Trợ giúp mạng cho tiến trình chính: phát hiện IP cục bộ và
 * tìm cổng khả dụng.
 *
 * Hàm chính:
 * - findAvailablePort()  : Tìm một cặp cổng khả dụng
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Node.js ──
import * as net from 'net';

// ── Internal ──
import { logger } from './logger';

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
