import { useState, useEffect, useCallback, useMemo } from 'react';
import { ConversationItem } from '../types';
import ConversationService from '../../../services/ConversationService';

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
  }

  return null;
}

export const useConversationHistory = (isOpen: boolean) => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSort, setSelectedSort] = useState<'recent' | 'oldest'>('recent');

  const loadHistory = useCallback(async () => {
    const moduleId = getCurrentModuleId();
    if (!moduleId) {
      console.warn('[useConversationHistory] No active moduleId, cannot load history');
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
            const preview = data.messages.slice(0, 3).map(m => m.content.substring(0, 50)).join(' ');

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
            } as ConversationItem;
          } catch (error) {
            console.error(`[useConversationHistory] Failed to load conversation ${id}:`, error);
            return null;
          }
        })
      );

      // Filter out nulls
      const validConversations = conversationsData.filter((c): c is ConversationItem => c !== null);
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
    const moduleId = getCurrentModuleId();
    if (!moduleId) {
      console.warn('[useConversationHistory] No active moduleId, cannot delete conversation');
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
    const moduleId = getCurrentModuleId();
    if (!moduleId) {
      console.warn('[useConversationHistory] No active moduleId, cannot clear history');
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
