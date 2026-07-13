import WebSocket from 'ws';
import { CdpManager } from './cdp-manager';

export async function connectToTarget(
  this: CdpManager,
  wsUrl: string,
  retries = 5,
  delay = 1000
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
            // Ignore
          }

          if (pongTimeout) clearTimeout(pongTimeout);
          pongTimeout = setTimeout(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              console.warn('[CDP] No pong received, closing connection');
              try {
                this.ws.terminate();
              } catch {
                // Ignore
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
      await new Promise(resolve => setTimeout(resolve, 300));
      // Double-check WebSocket is still open
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        console.error('[CDP] WebSocket not open after delay');
        resolve(false);
        return;
      }
      try {
        await this.initializeNetwork();
        resolve(true);
      } catch (err) {
        console.error('[CDP] Failed to initialize network:', err);
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
        console.warn('[CDP] Connection closed, reconnecting...');
        setTimeout(() => {
          this.connectToTarget(wsUrl, retries - 1, delay * 2);
        }, delay);
      }
    });

    this.ws.on('error', (err) => {
      console.error('[CDP] WebSocket error:', err);
      if (!resolved) {
        resolved = true;
        if (retries > 0) {
          console.warn(`[CDP] Connection error, retrying... (${retries} attempts left)`);
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
        console.warn('[CDP] Connection timeout');
        resolved = true;
        resolve(false);
      }
    }, 10000);
  });
}

export async function initializeNetwork(this: CdpManager) {
  // Wait a bit more to ensure WebSocket is ready
  await new Promise(resolve => setTimeout(resolve, 100));
  
  try {
    await this.send('Page.enable', {});
  } catch (e) {
    // Ignore
  }

  try {
    await this.send('Debugger.enable', {});
  } catch (e) {
    // Ignore
  }

  try {
    await this.send('Runtime.enable', {});
  } catch (e) {
    // Ignore
  }

  try {
    await this.send('Network.enable', {
      maxTotalBufferSize: 10000000,
      maxResourceBufferSize: 5000000,
      maxPostDataSize: 5000000,
    });
  } catch (e) {
    console.error('[CDP] Failed to enable network:', e);
  }

  try {
    await this.send('Network.setAcceptedEncodings', {
      encodings: ['gzip', 'br', 'deflate'],
    });
  } catch (e) {
    // Ignore
  }

  try {
    await this.send('Network.setBypassServiceWorker', { bypass: true });
  } catch (e) {
    // Ignore
  }
}