import { useEffect, useRef } from "react";
import { Message } from "../../types/message";
import { ChatSession } from "../../types/chat";
import { saveConversation } from "../../services/ConversationService";

interface UseConversationPersistenceProps {
  currentConversationId: string | null;
  currentChat: ChatSession | null;
  messages: Message[];
  toolOutputs: any;
  singleLineReviewActions: any;
  conversationFileStats: {
    totalFiles: number;
    totalAdditions: number;
    totalDeletions: number;
  };
}

/**
 * Hook to persist conversation data to storage
 */
export const useConversationPersistence = ({
  currentConversationId,
  currentChat,
  messages,
  toolOutputs,
  singleLineReviewActions,
  conversationFileStats,
}: UseConversationPersistenceProps) => {
  const renderCountRef = useRef(0);
  const toolOutputsSaveCountRef = useRef(0);
  const reviewActionsSaveCountRef = useRef(0);
  const fileStatsSaveCountRef = useRef(0);

  renderCountRef.current += 1;

  // Persist toolOutputs
  useEffect(() => {
    console.log('[Persistence] toolOutputs effect triggered:', {
      conversationId: currentConversationId,
      toolOutputsCount: Object.keys(toolOutputs).length,
      renderCount: renderCountRef.current,
    });

    if (!currentConversationId || Object.keys(toolOutputs).length === 0) {
      console.log('[Persistence] toolOutputs skipped: no conversationId or empty');
      return;
    }

    toolOutputsSaveCountRef.current += 1;

    const sessionId = currentChat?.sessionId || -1;
    const folderPath = currentChat?.folderPath || null;
    console.log('[Persistence] saving toolOutputs:', {
      conversationId: currentConversationId,
      sessionId,
      folderPath,
      toolOutputsCount: Object.keys(toolOutputs).length,
      saveCount: toolOutputsSaveCountRef.current,
    });
    saveConversation(
      sessionId,
      folderPath,
      messages,
      currentConversationId,
      currentChat || undefined,
      true,
      undefined,
      undefined,
      toolOutputs,
    );
  }, [toolOutputs, currentConversationId, currentChat, messages]);

  // Persist singleLineReviewActions
  useEffect(() => {
    console.log('[Persistence] singleLineReviewActions effect triggered:', {
      conversationId: currentConversationId,
      reviewActionsCount: Object.keys(singleLineReviewActions).length,
      renderCount: renderCountRef.current,
    });

    if (
      !currentConversationId ||
      Object.keys(singleLineReviewActions).length === 0
    ) {
      console.log('[Persistence] singleLineReviewActions skipped: no conversationId or empty');
      return;
    }

    reviewActionsSaveCountRef.current += 1;

    const sessionId = currentChat?.sessionId || -1;
    const folderPath = currentChat?.folderPath || null;
    console.log('[Persistence] saving singleLineReviewActions:', {
      conversationId: currentConversationId,
      sessionId,
      folderPath,
      reviewActionsCount: Object.keys(singleLineReviewActions).length,
      saveCount: reviewActionsSaveCountRef.current,
    });
    saveConversation(
      sessionId,
      folderPath,
      messages,
      currentConversationId,
      currentChat || undefined,
      true,
      undefined,
      undefined,
      undefined,
      singleLineReviewActions,
    );
  }, [singleLineReviewActions, currentConversationId, currentChat, messages]);

  // Persist conversationFileStats
  useEffect(() => {
    console.log('[Persistence] conversationFileStats effect triggered:', {
      conversationId: currentConversationId,
      fileStats: conversationFileStats,
      renderCount: renderCountRef.current,
    });

    if (!currentConversationId || conversationFileStats.totalFiles === 0) {
      console.log('[Persistence] conversationFileStats skipped: no conversationId or empty');
      return;
    }

    fileStatsSaveCountRef.current += 1;

    const sessionId = currentChat?.sessionId || -1;
    const folderPath = currentChat?.folderPath || null;
    console.log('[Persistence] saving conversationFileStats:', {
      conversationId: currentConversationId,
      sessionId,
      folderPath,
      fileStats: conversationFileStats,
      saveCount: fileStatsSaveCountRef.current,
    });
    saveConversation(
      sessionId,
      folderPath,
      messages,
      currentConversationId,
      currentChat || undefined,
      true,
      undefined,
      undefined,
      undefined,
      undefined,
      conversationFileStats,
    );
  }, [conversationFileStats, currentConversationId, currentChat, messages]);
};