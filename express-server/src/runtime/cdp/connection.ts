/**
 * ------------------------------------------------------------------
 * CDP Connection (port từ src/main/features/cdp/connection.ts)
 * ------------------------------------------------------------------
 * Giữ nguyên logic; thay logger Electron → logger express-server.
 * ------------------------------------------------------------------
 */

import WebSocket from 'ws';
import type { CdpManager } from './cdp-manager';
import { createLogger } from '../../utils/logger';

const logger = createLogger('CDP');

export async function connectToTarget(
  this: CdpManager,
  wsUrl: string,
  retries = 5,
  delay = 1000,
): Promise<boolean> {
  if (this.ws) {
    this.ws.removeAllListeners();
    if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
      this.ws.close();
    }
    this.ws = null;
    this.isConnected = false;
  }

  return new Promise((resolve) => {
    let resolved = false;

    this.ws = new WebSocket(wsUrl);
    let pingInterval: NodeJS.Timeout | null = null;
    let pongTimeout: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
      if (pongTimeout) {
        clearTimeout(pongTimeout);
        pongTimeout = null;
      }
    };

    const startHeartbeat = () => {
      cleanup();
      pingInterval = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          try {
            this.ws.ping();
          } catch {
            logger.warn('Failed to send ping');
          }

          if (pongTimeout) clearTimeout(pongTimeout);
          pongTimeout = setTimeout(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              try {
                this.ws.terminate();
              } catch {
                logger.warn('Failed to terminate WebSocket after pong timeout');
              }
              this.isConnected = false;
              this.ws = null;
              cleanup();
            }
          }, 5000);
        } else {
          cleanup();
        }
      }, 30000);
    };

    this.ws.on('open', async () => {
      this.isConnected = true;
      resolved = true;
      startHeartbeat();
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        logger.error('WebSocket not open after delay');
        resolve(false);
        return;
      }
      try {
        await this.initializeNetwork();
        resolve(true);
      } catch (err) {
        logger.error('Failed to initialize network', { err: String(err) });
        resolve(false);
      }
    });

    this.ws.on('message', (data) => {
      if (pongTimeout) {
        clearTimeout(pongTimeout);
        pongTimeout = null;
      }
      this.handleMessage(data.toString());
    });

    this.ws.on('pong', () => {
      if (pongTimeout) {
        clearTimeout(pongTimeout);
        pongTimeout = null;
      }
    });

    this.ws.on('close', () => {
      this.isConnected = false;
      this.ws = null;
      cleanup();

      if (retries > 0 && !resolved) {
        setTimeout(() => {
          this.connectToTarget(wsUrl, retries - 1, delay * 2);
        }, delay);
      }
    });

    this.ws.on('error', (err) => {
      logger.error('WebSocket error', { err: String(err) });
      if (!resolved) {
        resolved = true;
        if (retries > 0) {
          setTimeout(() => {
            this.connectToTarget(wsUrl, retries - 1, delay * 2);
          }, delay);
        } else {
          resolve(false);
        }
      }
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    }, 10000);
  });
}

export async function initializeNetwork(this: CdpManager) {
  await new Promise((resolve) => setTimeout(resolve, 100));

  try {
    await this.send('Page.enable', {});
  } catch (e) {
    logger.warn('Failed to enable Page', { err: String(e) });
  }

  try {
    await this.send('Debugger.enable', {});
  } catch (e) {
    logger.warn('Failed to enable Debugger', { err: String(e) });
  }

  try {
    await this.send('Runtime.enable', {});
  } catch (e) {
    logger.warn('Failed to enable Runtime', { err: String(e) });
  }

  try {
    await this.send('Network.enable', {
      maxTotalBufferSize: 10000000,
      maxResourceBufferSize: 5000000,
      maxPostDataSize: 5000000,
    });
  } catch (e) {
    logger.error('Failed to enable network', {
      error: String(e),
      wsReadyState: this.ws?.readyState,
      wsOpen: this.ws?.readyState === WebSocket.OPEN,
      isConnected: this.isConnected,
    });
  }

  try {
    await this.send('Network.setAcceptedEncodings', {
      encodings: ['gzip', 'br', 'deflate'],
    });
  } catch (e) {
    logger.warn('Failed to set accepted encodings', { err: String(e) });
  }

  try {
    await this.send('Network.setBypassServiceWorker', { bypass: true });
  } catch (e) {
    logger.warn('Failed to set bypass service worker', { err: String(e) });
  }
}