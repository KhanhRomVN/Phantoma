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
      console.info('[IPC][conversation:save] 💾 Saving conversation:', {
        moduleId,
        conversationId,
        messageCount: data?.messages?.length || 0,
        hasToolOutputs: !!data?.toolOutputs,
        hasQuestionAnswers: !!data?.questionAnswers,
      });
      await storage.saveConversation(moduleId, conversationId, data);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC][conversation:save] ❌ Failed to save conversation:', {
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
      console.info('[IPC][conversation:get] 📖 Getting conversation:', {
        moduleId,
        conversationId,
      });
      const data = await storage.getConversation(moduleId, conversationId);
      if (data) {
        console.info('[IPC][conversation:get] ✅ Conversation loaded:', {
          moduleId,
          conversationId,
          messageCount: data.messages?.length || 0,
        });
      } else {
        console.warn('[IPC][conversation:get] ⚠️ Conversation not found:', {
          moduleId,
          conversationId,
        });
      }
      return data;
    } catch (error) {
      console.error('[IPC] Failed to get conversation:', error);
      return null;
    }
  });

  // List conversations
  ipcMain.handle('conversation:list', async (_, { moduleId }) => {
    try {
      console.info('[IPC][conversation:list] 📋 Listing conversations for moduleId:', moduleId);
      const ids = await storage.listConversations(moduleId);
      console.info('[IPC][conversation:list] ✅ Found conversations:', {
        moduleId,
        count: ids.length,
        ids: ids.slice(0, 5), // Log first 5 IDs only
      });
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
