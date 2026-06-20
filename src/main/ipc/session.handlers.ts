import { ipcMain, session } from 'electron';
import { wsManager } from '../shared/ws-state';
import { mediaCache } from '../proxy/mediaCache';
import * as fs from 'fs';

export function setupSessionHandlers() {
  // WebSocket Port IPC
  ipcMain.handle('ws:get-port', () => {
    return wsManager.getPort();
  });

  ipcMain.handle('ws:send', (_, message: any) => {
    wsManager.sendToClients(message);
    return true;
  });

  // Media Cache IPC
  ipcMain.handle('media:get-cache-manifest', () => {
    return mediaCache.getManifest();
  });

  // Session Management IPC
  ipcMain.handle('session:clear-data', async (_, appId: string) => {
    try {
      const partition = `persist:${appId}`;
      const ses = session.fromPartition(partition);
      await ses.clearStorageData();
      await ses.clearCache();
      return true;
    } catch (e: any) {
      console.error(`[Session] Failed to clear data for ${appId}:`, e);
      throw e;
    }
  });

  ipcMain.handle('session:get-info', async (_, appId: string) => {
    try {
      const partition = `persist:${appId}`;
      const ses = session.fromPartition(partition);
      const cookies = await ses.cookies.get({});

      // Get storage size if possible (simple estimation)
      const storagePath = ses.getStoragePath();
      let storageSize = 0;
      if (storagePath && fs.existsSync(storagePath)) {
        const stats = fs.statSync(storagePath);
        storageSize = stats.size;
      }

      return {
        cookieCount: cookies.length,
        storagePath: storagePath,
        storageSize: storageSize,
        partition: partition,
        cookies: cookies.map((c: any) => ({
          name: c.name,
          domain: c.domain,
          path: c.path,
          secure: c.secure,
          httpOnly: c.httpOnly,
          expirationDate: c.expirationDate,
        })),
      };
    } catch (e: any) {
      console.error(`[Session] Failed to get info for ${appId}:`, e);
      throw e;
    }
  });
}