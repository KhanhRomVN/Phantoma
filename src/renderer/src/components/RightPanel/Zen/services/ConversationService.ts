/**
 * ------------------------------------------------------------------
 * ConversationService
 * ------------------------------------------------------------------
 * Quản lý persist conversations qua IPC (Electron main), dùng CHUNG
 * nguồn lưu với Zen: ~/.khanhromvn-zen/projects/{md5(folderPath)}/.
 *
 * Main functions:
 * - list()             : Lấy danh sách conversation IDs
 * - get()              : Load 1 conversation
 * - save()             : Lưu conversation
 * - delete()           : Xóa 1 conversation
 * - deleteAll()        : Xóa tất cả conversations
 * - addMessage()       : Thêm message vào conversation
 * - updateTokenUsage() : Cập nhật token usage
 * ------------------------------------------------------------------
 */

import { useCodeStore } from '@renderer/modules/Code/hooks/useCodeStore';

// Lazy accessor — defer evaluation tới lúc call thật sự.
// Trong dev/browser mode (Vite), window.api chưa được inject bởi preload →
// capture top-level sẽ crash ngay khi module load. Getter này trả về null
// an toàn, các method bên dưới check và fallback gracefully.
function getConversationAPI(): any {
  const api = (typeof window !== 'undefined' && (window as any).api) || null;
  if (!api || typeof api.invoke !== 'function') {
    // Dev-mode silent warn — chỉ log 1 lần mỗi phiên để tránh spam console
    if (!(getConversationAPI as any)._warned) {
      (getConversationAPI as any)._warned = true;
      console.warn(
        '[ConversationService] window.api unavailable — running in dev/browser mode. Persistence disabled.',
      );
    }
    return null;
  }
  return api;
}

/**
 * Workspace folder path hiện tại — chính là key hash mà Zen dùng để
 * phân vùng conversation (PathService.getProjectContextDir).
 * Được set global bởi AgentPanel/Home (window.__zenWorkspaceFolderPath).
 */
export function getWorkspaceFolderPath(): string | null {
  const p = (window as any).__zenWorkspaceFolderPath;
  if (typeof p === 'string' && p.length > 0) return p;

  // Fallback: đọc project path thật từ Code store, đảm bảo Chat và History
  // luôn hash cùng một key bất kể thời điểm gọi.
  try {
    const state = useCodeStore.getState();
    const project = state.projects?.find((x) => x.id === state.currentProjectId);
    if (project?.path) {
      (window as any).__zenWorkspaceFolderPath = project.path;
      return project.path;
    }
  } catch {
    // ignore
  }
  return null;
}

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
    providerId?: string;
    modelId?: string;
    accountId?: string;
    isError?: boolean;
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
  /** Per-conversation feature overrides — chỉ lưu, chưa có UI để set. */
  conversationOverrides?: {
    useSkillEnabled?: boolean;
    memoryEnabled?: boolean;
    toolFormat?: 'xml' | 'json';
    workflowAgentId?: 'orchestrator' | 'planner' | 'executor' | 'reviewer' | null;
  };
  /** Workflow agent ID nếu conversation này là một workflow agent */
  workflowAgentId?: 'orchestrator' | 'planner' | 'executor' | 'reviewer' | null;
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

/**
 * Resolve folderPath key: caller-passed → global workspace folder path.
 * Phải khớp với Chat để cùng ghi/đọc 1 chỗ.
 */
function resolveFolderPath(folderPath?: string | null): string | null {
  if (folderPath) return folderPath;
  return getWorkspaceFolderPath();
}

export const ConversationService = {
  /**
   * Save a conversation
   */
  save: async (
    moduleId: string,
    conversationId: string,
    data: ConversationData,
    folderPath?: string | null,
  ): Promise<void> => {
    const api = getConversationAPI();
    if (!api) return;
    return api.invoke('conversation:save', {
      moduleId,
      conversationId,
      data,
      folderPath: resolveFolderPath(folderPath),
    });
  },

  /**
   * Get a conversation
   */
  get: async (
    moduleId: string,
    conversationId: string,
    folderPath?: string | null,
  ): Promise<ConversationData | null> => {
    const api = getConversationAPI();
    if (!api) return null;
    const data = await api.invoke('conversation:get', {
      moduleId,
      conversationId,
      folderPath: resolveFolderPath(folderPath),
    });
    if (!data) {
      console.warn('[ConversationService] ⚠️ Conversation not found:', {
        moduleId,
        conversationId,
      });
    }
    return data;
  },

  /**
   * List all conversation IDs for a module
   */
  list: async (moduleId: string, folderPath?: string | null): Promise<string[]> => {
    const api = getConversationAPI();
    if (!api) return [];
    return api.invoke('conversation:list', {
      moduleId,
      folderPath: resolveFolderPath(folderPath),
    });
  },

  /**
   * Delete a conversation
   */
  delete: async (
    moduleId: string,
    conversationId: string,
    folderPath?: string | null,
  ): Promise<void> => {
    const api = getConversationAPI();
    if (!api) return;
    return api.invoke('conversation:delete', {
      moduleId,
      conversationId,
      folderPath: resolveFolderPath(folderPath),
    });
  },

  /**
   * Delete all conversations for a module
   */
  deleteAll: async (moduleId: string, folderPath?: string | null): Promise<void> => {
    const api = getConversationAPI();
    if (!api) return;
    return api.invoke('conversation:deleteAll', {
      moduleId,
      folderPath: resolveFolderPath(folderPath),
    });
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