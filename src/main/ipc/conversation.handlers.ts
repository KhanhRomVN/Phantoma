/**
 * ------------------------------------------------------------------
 * IPC Conversation Handlers
 * ------------------------------------------------------------------
 * Cầu nối IPC cho việc quản lý lịch sử hội thoại AI. ủy quyền toàn bộ
 * thao tác CRUD (Create, Read, Update, Delete) xuống lớp Service
 * ConversationStorage để đảm bảo tính nhất quán dữ liệu.
 *
 * Constants:
 * - storage : Instance đơn lẻ của ConversationStorage dùng chung cho mọi request
 *
 * Channels:
 * - conversation:save     : Lưu hoặc cập nhật một cuộc hội thoại cụ thể
 * - conversation:get      : Truy xuất nội dung đầy đủ của một hội thoại theo ID
 * - conversation:list     : Liệt kê tất cả ID hội thoại thuộc một module/project
 * - conversation:delete   : Xóa vĩnh viễn một hội thoại duy nhất
 * - conversation:deleteAll: Dọn sạch toàn bộ lịch sử hội thoại của một module
 *
 * Functions:
 * - setupConversationHandlers() : Entry point đăng ký IPC handler nhóm 'conversation:'
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
export function setupConversationHandlers(): void {
  // Save conversation
  ipcMain.handle('conversation:save', async (_, { moduleId, conversationId, data }) => {
    try {
      await storage.saveConversation(moduleId, conversationId, data);
      return { success: true };
    } catch (error: any) {
      logger.error('[IPC][conversation:save] ❌ Failed to save conversation:', {
        error: error.message,
        moduleId,
        conversationId,
      });
      throw error;
    }
  });

  // Get conversation
  ipcMain.handle('conversation:get', async (_, { moduleId, conversationId }) => {
    try {
      const data = await storage.getConversation(moduleId, conversationId);
      return data;
    } catch (error) {
      logger.error('[IPC] Failed to get conversation:', error);
      return null;
    }
  });

  // List conversations
  ipcMain.handle('conversation:list', async (_, { moduleId }) => {
    try {
      const ids = await storage.listConversations(moduleId);
      return ids;
    } catch (error) {
      logger.error('[IPC] Failed to list conversations:', error);
      return [];
    }
  });

  // Delete conversation
  ipcMain.handle('conversation:delete', async (_, { moduleId, conversationId }) => {
    try {
      await storage.deleteConversation(moduleId, conversationId);
      return { success: true };
    } catch (error) {
      logger.error('[IPC] Failed to delete conversation:', error);
      throw error;
    }
  });

  // Delete all conversations
  ipcMain.handle('conversation:deleteAll', async (_, { moduleId }) => {
    try {
      await storage.deleteAllConversations(moduleId);
      return { success: true };
    } catch (error) {
      logger.error('[IPC] Failed to delete all conversations:', error);
      throw error;
    }
  });
}
