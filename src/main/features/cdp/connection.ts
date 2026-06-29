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
    // Remove all listeners to prevent memory leaks
    this.ws.removeAllListeners();
    // Close the connection if it's still open
    if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
      this.ws.close();
    }
    this.ws = null;
    this.isConnected = false;
  }

  return new Promise((resolve) => {
    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', async () => {
      this.isConnected = true;
      try {
        await this.initializeNetwork();
        resolve(true);
      } catch (err) {
        console.error('[CDP] Failed to initialize network:', err);
        resolve(false);
      }
    });

    this.ws.on('message', (data) => {
      this.handleMessage(data.toString());
    });

    this.ws.on('error', (err) => {
      console.error('[CDP] WebSocket error:', err);
      if (!this.isConnected) resolve(false);
    });

    this.ws.on('close', () => {
      this.isConnected = false;
      this.ws = null;
    });

    setTimeout(() => {
      if (!this.isConnected) {
        console.warn('[CDP] Connection timeout');
        resolve(false);
      }
    }, 10000);
  });
}

export async function initializeNetwork(this: CdpManager) {
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