import { useState, useEffect, useCallback, useRef } from 'react';
import ConversationService, { ConversationData } from '../services/ConversationService';

export interface UseConversationOptions {
  moduleId: string;
  autoLoad?: boolean;
}

export interface UseConversationReturn {
  // State
  conversations: string[];
  currentConversationId: string | null;
  currentConversation: ConversationData | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadConversations: () => Promise<void>;
  loadConversation: (conversationId: string) => Promise<ConversationData | null>;
  createConversation: (initialMessage?: string) => Promise<string>;
  deleteConversation: (conversationId: string) => Promise<void>;
  deleteAllConversations: () => Promise<void>;
  addMessage: (
    role: 'user' | 'assistant' | 'system' | 'tool',
    content: string,
    tokenUsage?: number,
    backendConversationId?: string
  ) => Promise<ConversationData | null>;
  updateToolOutputs: (toolOutputs: Record<string, {
    output: string;
    isError: boolean;
    terminalId?: string;
  }>) => Promise<ConversationData | null>;
  updateQuestionAnswers: (questionAnswers: Record<string, string>) => Promise<ConversationData | null>;
  updateFileStats: (stats: {
    totalFiles: number;
    totalAdditions: number;
    totalDeletions: number;
    responseNumber?: number;
  }) => Promise<ConversationData | null>;
  setActiveConversation: (conversationId: string | null) => void;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing conversations in a specific module
 */
export function useConversation({
  moduleId,
  autoLoad = true,
}: UseConversationOptions): UseConversationReturn {
  const [conversations, setConversations] = useState<string[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentConversation, setCurrentConversation] = useState<ConversationData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Load all conversation IDs
  const loadConversations = useCallback(async () => {
    if (!moduleId) return;
    setIsLoading(true);
    setError(null);
    try {
      const ids = await ConversationService.list(moduleId);
      if (isMounted.current) {
        setConversations(ids);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to load conversations');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [moduleId]);

  // Load a specific conversation
  const loadConversation = useCallback(async (conversationId: string) => {
    if (!moduleId || !conversationId) return null;
    setIsLoading(true);
    setError(null);
    try {
      const data = await ConversationService.get(moduleId, conversationId);
      if (isMounted.current) {
        setCurrentConversation(data);
        setCurrentConversationId(conversationId);
      }
      return data;
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to load conversation');
      }
      return null;
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [moduleId]);

  // Create a new conversation
  const createConversation = useCallback(async (initialMessage?: string) => {
    if (!moduleId) throw new Error('moduleId is required');
    setIsLoading(true);
    setError(null);
    try {
      const { conversationId, data } = await ConversationService.create(
        moduleId,
        initialMessage
      );
      if (isMounted.current) {
        setConversations((prev) => [conversationId, ...prev]);
        setCurrentConversation(data);
        setCurrentConversationId(conversationId);
      }
      return conversationId;
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to create conversation');
      }
      throw err;
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [moduleId]);

  // Delete a conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!moduleId) return;
    setIsLoading(true);
    setError(null);
    try {
      await ConversationService.delete(moduleId, conversationId);
      if (isMounted.current) {
        setConversations((prev) => prev.filter((id) => id !== conversationId));
        if (currentConversationId === conversationId) {
          setCurrentConversation(null);
          setCurrentConversationId(null);
        }
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to delete conversation');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [moduleId, currentConversationId]);

  // Delete all conversations
  const deleteAllConversations = useCallback(async () => {
    if (!moduleId) return;
    setIsLoading(true);
    setError(null);
    try {
      await ConversationService.deleteAll(moduleId);
      if (isMounted.current) {
        setConversations([]);
        setCurrentConversation(null);
        setCurrentConversationId(null);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to delete all conversations');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [moduleId]);

  // Add a message to the current conversation
  const addMessage = useCallback(async (
    role: 'user' | 'assistant' | 'system' | 'tool',
    content: string,
    tokenUsage?: number,
    backendConversationId?: string
  ) => {
    if (!moduleId || !currentConversationId) {
      throw new Error('No active conversation');
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await ConversationService.addMessage(
        moduleId,
        currentConversationId,
        role,
        content,
        tokenUsage,
        backendConversationId
      );
      if (isMounted.current) {
        setCurrentConversation(data);
      }
      return data;
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to add message');
      }
      throw err;
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [moduleId, currentConversationId]);

  // Update tool outputs
  const updateToolOutputs = useCallback(async (toolOutputs: Record<string, {
    output: string;
    isError: boolean;
    terminalId?: string;
  }>) => {
    if (!moduleId || !currentConversationId) {
      throw new Error('No active conversation');
    }
    try {
      const data = await ConversationService.updateToolOutputs(
        moduleId,
        currentConversationId,
        toolOutputs
      );
      if (isMounted.current) {
        setCurrentConversation(data);
      }
      return data;
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to update tool outputs');
      }
      throw err;
    }
  }, [moduleId, currentConversationId]);

  // Update question answers
  const updateQuestionAnswers = useCallback(async (questionAnswers: Record<string, string>) => {
    if (!moduleId || !currentConversationId) {
      throw new Error('No active conversation');
    }
    try {
      const data = await ConversationService.updateQuestionAnswers(
        moduleId,
        currentConversationId,
        questionAnswers
      );
      if (isMounted.current) {
        setCurrentConversation(data);
      }
      return data;
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to update question answers');
      }
      throw err;
    }
  }, [moduleId, currentConversationId]);

  // Update file stats
  const updateFileStats = useCallback(async (stats: {
    totalFiles: number;
    totalAdditions: number;
    totalDeletions: number;
    responseNumber?: number;
  }) => {
    if (!moduleId || !currentConversationId) {
      throw new Error('No active conversation');
    }
    try {
      const data = await ConversationService.updateFileStats(
        moduleId,
        currentConversationId,
        stats
      );
      if (isMounted.current) {
        setCurrentConversation(data);
      }
      return data;
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to update file stats');
      }
      throw err;
    }
  }, [moduleId, currentConversationId]);

  // Set current conversation
  const setActiveConversation = useCallback((conversationId: string | null) => {
    if (conversationId) {
      loadConversation(conversationId);
    } else {
      setCurrentConversationId(null);
      setCurrentConversation(null);
    }
  }, [loadConversation]);

  // Refresh everything
  const refresh = useCallback(async () => {
    await loadConversations();
    if (currentConversationId) {
      await loadConversation(currentConversationId);
    }
  }, [loadConversations, loadConversation, currentConversationId]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && moduleId) {
      loadConversations();
    }
  }, [autoLoad, moduleId, loadConversations]);

  return {
    conversations,
    currentConversationId,
    currentConversation,
    isLoading,
    error,
    loadConversations,
    loadConversation,
    createConversation,
    deleteConversation,
    deleteAllConversations,
    addMessage,
    updateToolOutputs,
    updateQuestionAnswers,
    updateFileStats,
    setActiveConversation,
    refresh,
  };
}

export default useConversation;