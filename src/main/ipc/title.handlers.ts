/**
 * ------------------------------------------------------------------
 * IPC Conversation Title Handlers
 * ------------------------------------------------------------------
 * Cập nhật title của conversation — dùng khi AI gọi tool
 * `conversation_title` để đặt tên cho phiên chat hiện tại.
 *
 * Channels:
 * - title:update : Cập nhật title cho conversation theo moduleId + conversationId
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Electron ──
import { ipcMain } from 'electron';

// ── Internal ──
import { ConversationStorage } from '../storage/ConversationStorage';
import { logger } from '@main/utils/logger';

// ─── Constants ──────────────────────────────────────────────────────────
const storage = new ConversationStorage();

// ─── Functions ──────────────────────────────────────────────────────────
export function setupTitleHandlers(): void {
  ipcMain.handle('title:update', async (_, { moduleId, conversationId, title, folderPath }) => {
    try {
      if (!title || !title.trim()) {
        return { success: false, error: 'title is required' };
      }
      const ok = await storage.updateConversationTitle(
        moduleId,
        conversationId,
        title.trim(),
        folderPath ?? null,
      );
      return { success: ok };
    } catch (error: any) {
      logger.error('[IPC][title:update] Failed:', error.message);
      return { success: false, error: error.message };
    }
  });
}