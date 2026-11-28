import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import type { ConversationItem } from '../types';
import { resolveHistoryScope } from '../services/history-context.service';
import {
  loadConversationSummaries,
  deleteConversation as deleteConversationData,
  clearConversations,
} from '../services/conversation-history.service';
import { getItemTimestamp } from '../utils/history.utils';

export const useConversationHistory = (isOpen: boolean) => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  /** Generation ID: chỉ request mới nhất được ghi state (stale-response guard). */
  const requestIdRef = useRef(0);
  const conversationsRef = useRef<ConversationItem[]>([]);
  conversationsRef.current = conversations;

  const loadHistory = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const isStale = () => requestId !== requestIdRef.current;

    const scope = resolveHistoryScope();
    if (!scope) {
      console.warn('[useConversationHistory] No active moduleId/folderPath, cannot load history');
      // Không để list của scope trước hiển thị nhầm
      setConversations([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { items, failedCount } = await loadConversationSummaries(scope.key);
      if (isStale()) return;

      setConversations(items);
      if (failedCount > 0) {
        setError(`${failedCount} conversation(s) could not be loaded.`);
      }
    } catch (err) {
      if (isStale()) return;
      console.error('[useConversationHistory] Failed to load history:', err);
      setConversations([]);
      setError('Failed to load history.');
    } finally {
      if (!isStale()) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    loadHistory();
    // Đóng panel / unmount → mọi request đang chạy trở thành stale
    return () => {
      requestIdRef.current++;
    };
  }, [isOpen, loadHistory]);

  /** Trả true khi xóa thành công. Chỉ cập nhật state nếu scope chưa đổi. */
  const deleteConversation = useCallback(async (id: string): Promise<boolean> => {
    const scope = resolveHistoryScope();
    if (!scope) {
      console.warn('[useConversationHistory] No active moduleId/folderPath, cannot delete conversation');
      setError('Cannot delete: no active workspace.');
      return false;
    }

    try {
      await deleteConversationData(scope.key, id);
      if (resolveHistoryScope()?.key === scope.key) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
      }
      return true;
    } catch (err) {
      console.error('[useConversationHistory] Failed to delete conversation:', err);
      setError('Failed to delete conversation.');
      return false;
    }
  }, []);

  /** Trả true khi xóa thành công. */
  const clearAllHistory = useCallback(async (): Promise<boolean> => {
    const scope = resolveHistoryScope();
    if (!scope) {
      console.warn('[useConversationHistory] No active moduleId/folderPath, cannot clear history');
      setError('Cannot clear: no active workspace.');
      return false;
    }

    try {
      const ids = conversationsRef.current.map((c) => c.id);
      await clearConversations(scope.key, ids);
      if (resolveHistoryScope()?.key === scope.key) {
        setConversations([]);
      }
      return true;
    } catch (err) {
      console.error('[useConversationHistory] Failed to clear all history:', err);
      setError('Failed to clear history.');
      return false;
    }
  }, []);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return conversations
      .filter((item) => item.title.toLowerCase().includes(q) || item.preview.toLowerCase().includes(q))
      .sort((a, b) => getItemTimestamp(b) - getItemTimestamp(a));
  }, [conversations, searchQuery]);

  return {
    conversations: filteredConversations,
    totalCount: conversations.length,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    deleteConversation,
    clearAllHistory,
    refreshHistory: loadHistory,
  };
};
