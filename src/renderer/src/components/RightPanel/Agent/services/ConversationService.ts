import { logger } from '@renderer/utils/logger';

// Access conversation API through window.api
const conversationAPI = window.api.conversation;

/**
 * ConversationService — quản lý persist conversations qua localStorage (keyed theo moduleId).
 *
 *    listConversations()       : Lấy danh sách conversation IDs.
 *    getConversation(id)       : Load 1 conversation.
 *    saveConversation(data)    : Lưu conversation.
 *    deleteConversation(id)    : Xóa 1 conversation.
 *    deleteAllConversations()  : Xóa tất cả.
 *    addMessage(id, msg)       : Thêm message vào conversation.
 *    updateTokenUsage(id, ...) : Cập nhật token usage.
 */

// TYPES
export interface ConversationData {
  conversationId: string;
  backendConversationId?: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    timestamp: number;
    tokenUsage?: number;
    conversationId?: string;
  }>;
  toolOutputs?: Record<
    string,
    {
      output: string;
      isError: boolean;
      terminalId?: string;
    }
  >;
  questionAnswers?: Record<string, string>;
  singleLineReviewActions?: Record<string, any>;
  conversationFileStats?: {
    totalFiles: number;
    totalAdditions: number;
    totalDeletions: number;
    responseNumber?: number;
  };
  createdAt: number;
  lastModified: number;
}

/**
 * Generate a unique conversation ID
 */
export function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export const ConversationService = {
  /**
   * Save a conversation
   */
  save: async (moduleId: string, conversationId: string, data: ConversationData): Promise<void> => {
    return conversationAPI.saveConversation(moduleId, conversationId, data);
  },

  /**
   * Get a conversation
   */
  get: async (moduleId: string, conversationId: string): Promise<ConversationData | null> => {
    const data = await conversationAPI.getConversation(moduleId, conversationId);
    if (data) {
    } else {
      logger.warn('[ConversationService] ⚠️ Conversation not found:', {
        moduleId,
        conversationId,
      });
    }
    return data;
  },

  /**
   * List all conversation IDs for a module
   */
  list: async (moduleId: string): Promise<string[]> => {
    return conversationAPI.listConversations(moduleId);
  },

  /**
   * Delete a conversation
   */
  delete: async (moduleId: string, conversationId: string): Promise<void> => {
    return conversationAPI.deleteConversation(moduleId, conversationId);
  },

  /**
   * Delete all conversations for a module
   */
  deleteAll: async (moduleId: string): Promise<void> => {
    return conversationAPI.deleteAllConversations(moduleId);
  },

  /**
   * Create a new conversation with initial message
   */
  create: async (
    moduleId: string,
    initialMessage?: string,
  ): Promise<{ conversationId: string; data: ConversationData }> => {
    const conversationId = generateConversationId();
    const now = Date.now();

    const data: ConversationData = {
      conversationId,
      messages: initialMessage
        ? [
            {
              id: generateMessageId(),
              role: 'user',
              content: initialMessage,
              timestamp: now,
            },
          ]
        : [],
      createdAt: now,
      lastModified: now,
    };

    await ConversationService.save(moduleId, conversationId, data);
    return { conversationId, data };
  },

  /**
   * Add a message to an existing conversation
   */
  addMessage: async (
    moduleId: string,
    conversationId: string,
    role: 'user' | 'assistant' | 'system' | 'tool',
    content: string,
    tokenUsage?: number,
    backendConversationId?: string,
  ): Promise<ConversationData | null> => {
    const data = await ConversationService.get(moduleId, conversationId);
    if (!data) return null;

    const message = {
      id: generateMessageId(),
      role,
      content,
      timestamp: Date.now(),
      tokenUsage,
      conversationId: backendConversationId,
    };

    data.messages.push(message);
    data.lastModified = Date.now();

    await ConversationService.save(moduleId, conversationId, data);
    return data;
  },

  /**
   * Update tool outputs for a conversation
   */
  updateToolOutputs: async (
    moduleId: string,
    conversationId: string,
    toolOutputs: Record<
      string,
      {
        output: string;
        isError: boolean;
        terminalId?: string;
      }
    >,
  ): Promise<ConversationData | null> => {
    const data = await ConversationService.get(moduleId, conversationId);
    if (!data) return null;

    data.toolOutputs = {
      ...(data.toolOutputs || {}),
      ...toolOutputs,
    };
    data.lastModified = Date.now();

    await ConversationService.save(moduleId, conversationId, data);
    return data;
  },

  /**
   * Update question answers for a conversation
   */
  updateQuestionAnswers: async (
    moduleId: string,
    conversationId: string,
    questionAnswers: Record<string, string>,
  ): Promise<ConversationData | null> => {
    const data = await ConversationService.get(moduleId, conversationId);
    if (!data) return null;

    data.questionAnswers = {
      ...(data.questionAnswers || {}),
      ...questionAnswers,
    };
    data.lastModified = Date.now();

    await ConversationService.save(moduleId, conversationId, data);
    return data;
  },

  /**
   * Update conversation file stats
   */
  updateFileStats: async (
    moduleId: string,
    conversationId: string,
    stats: {
      totalFiles: number;
      totalAdditions: number;
      totalDeletions: number;
      responseNumber?: number;
    },
  ): Promise<ConversationData | null> => {
    const data = await ConversationService.get(moduleId, conversationId);
    if (!data) return null;

    data.conversationFileStats = stats;
    data.lastModified = Date.now();

    await ConversationService.save(moduleId, conversationId, data);
    return data;
  },
};

export default ConversationService;
