import { useState, useEffect, useCallback, useMemo } from 'react';

import { ConversationItem } from '../types';
import ConversationService, { getWorkspaceFolderPath } from '../../../services/ConversationService';
import { useCodeStore } from '@renderer/modules/Code/hooks/useCodeStore';

/**
 * Get moduleId from current context
 */
function getCurrentModuleId(): string | null {
  const feature = (window as any).__activeFeature;
  const targetId = (window as any).__activeTargetId;
  const projectId = (window as any).__currentProjectId;

  if (feature === 'emulate' && targetId) {
    return `emulate:${targetId}`;
  } else if (feature === 'code' && projectId) {
    return `code:${projectId}`;
  } else if (feature === 'recon' && targetId) {
    return `recon:${targetId}`;
  } else if (feature === 'design' && (window as any).__activeDesignId) {
    return `design:${(window as any).__activeDesignId}`;
  }

  return null;
}

/**
 * Key lưu conversation dùng CHUNG với Zen: hash của workspace folder path.
 * Fallback về moduleId khi chưa có workspace (giống ConversationStorage).
 */
export function getHistoryKey(): string | null {
  const folderPath = getWorkspaceFolderPath();
  if (folderPath) return folderPath;

  // Fallback: đọc trực tiếp từ Code store (project path thật) — đảm bảo
  // cùng key hash với Chat kể cả khi __zenWorkspaceFolderPath chưa được set.
  try {
    const state = useCodeStore.getState();
    const project = state.projects?.find((p) => p.id === state.currentProjectId);
    if (project?.path) {
      (window as any).__zenWorkspaceFolderPath = project.path;
      return project.path;
    }
  } catch {
    // ignore
  }

  return getCurrentModuleId();
}

export const useConversationHistory = (isOpen: boolean) => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSort, setSelectedSort] = useState<'recent' | 'oldest'>('recent');

  const loadHistory = useCallback(async () => {
    const moduleId = getHistoryKey();
    if (!moduleId) {
      console.warn('[useConversationHistory] No active moduleId/folderPath, cannot load history');
      return;
    }

    setIsLoading(true);
    try {
      // Get list of conversation IDs
      const conversationIds = await ConversationService.list(moduleId);

      // Load each conversation's data
      const conversationsData = await Promise.all(
        conversationIds.map(async (id) => {
          try {
            const data = await ConversationService.get(moduleId, id);
            if (!data) return null;

            // Convert to ConversationItem format
            const firstMessage = data.messages[0];
            const title = firstMessage?.content.substring(0, 100) || 'New Conversation';
            const preview = data.messages
              .slice(0, 3)
              .map((m) => m.content.substring(0, 50))
              .join(' ');

            // Extract metadata from messages
            // Note: Cast to any because Message type in ConversationService might not yet expose these optional fields fully typed,
            // but they are present in the runtime payload from IPC.
            let providerId: string | undefined;
            let modelId: string | undefined;
            let totalTokenUsage = 0;
            let totalRequests = 0;

            for (const rawMsg of data.messages) {
              const msg = rawMsg as any;
              if (msg.role === 'user') {
                totalRequests++;
              }
              if (msg.role === 'assistant') {
                if (!providerId && msg.providerId) providerId = msg.providerId;
                if (!modelId && msg.modelId) modelId = msg.modelId;
                if (!msg.isError && msg.tokenUsage) {
                  totalTokenUsage += msg.tokenUsage;
                }
              }
            }

            return {
              id: data.conversationId,
              title,
              preview,
              timestamp: data.createdAt,
              lastModified: data.lastModified,
              createdAt: data.createdAt,
              messageCount: data.messages.length,
              sessionId: -1, // Legacy field, not used in new system
              folderPath: null, // Legacy field, not used in new system
              tabId: -1,
              totalRequests,
              totalTokenUsage,
              providerId,
              modelId,
              workflowAgentId:
                data.conversationOverrides?.workflowAgentId ?? data.workflowAgentId ?? null,
            } as ConversationItem;
          } catch (error) {
            console.warn(`[useConversationHistory] Failed to load conversation ${id}:`, error);
            return null;
          }
        }),
      );

      // Filter out nulls
      const validConversations = conversationsData.filter(
        (c): c is ConversationItem => c !== null && c.messageCount > 0,
      );
      setConversations(validConversations);
    } catch (error) {
      console.error('[useConversationHistory] Failed to load history:', error);
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, loadHistory]);

  const deleteConversation = useCallback(async (id: string) => {
    const moduleId = getHistoryKey();
    if (!moduleId) {
      console.warn('[useConversationHistory] No active moduleId/folderPath, cannot delete conversation');
      return;
    }

    try {
      await ConversationService.delete(moduleId, id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error('[useConversationHistory] Failed to delete conversation:', error);
    }
  }, []);

  const clearAllHistory = useCallback(async () => {
    const moduleId = getHistoryKey();
    if (!moduleId) {
      console.warn('[useConversationHistory] No active moduleId/folderPath, cannot clear history');
      return;
    }

    try {
      await ConversationService.deleteAll(moduleId);
      setConversations([]);
    } catch (error) {
      console.error('[useConversationHistory] Failed to clear all history:', error);
    }
  }, []);

  const filteredConversations = useMemo(() => {
    return conversations
      .filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.preview.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .sort((a, b) => {
        const timeA = new Date(a.lastModified || a.timestamp || a.createdAt || 0).getTime();
        const timeB = new Date(b.lastModified || b.timestamp || b.createdAt || 0).getTime();
        if (selectedSort === 'recent') {
          return timeB - timeA;
        } else {
          return timeA - timeB;
        }
      });
  }, [conversations, searchQuery, selectedSort]);

  return {
    conversations: filteredConversations,
    totalCount: conversations.length,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedSort,
    setSelectedSort,
    deleteConversation,
    clearAllHistory,
    refreshHistory: loadHistory,
  };
};