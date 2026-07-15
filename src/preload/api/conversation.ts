import { IpcRendererEvent } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

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
  toolOutputs?: Record<string, {
    output: string;
    isError: boolean;
    terminalId?: string;
  }>;
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

export const conversationAPI = {
  /**
   * Save a conversation
   */
  saveConversation: (
    moduleId: string,
    conversationId: string,
    data: ConversationData
  ): Promise<void> => {
    return electronAPI.ipcRenderer.invoke('conversation:save', {
      moduleId,
      conversationId,
      data,
    });
  },

  /**
   * Get a conversation
   */
  getConversation: (
    moduleId: string,
    conversationId: string
  ): Promise<ConversationData | null> => {
    return electronAPI.ipcRenderer.invoke('conversation:get', {
      moduleId,
      conversationId,
    });
  },

  /**
   * List all conversation IDs for a module
   */
  listConversations: (
    moduleId: string
  ): Promise<string[]> => {
    return electronAPI.ipcRenderer.invoke('conversation:list', {
      moduleId,
    });
  },

  /**
   * Delete a conversation
   */
  deleteConversation: (
    moduleId: string,
    conversationId: string
  ): Promise<void> => {
    return electronAPI.ipcRenderer.invoke('conversation:delete', {
      moduleId,
      conversationId,
    });
  },

  /**
   * Delete all conversations for a module
   */
  deleteAllConversations: (
    moduleId: string
  ): Promise<void> => {
    return electronAPI.ipcRenderer.invoke('conversation:deleteAll', {
      moduleId,
    });
  },

  /**
   * Listen for conversation events
   */
  on: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => {
    electronAPI.ipcRenderer.on(channel, listener);
  },

  off: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => {
    electronAPI.ipcRenderer.removeListener(channel, listener);
  },
};