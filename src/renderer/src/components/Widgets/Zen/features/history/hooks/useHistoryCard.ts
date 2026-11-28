/**
 * ------------------------------------------------------------------
 * useHistoryCard
 * ------------------------------------------------------------------
 * Behavior của một HistoryCard: lazy-load messages (cache-first),
 * copy content, mở folder conversation.
 * ------------------------------------------------------------------
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConversationItem, HistoryMessage } from '../types';
import { resolveHistoryScope } from '../services/history-context.service';
import { getConversationMessages } from '../services/conversation-history.service';
import { formatMessagesForCopy } from '../utils/history.utils';
import { extensionService } from '@renderer/components/Widgets/Zen/shared/services/ExtensionService';

export type CopyStatus = 'idle' | 'copied' | 'error';

const COPY_FEEDBACK_MS = 1500;

export const useHistoryCard = (item: Pick<ConversationItem, 'id'>) => {
  const [messages, setMessages] = useState<HistoryMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageFetchError, setMessageFetchError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');

  const aliveRef = useRef(true);
  const inflightRef = useRef(false);
  const loadedRef = useRef(false);
  const messagesRef = useRef<HistoryMessage[]>([]);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // Đổi conversation → reset state preview
  useEffect(() => {
    inflightRef.current = false;
    loadedRef.current = false;
    messagesRef.current = [];
    setMessages([]);
    setMessageFetchError(null);
    setIsLoadingMessages(false);
  }, [item.id]);

  /**
   * Lazy-load messages (hover/focus/click). Không fetch trùng khi đang tải
   * hoặc đã tải xong; nếu lần trước lỗi thì lần kích hoạt sau sẽ thử lại.
   */
  const loadMessages = useCallback(async (): Promise<HistoryMessage[] | null> => {
    if (loadedRef.current) return messagesRef.current;
    if (inflightRef.current) return null;

    const scope = resolveHistoryScope();
    if (!scope) {
      setMessageFetchError('No messages found');
      return null;
    }

    inflightRef.current = true;
    setIsLoadingMessages(true);
    setMessageFetchError(null);

    try {
      const result = await getConversationMessages(scope.key, item.id);
      if (!aliveRef.current) return null;
      if (result) {
        loadedRef.current = true;
        messagesRef.current = result;
        setMessages(result);
        return result;
      }
      setMessageFetchError('No messages found');
      return null;
    } catch (error) {
      console.warn('[useHistoryCard] Failed to load messages:', item.id, error);
      if (aliveRef.current) setMessageFetchError('No messages found');
      return null;
    } finally {
      inflightRef.current = false;
      if (aliveRef.current) setIsLoadingMessages(false);
    }
  }, [item.id]);

  const flashCopyStatus = useCallback((status: CopyStatus) => {
    if (!aliveRef.current) return;
    setCopyStatus(status);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => {
      if (aliveRef.current) setCopyStatus('idle');
    }, COPY_FEEDBACK_MS);
  }, []);

  const copyContent = useCallback(async (): Promise<boolean> => {
    try {
      let source: HistoryMessage[] | null = loadedRef.current ? messagesRef.current : null;
      if (!source) {
        const scope = resolveHistoryScope();
        if (!scope) throw new Error('No active history scope');
        source = await getConversationMessages(scope.key, item.id);
      }
      if (!source) throw new Error('No messages to copy');

      await navigator.clipboard.writeText(formatMessagesForCopy(source));
      flashCopyStatus('copied');
      return true;
    } catch (error) {
      console.error('[useHistoryCard] Failed to copy conversation:', error);
      flashCopyStatus('error');
      return false;
    }
  }, [item.id, flashCopyStatus]);

  const openConversationFolder = useCallback(() => {
    try {
      extensionService.postMessage({
        command: 'openConversationFolder',
        conversationId: item.id,
      });
    } catch (error) {
      console.error('[useHistoryCard] Failed to open conversation folder:', error);
    }
  }, [item.id]);

  return {
    messages,
    isLoadingMessages,
    messageFetchError,
    copyStatus,
    triggerLoad: loadMessages,
    copyContent,
    openConversationFolder,
  };
};
