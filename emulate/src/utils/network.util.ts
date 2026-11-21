/**
 * ------------------------------------------------------------------
 * Network Utilities
 * ------------------------------------------------------------------
 * Helpers for allocating TCP ports.
 * ------------------------------------------------------------------
 */

import * as net from 'net';

/**
 * Asks the OS for a free ephemeral TCP port (bound on 127.0.0.1).
 */
export function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        const port = address.port;
        server.close(() => resolve(port));
      } else {
        reject(new Error('Failed to get port from server address'));
      }
    });

    server.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Finds an available port on 0.0.0.0, starting at `startPort` and
 * incrementing by one while ports are in use (EADDRINUSE).
 */
export function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(startPort, '0.0.0.0', () => {
      const address = server.address();
      if (address && typeof address !== 'string') {
        const port = address.port;
        server.close(() => resolve(port));
      } else {
        server.close(() => reject(new Error('Could not determine port')));
      }
    });
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        findAvailablePort(startPort + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}
