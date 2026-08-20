import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

// TYPES
import { Message } from '../../types/message';

interface UseMessagePaginationProps {
  messages: Message[];
  messagesPerPage?: number;
}

interface UseMessagePaginationReturn {
  visibleMessages: Message[];
  hiddenCount: number;
  loadMore: () => void;
  loadAll: () => void;
  hasHiddenMessages: boolean;
  reset: () => void;
}

export const useMessagePagination = ({
  messages,
  messagesPerPage = 10,
}: UseMessagePaginationProps): UseMessagePaginationReturn => {
  const [visiblePairsFromEnd, setVisiblePairsFromEnd] = useState(messagesPerPage);
  const prevMessageCountRef = useRef(messages.length);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!isInitializedRef.current && messages.length > 0) {
      const totalPairs = Math.floor(messages.length / 2);
      const currentWindow = Math.ceil(totalPairs / messagesPerPage);
      const pairsInCurrentWindow = totalPairs - (currentWindow - 1) * messagesPerPage;
      setVisiblePairsFromEnd(pairsInCurrentWindow);
      prevMessageCountRef.current = messages.length;
      isInitializedRef.current = true;
    }
  }, [messages.length, messagesPerPage]);

  useEffect(() => {
    if (messages.length === 0) {
      setVisiblePairsFromEnd(messagesPerPage);
      prevMessageCountRef.current = 0;
      isInitializedRef.current = false;
    }
  }, [messages.length, messagesPerPage]);

  useEffect(() => {
    const totalPairs = Math.floor(messages.length / 2);
    const prevTotalPairs = Math.floor(prevMessageCountRef.current / 2);
    const hasNewPair = totalPairs > prevTotalPairs;

    if (hasNewPair && isInitializedRef.current) {
      const pairsInCurrentWindow = totalPairs % messagesPerPage || messagesPerPage;
      const shouldReset = pairsInCurrentWindow === 1;

      if (shouldReset) {
        setVisiblePairsFromEnd(1);
      } else {
        setVisiblePairsFromEnd((prev) => prev + 1);
      }
    }

    prevMessageCountRef.current = messages.length;
  }, [messages.length, messagesPerPage]);

  const { visibleMessages, hiddenCount, totalPairs } = useMemo(() => {
    const totalPairs = Math.floor(messages.length / 2);
    const pairsToShow = Math.min(visiblePairsFromEnd, totalPairs);
    const messagesToShow = pairsToShow * 2;
    const hiddenPairs = Math.max(0, totalPairs - pairsToShow);
    const startIndex = Math.max(0, messages.length - messagesToShow);
    const visible = messages.slice(startIndex);

    return {
      visibleMessages: visible,
      hiddenCount: hiddenPairs,
      totalPairs,
    };
  }, [messages, visiblePairsFromEnd]);

  const hasHiddenMessages = hiddenCount > 0;

  const loadMore = useCallback(() => {
    setVisiblePairsFromEnd((prev) => Math.min(prev + messagesPerPage, totalPairs));
  }, [messagesPerPage, totalPairs]);

  const loadAll = useCallback(() => {
    setVisiblePairsFromEnd(totalPairs);
  }, [totalPairs]);

  const reset = useCallback(() => {
    setVisiblePairsFromEnd(messagesPerPage);
  }, [messagesPerPage]);

  return {
    visibleMessages,
    hiddenCount,
    loadMore,
    loadAll,
    hasHiddenMessages,
    reset,
  };
};
