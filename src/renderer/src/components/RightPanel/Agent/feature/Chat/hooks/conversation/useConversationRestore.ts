/**
 /**
 * ------------------------------------------------------------------
 * useConversationRestore
 * ------------------------------------------------------------------
 * Hook khôi phục conversation từ cache hoặc localStorage khi
 * load/switch conversation.
 *
 * Main features:
 * - restoreConversation()       : Load conversation từ cache → localStorage → tạo mới
 * - handleConversationNotFound(): Xử lý khi conversation không tồn tại
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useState, useEffect, useRef, useCallback } from 'react';

// ── Utils ──
import { logger } from '@renderer/utils/logger';

// ── Types ──
import { Message } from '../../types/message';
import { ChatSession } from '../../types/chat';

// ── Services ──
import { ConversationCache } from '../../services/ConversationCache';
import { deleteConversation } from '../../services/ConversationService';
import { extensionService } from '@renderer/components/RightPanel/Agent/services/ExtensionService';

interface UseConversationRestoreProps {
  currentChat: ChatSession | null;
  currentConversationId: string;
  currentConversationIdRef: React.MutableRefObject<string>;
  messagesRef: React.MutableRefObject<Message[]>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setIsProcessing: (val: boolean) => void;
  setToolOutputs: React.Dispatch<
    React.SetStateAction<Record<string, { output: string; isError: boolean; terminalId?: string }>>
  >;
  setBackendConversationId: (id: string, meta?: any) => void;
  setCurrentConversationId: (id: string) => void;
  setCurrentModel: (model: any) => void;
  setCurrentAccount: (account: any) => void;
  onBack: (contentToReturn?: string) => void;
  revertParentMessageIdRef: React.MutableRefObject<string | null>;
  setRevertInput: React.Dispatch<React.SetStateAction<{ value: string; nonce: number } | null>>;
  setLoadedConversationFileStats: React.Dispatch<
    React.SetStateAction<{
      totalFiles: number;
      totalAdditions: number;
      totalDeletions: number;
    } | null>
  >;
}

export const useConversationRestore = ({
  currentChat,
  currentConversationIdRef,
  messagesRef,
  setMessages,
  setIsProcessing,
  setToolOutputs,
  setBackendConversationId,
  setCurrentConversationId,
  setCurrentModel,
  setCurrentAccount,
  onBack,
  revertParentMessageIdRef,
  setRevertInput,
  setLoadedConversationFileStats,
}: UseConversationRestoreProps) => {
  const [isLoadingConversation, setIsLoadingConversation] = useState<boolean>(true);
  const [isRestored, setIsRestored] = useState<boolean>(false);
  const revertMessageIdRef = useRef<string | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoadingConversation) {
      loadingTimeoutRef.current = setTimeout(() => {
        logger.warn(
          '[useConversationRestore] Loading timeout reached! Forcing loading state to false',
        );
        setIsLoadingConversation(false);
      }, 10000);

      return () => {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      };
    }
    return undefined;
  }, [isLoadingConversation]);

  // Load conversation
  useEffect(() => {
    const load = async (): Promise<void> => {
      if (!currentChat) {
        // Reset all state when going back to Home (currentChat = null)
        currentConversationIdRef.current = '';
        setMessages([]);
        setIsLoadingConversation(false);
        setIsProcessing(false);
        setIsRestored(false);
        setToolOutputs({});
        setLoadedConversationFileStats(null);
        return;
      }

      // Force reset loading state at start of new session
      setIsLoadingConversation(true);
      setIsRestored(false);
      setIsProcessing(false);

      const convId = (currentChat as any).conversationId;
      if (convId) {
        const requestId = `conv-${Date.now()}-${currentChat.sessionId}`;
        extensionService.postMessage({
          command: 'getConversation',
          conversationId: convId,
          requestId,
        });
      } else {
        // New chat session - reset everything immediately
        setMessages([]);
        setCurrentConversationId('');
        setToolOutputs({});
        setLoadedConversationFileStats(null);
        setIsLoadingConversation(false);
      }
    };
    load();
  }, [currentChat?.sessionId, (currentChat as any)?.conversationId]);

  // Handle incoming messages via IPC
  useEffect(() => {
    // Listen for messageResponse (main IPC response channel)
    const unsubMessageResponse = extensionService.onMessage('messageResponse', (data: any) => {
      // Handle getConversation response
      if (data?.command === 'getConversation') {
        if (data?.error) {
          logger.error('[useConversationRestore][getConversation] Error:', data.error);
          setIsLoadingConversation(false);
          setIsProcessing(false);
          return;
        }

        if (data?.data?.messages) {
          const restoredMessages = data.data.messages.map((msg: Message, i: number) => ({
            ...msg,
            id: msg.id || `restored-${Date.now()}-${i}`,
          }));

          setMessages(restoredMessages);

          if (data.data.toolOutputs && Object.keys(data.data.toolOutputs).length > 0) {
            setToolOutputs(data.data.toolOutputs);
          }

          if (
            data.data.singleLineReviewActions &&
            Object.keys(data.data.singleLineReviewActions).length > 0
          ) {
            window.postMessage(
              {
                command: 'restoreSingleLineReviewActions',
                actions: data.data.singleLineReviewActions,
              },
              '*',
            );
          }

          const pendingParent = sessionStorage.getItem(
            `zen-revert-parent:${data.data?.conversationId}`,
          );
          if (pendingParent) revertParentMessageIdRef.current = pendingParent;

          if (data.data.messages.length > 0) {
            setIsRestored(true);
          }
          if (data.data.conversationId) {
            currentConversationIdRef.current = data.data.conversationId;
            setCurrentConversationId(data.data.conversationId);

            const lastMsgWithBackendId = [...restoredMessages]
              .reverse()
              .find((m: Message) => m.conversationId);
            const backendIdFromMsg = lastMsgWithBackendId?.conversationId;
            const lastAssistantWithMeta = [...restoredMessages]
              .reverse()
              .find((m: Message) => m.role === 'assistant' && m.providerId && m.modelId);
            const restoredMeta = lastAssistantWithMeta
              ? {
                  providerId: lastAssistantWithMeta.providerId,
                  modelId: lastAssistantWithMeta.modelId,
                  accountId: lastAssistantWithMeta.accountId,
                }
              : undefined;
            const backendIdToUse =
              backendIdFromMsg || data.data.backendConversationId || data.data.conversationId;
            setBackendConversationId(backendIdToUse, restoredMeta);

            const lastAssistantMsgForMeta = [...restoredMessages]
              .reverse()
              .find((m: Message) => m.role === 'assistant' && m.providerId && m.modelId);
            let modelToCache: any = undefined;
            let accountToCache: any = undefined;
            if (lastAssistantMsgForMeta) {
              modelToCache = {
                providerId: lastAssistantMsgForMeta.providerId!,
                id: lastAssistantMsgForMeta.modelId!,
                name: lastAssistantMsgForMeta.modelId!,
              };
              accountToCache = {
                id: lastAssistantMsgForMeta.accountId!,
                email: lastAssistantMsgForMeta.email!,
              };
              setCurrentModel(modelToCache);
              setCurrentAccount(accountToCache);
            }

            ConversationCache.set(data.data.conversationId, {
              messages: restoredMessages,
              conversationId: data.data.conversationId,
              backendConversationId: backendIdToUse,
              currentModel: modelToCache,
              currentAccount: accountToCache,
              toolOutputs: data.data.toolOutputs,
              singleLineReviewActions: data.data.singleLineReviewActions,
              conversationFileStats: data.data.conversationFileStats,
            });

            // Set loaded conversation file stats
            if (data.data.conversationFileStats) {
              setLoadedConversationFileStats(data.data.conversationFileStats);
            }
          }
        }

        setIsLoadingConversation(false);
        setIsProcessing(false);
      }
    });

    // Listen for commitError
    const unsubCommitError = extensionService.onMessage('commitError', (data: any) => {
      const errorMsg = data.error || 'Unknown git error';
      const errorMessage: Message = {
        id: `msg-error-${Date.now()}`,
        role: 'assistant',
        content: `❌ **Lỗi commit/push**\n\n\`\`\`\n${errorMsg}\n\`\`\``,
        timestamp: Date.now(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
      const vscodeApi = (window as any).vscodeApi;
      if (vscodeApi) {
        vscodeApi.postMessage({
          command: 'showError',
          message: `Lỗi commit/push: ${errorMsg.substring(0, 200)}${errorMsg.length > 200 ? '...' : ''}`,
        });
      }
    });

    // Listen for clearChatConfirmed
    const unsubClearChat = extensionService.onMessage('clearChatConfirmed', (data: any) => {
      if (data.conversationId === currentConversationIdRef.current) {
        handleClearConfirmed();
      }
    });

    // Listen for conversationRevertedError
    const unsubRevertError = extensionService.onMessage(
      'conversationRevertedError',
      (data: any) => {
        if (data.conversationId === currentConversationIdRef.current) {
          logger.warn(
            '[REVERT-DEBUG] Received conversationRevertedError from extension:',
            data.error,
          );
          setIsLoadingConversation(false);
          revertMessageIdRef.current = null;
        }
      },
    );

    // Listen for conversationReverted
    const unsubReverted = extensionService.onMessage('conversationReverted', (data: any) => {
      if (data.conversationId === currentConversationIdRef.current) {
        const targetId = revertMessageIdRef.current;
        revertMessageIdRef.current = null;
        if (targetId === '__first__') {
          deleteConversation(currentConversationIdRef.current);
          const firstUserMsg = messagesRef.current.find(
            (m) => !m.uiHidden && !m.isCancelled && m.role === 'user',
          );
          let content = firstUserMsg?.content || '';
          const match = content.match(/<zen-user-content>\n([\s\S]*?)\n<\/zen-user-content>/);
          if (match) content = match[1];
          setMessages([]);
          setIsLoadingConversation(false);
          onBack(content);
        } else {
          setMessages((prev) => {
            const idx = targetId ? prev.findIndex((m) => m.id === targetId) : -1;
            if (idx === -1) return prev;
            const msg = prev[idx];
            const match = msg.content.match(/<zen-user-content>\n([\s\S]*?)\n<\/zen-user-content>/);
            const content = match ? match[1] : msg.content;
            const prevAssistant = [...prev.slice(0, idx)]
              .reverse()
              .find((m) => m.role === 'assistant');
            revertParentMessageIdRef.current = prevAssistant?.response_message_id || null;
            if (revertParentMessageIdRef.current) {
              sessionStorage.setItem(
                `zen-revert-parent:${currentConversationIdRef.current}`,
                revertParentMessageIdRef.current,
              );
            } else {
              sessionStorage.removeItem(`zen-revert-parent:${currentConversationIdRef.current}`);
            }
            setRevertInput({ value: content, nonce: Date.now() });
            const reverted = prev.slice(0, idx);
            const existing = ConversationCache.get(currentConversationIdRef.current);
            ConversationCache.set(currentConversationIdRef.current, {
              messages: reverted,
              conversationId: currentConversationIdRef.current,
              backendConversationId: existing?.backendConversationId,
              currentModel: existing?.currentModel,
              currentAccount: existing?.currentAccount,
            });
            return reverted;
          });
          setIsLoadingConversation(false);
          setIsProcessing(false);
        }
      }
    });

    return () => {
      unsubMessageResponse();
      unsubCommitError();
      unsubClearChat();
      unsubRevertError();
      unsubReverted();
    };
  }, []); // ✅ Empty dependency - handlers persist and use refs

  const handleClearConfirmed = async () => {
    if (currentChat) {
      await deleteConversation(currentConversationIdRef.current);
      setMessages([]);
      setIsProcessing(false);
      setCurrentConversationId(Date.now().toString());
    }
  };

  const handleRevertConversation = useCallback(
    (messageId: string, timestamp: number) => {
      if (!currentConversationIdRef.current) {
        logger.warn('[REVERT-DEBUG] handleRevertConversation: no currentConversationId, aborting');
        return;
      }
      const visibleUserMessages = messagesRef.current.filter(
        (m) => !m.uiHidden && !m.isCancelled && m.role === 'user',
      );
      const isFirstMessage =
        visibleUserMessages.length > 0 && visibleUserMessages[0].id === messageId;
      revertMessageIdRef.current = isFirstMessage ? '__first__' : messageId;
      setIsLoadingConversation(true);
      extensionService.postMessage({
        command: 'revertConversation',
        conversationId: currentConversationIdRef.current,
        messageId,
        timestamp,
      });
    },
    [messagesRef],
  );

  return {
    isLoadingConversation,
    isRestored,
    setIsRestored: setIsRestored as React.Dispatch<React.SetStateAction<boolean>>,
    setIsLoadingConversation: setIsLoadingConversation as React.Dispatch<
      React.SetStateAction<boolean>
    >,
    handleRevertConversation,
    handleClearConfirmed,
    setRevertInput,
  };
};
