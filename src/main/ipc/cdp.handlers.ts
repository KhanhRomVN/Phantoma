import { ipcMain } from 'electron';
import { cdpManager } from '../features/cdp';
import { handleInspectorRequest } from '../features/inspector';
import * as zlib from 'zlib';

// CDP state
let cdpConnected = false;
let cdpPort = 0;

export function setupCDPHandlers() {
  ipcMain.handle('cdp:connect', async (_, port: number) => {
    try {
      const success = await cdpManager.connect(port);
      if (success) {
        cdpConnected = true;
        cdpPort = port;
        return { success: true, port };
      }
      return { success: false, error: 'Connection failed' };
    } catch (e: any) {
      console.error('[CDP] Connection error:', e);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('cdp:disconnect', async () => {
    try {
      // Close WebSocket if exists
      if (cdpManager['ws']) {
        cdpManager['ws'].close();
        cdpManager['ws'] = null;
        cdpManager['isConnected'] = false;
      }
      cdpConnected = false;
      cdpPort = 0;
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('cdp:status', async () => {
    return {
      connected: cdpConnected,
      port: cdpPort,
    };
  });

  ipcMain.handle('cdp:navigate', async (_, url: string) => {
    try {
      const result = await cdpManager.navigate(url);
      return { success: result };
    } catch (e: any) {
      console.error('[IPC] cdp:navigate error:', e);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('cdp:reload', async () => {
    try {
      const result = await cdpManager.reload();
      return { success: result };
    } catch (e: any) {
      console.error('[IPC] cdp:reload error:', e);
      return { success: false, error: e.message };
    }
  });

  // Inspector Request Handler
  ipcMain.handle('inspector:send-request', async (_, payload) => {
    return await handleInspectorRequest(payload);
  });

  ipcMain.handle('inspector:fetch-wasm', async (_, url: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
      const arrayBuffer = await response.arrayBuffer();
      let buffer = Buffer.from(arrayBuffer);

      // Check for GZIP magic bytes (0x1f, 0x8b)
      if (buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
        try {
          buffer = zlib.gunzipSync(buffer);
        } catch (decompressionError) {
          console.error('[WASM Fetch] Decompression failed:', decompressionError);
          // Continue with original buffer if decompression fails
        }
      }

      // Return as Uint8Array (serializable)
      return new Uint8Array(buffer);
    } catch (error: any) {
      console.error('Failed to fetch WASM:', error);
      throw new Error(error.message);
    }
  });
}