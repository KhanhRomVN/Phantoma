import { ipcMain } from 'electron';
import { ConversationStorage } from '../services/ConversationStorage';

const storage = new ConversationStorage();

/**
 * Setup conversation IPC handlers
 */
export function setupConversationHandlers(): void {
  // Save conversation
  ipcMain.handle('conversation:save', async (_, { moduleId, conversationId, data }) => {
    try {
      await storage.saveConversation(moduleId, conversationId, data);
      return { success: true };
    } catch (error) {
      console.error('[IPC] Failed to save conversation:', error);
      throw error;
    }
  });

  // Get conversation
  ipcMain.handle('conversation:get', async (_, { moduleId, conversationId }) => {
    try {
      const data = await storage.getConversation(moduleId, conversationId);
      return data;
    } catch (error) {
      console.error('[IPC] Failed to get conversation:', error);
      return null;
    }
  });

  // List conversations
  ipcMain.handle('conversation:list', async (_, { moduleId }) => {
    try {
      const ids = await storage.listConversations(moduleId);
      return ids;
    } catch (error) {
      console.error('[IPC] Failed to list conversations:', error);
      return [];
    }
  });

  // Delete conversation
  ipcMain.handle('conversation:delete', async (_, { moduleId, conversationId }) => {
    try {
      await storage.deleteConversation(moduleId, conversationId);
      return { success: true };
    } catch (error) {
      console.error('[IPC] Failed to delete conversation:', error);
      throw error;
    }
  });

  // Delete all conversations
  ipcMain.handle('conversation:deleteAll', async (_, { moduleId }) => {
    try {
      await storage.deleteAllConversations(moduleId);
      return { success: true };
    } catch (error) {
      console.error('[IPC] Failed to delete all conversations:', error);
      throw error;
    }
  });
}