/**
 * ------------------------------------------------------------------
 * Net Utilities (port từ src/main/utils/net.ts)
 * ------------------------------------------------------------------
 */

import * as net from 'net';
import { createLogger } from '../utils/logger';

const logger = createLogger('Net');

export const findAvailablePort = async (startPort = 8081): Promise<number> => {
  const isPortAvailable = (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.close();
        resolve(true);
      });
      server.on('error', () => {
        logger.warn(`Port ${port} is not available`);
        resolve(false);
      });
    });
  };

  let port = startPort;
  while (port < 65535) {
    const proxyAvailable = await isPortAvailable(port);
    const wssAvailable = await isPortAvailable(port + 1);
    if (proxyAvailable && wssAvailable) return port;
    port++;
  }
  throw new Error('No available port pairs found');
};