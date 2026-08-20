/**
 * ------------------------------------------------------------------
 * Trình xử lý sự kiện lõi
 * ------------------------------------------------------------------
 * Đăng ký tất cả IPC handler cho module lõi. Kết nối ping,
 * lưu trữ hội thoại và lưu phản hồi collection.
 *
 * Hàm chính:
 * - setupEventHandlers() : Đăng ký các IPC handler lõi với ipcMain
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Electron ──
import { ipcMain } from 'electron';

// ── Node.js ──
import * as fs from 'fs';
import * as path from 'path';

// ── Internal ──
import { setupConversationHandlers } from './conversation';
import { logger } from '../../utils/logger';

// ─── Functions ──────────────────────────────────────────────────────────
export function setupEventHandlers() {
  ipcMain.handle('ping', () => 'pong');
  setupConversationHandlers();

  ipcMain.handle('collection:save-response', async (event, { appId, request, response }) => {
    try {
      const userDataPath = (await import('electron')).app.getPath('userData');
      const collectionDir = path.join(userDataPath, 'collections', appId);
      if (!fs.existsSync(collectionDir)) {
        fs.mkdirSync(collectionDir, { recursive: true });
      }

      const timestamp = Date.now();
      const filename = `response-${timestamp}.json`;
      const filePath = path.join(collectionDir, filename);

      const data = {
        savedAt: timestamp,
        request,
        response,
      };

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

      return { success: true, filePath };
    } catch (error) {
      logger.error('Failed to save response:', error);
      return { success: false, error: String(error) };
    }
  });
}