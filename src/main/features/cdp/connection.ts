/**
 * ------------------------------------------------------------------
 * Kết nối CDP
 * ------------------------------------------------------------------
 * Trợ giúp kết nối WebSocket cấp thấp cho CDP Manager.
 * Xử lý kết nối với heartbeat, logic thử lại và thiết lập domain CDP.
 *
 * Hàm chính:
 * - connectToTarget()  : Kết nối đến URL WebSocket CDP với thử lại
 * - initializeNetwork(): Bật các domain Page, Debugger, Runtime, Network
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── External ──
import WebSocket from 'ws';

// ── Internal ──
import { CdpManager } from './cdp-manager';
import { logger } from '../../utils/logger';

// ─── Functions ──────────────────────────────────────────────────────────
export async function connectToTarget(
  this: CdpManager,
  wsUrl: string,
  retries = 5,
  delay = 1000,
): Promise<boolean> {
  // Clean up existing WebSocket before creating a new one
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
            logger.warn('[CDP] Failed to send ping');
          }

          if (pongTimeout) clearTimeout(pongTimeout);
          pongTimeout = setTimeout(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              try {
                this.ws.terminate();
              } catch {
                logger.warn('[CDP] Failed to terminate WebSocket after pong timeout');
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
      // Wait for WebSocket to be fully ready
      await new Promise((resolve) => setTimeout(resolve, 300));
      // Double-check WebSocket is still open
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        logger.error('[CDP] WebSocket not open after delay');
        resolve(false);
        return;
      }
      try {
        await this.initializeNetwork();
        resolve(true);
      } catch (err) {
        logger.error('[CDP] Failed to initialize network:', err);
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
      logger.error('[CDP] WebSocket error:', err);
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
  // Wait a bit more to ensure WebSocket is ready
  await new Promise((resolve) => setTimeout(resolve, 100));

  try {
    await this.send('Page.enable', {});
  } catch (e) {
    logger.warn('[CDP] Failed to enable Page:', e);
  }

  try {
    await this.send('Debugger.enable', {});
  } catch (e) {
    logger.warn('[CDP] Failed to enable Debugger:', e);
  }

  try {
    await this.send('Runtime.enable', {});
  } catch (e) {
    logger.warn('[CDP] Failed to enable Runtime:', e);
  }

  try {
    await this.send('Network.enable', {
      maxTotalBufferSize: 10000000,
      maxResourceBufferSize: 5000000,
      maxPostDataSize: 5000000,
    });
  } catch (e) {
    const errorDetail =
      e instanceof Error ? { name: e.name, message: e.message, stack: e.stack } : e;
    logger.error('[CDP] Failed to enable network:', {
      error: errorDetail,
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
    logger.warn('[CDP] Failed to set accepted encodings:', e);
  }

  try {
    await this.send('Network.setBypassServiceWorker', { bypass: true });
  } catch (e) {
    logger.warn('[CDP] Failed to set bypass service worker:', e);
  }
}