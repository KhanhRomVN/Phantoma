/**
 * ------------------------------------------------------------------
 * Target IPC Handlers
 * ------------------------------------------------------------------
 * Xử lý các yêu cầu IPC liên quan đến quản lý targets
 * ------------------------------------------------------------------
 */

import { ipcMain, BrowserWindow } from 'electron';
import { appState } from '../shared/state';
import { logger } from '../utils/logger';

// Store target metadata (title, favicon, platform, etc.)
const targetMetadata = new Map<
  string,
  {
    id: string;
    title: string;
    favicon?: string;
    platform?: string;
    url?: string;
  }
>();

export function setupTargetHandlers(): void {
  /**
   * Lấy danh sách targets đang running
   */
  ipcMain.handle('target:list-running', async () => {
    try {
      const runningTargets: any[] = [];

      appState.targetProcesses.forEach((process, targetId) => {
        // Chỉ lấy những process còn sống
        if (process && !process.killed) {
          const metadata = targetMetadata.get(targetId);
          if (metadata) {
            runningTargets.push(metadata);
          } else {
            // Fallback nếu không có metadata
            runningTargets.push({
              id: targetId,
              title: targetId,
            });
          }
        }
      });

      return {
        success: true,
        targets: runningTargets,
      };
    } catch (error) {
      logger.error('[IPC] target:list-running error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  /**
   * Đăng ký target metadata khi launch
   */
  ipcMain.handle('target:register', async (_, data) => {
    try {
      const { targetId, title, favicon, platform, url } = data;

      targetMetadata.set(targetId, {
        id: targetId,
        title,
        favicon,
        platform,
        url,
      });

      // Emit event để thông báo target đã start
      const allWindows = BrowserWindow.getAllWindows();
      allWindows.forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send('target:status-changed', {
            targetId,
            status: 'running',
            target: {
              id: targetId,
              title,
              favicon,
              platform,
              url,
            },
          });
        }
      });

      return { success: true };
    } catch (error) {
      logger.error('[IPC] target:register error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  /**
   * Hủy đăng ký target metadata khi stop
   */
  ipcMain.handle('target:unregister', async (_, targetId: string) => {
    try {
      targetMetadata.delete(targetId);

      // Emit event để thông báo target đã stop
      const allWindows = BrowserWindow.getAllWindows();
      allWindows.forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send('target:status-changed', {
            targetId,
            status: 'stopped',
          });
        }
      });

      return { success: true };
    } catch (error) {
      logger.error('[IPC] target:unregister error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  logger.info('[IPC] Target handlers registered');
}

/**
 * Helper function để emit target status changed từ main process
 */
export function emitTargetStatusChanged(
  targetId: string,
  status: 'running' | 'stopped',
  target?: any,
) {
  const allWindows = BrowserWindow.getAllWindows();
  allWindows.forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send('target:status-changed', {
        targetId,
        status,
        target,
      });
    }
  });
}
