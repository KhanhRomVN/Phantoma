/**
 * ------------------------------------------------------------------
 * IPC Memory Handlers
 * ------------------------------------------------------------------
 * Cầu nối IPC cho Memory feature — read/update memory.md toàn cục.
 *
 * Channels:
 * - memory:read   : Đọc nội dung memory.md
 * - memory:update : Replace old_content bằng new_content
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Electron ──
import { ipcMain } from 'electron';

// ── Internal ──
import { memoryStorage } from '../storage/MemoryStorage';
import { logger } from '@main/utils/logger';

// ─── Functions ──────────────────────────────────────────────────────────
export function setupMemoryHandlers(): void {
  ipcMain.handle('memory:read', async () => {
    try {
      return memoryStorage.readMemory();
    } catch (error: any) {
      logger.error('[IPC][memory:read] Failed:', error.message);
      throw error;
    }
  });

  ipcMain.handle('memory:update', async (_, { old_content, new_content }) => {
    try {
      const result = memoryStorage.updateMemory(old_content ?? '', new_content ?? '');
      return { success: true, ...result };
    } catch (error: any) {
      logger.error('[IPC][memory:update] Failed:', error.message);
      return { success: false, error: error.message };
    }
  });
}