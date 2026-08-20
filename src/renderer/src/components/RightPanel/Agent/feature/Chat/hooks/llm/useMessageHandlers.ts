/**
 * ------------------------------------------------------------------
 * useMessageHandlers (LLM)
 * ------------------------------------------------------------------
 * Hook xử lý external messages liên quan đến action click/reject.
 * Lắng nghe VSCode messages và cập nhật state tương ứng.
 *
 * Main features:
 * - Xử lý markActionClicked → cập nhật clickedActions
 * - Xử lý markActionRejected → cập nhật rejectedActions
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useEffect } from 'react';

// ── Types ──
import { Message } from '../../types/message';
import { ChatSession } from '../../types/chat';

// ── Services ──
import { saveConversation } from '../../services/ConversationService';

// ─── Types ──────────────────────────────────────────────────────────────
interface UseMessageHandlersProps {
  selectedTab: ChatSession | null;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  currentConversationIdRef: React.MutableRefObject<string>;
  backendConversationIdRef: React.MutableRefObject<string>;
}

export const useMessageHandlers = ({
  selectedTab,
  setMessages,
  currentConversationIdRef,
  backendConversationIdRef,
}: UseMessageHandlersProps) => {
  useEffect(() => {
    let handlerCallCount = 0;

    const handleMessage = (event: MessageEvent) => {
      handlerCallCount++;
      const { command, actionId } = event.data;

      if ((command === 'markActionClicked' || command === 'markActionFailed') && actionId) {
        const messageId = actionId.split('-action-')[0];
        if (messageId) {
          setMessages((prev) => {
            const updated = prev.map((m) => {
              if (m.id === messageId) {
                const currentClicked = m.clickedActions || [];
                if (!currentClicked.includes(actionId)) {
                  return {
                    ...m,
                    clickedActions: [...currentClicked, actionId],
                  };
                }
              }
              return m;
            });

            // Persist the changes
            const sessionId = selectedTab?.sessionId || -1;
            const folderPath = selectedTab?.folderPath || null;
            saveConversation(
              sessionId,
              folderPath,
              updated,
              currentConversationIdRef.current,
              true,
              backendConversationIdRef.current,
            );

            return updated;
          });
        }
      }

      if (command === 'markActionRejected' && actionId) {
        const messageId = actionId.split('-action-')[0];
        if (messageId) {
          setMessages((prev) => {
            const updated = prev.map((m) => {
              if (m.id === messageId) {
                const currentRejected = m.rejectedActions || [];
                if (!currentRejected.includes(actionId)) {
                  return {
                    ...m,
                    rejectedActions: [...currentRejected, actionId],
                  };
                }
              }
              return m;
            });

            const sessionId = selectedTab?.sessionId || -1;
            const folderPath = selectedTab?.folderPath || null;
            saveConversation(
              sessionId,
              folderPath,
              updated,
              currentConversationIdRef.current,
              true,
              backendConversationIdRef.current,
            );

            return updated;
          });
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [selectedTab, setMessages, currentConversationIdRef, backendConversationIdRef]);
};
