/**
 * ------------------------------------------------------------------
 * useMessageActions
 * ------------------------------------------------------------------
 * Cung cấp các action cho message: regenerate, edit, retry.
 * Xử lý logic revert + resend dựa trên rawRequest và provider support.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────
import { Message } from '../../types/message';
import { useSettings } from '@renderer/components/RightPanel/Agent/context/SettingsContext';

// ─── Interfaces ─────────────────────────────────────────────────────────
interface UseMessageActionsProps {
  messages: Message[];
  onSendMessage?: (
    content: string,
    files?: any[],
    model?: any,
    account?: any,
    skipLogic?: boolean,
    actionIds?: string[],
    uiHidden?: boolean,
    extraOptions?: {
      user_action?: string;
      edit_message_id?: string;
      parent_message_id?: string;
    },
  ) => void | Promise<void>;
  onRevertConversation?: (messageId: string, timestamp: number) => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────
export function useMessageActions({
  messages,
  onSendMessage,
  onRevertConversation,
}: UseMessageActionsProps) {
  const { permissionMode } = useSettings();

  /**
   * Regenerate a user message: revert to this message then resend its own
   * rawRequest content unchanged.
   */
  const handleRegenerateRequest = useCallback(
    (messageId: string) => {
      const msgIndex = messages.findIndex((m) => m.id === messageId);
      if (msgIndex === -1) return;

      const userMsg = messages[msgIndex];
      if (userMsg.role !== 'user') return;
      if (!onSendMessage || !userMsg.rawRequest) return;

      const userContentMatch = userMsg.rawRequest.match(
        /<user-message>\n?([\s\S]*?)\n?<\/user-message>/,
      );
      let contentToSend: string;
      let shouldSkipLogic: boolean;

      if (userContentMatch) {
        contentToSend = userContentMatch[1];
        shouldSkipLogic = false;
      } else {
        contentToSend = userMsg.rawRequest;
        shouldSkipLogic = true;
      }

      const permissionModePattern =
        /<permission-mode>Active:\s*(approval|full-access|fullAccess)<\/permission-mode>/;
      if (!shouldSkipLogic && permissionModePattern.test(contentToSend)) {
        contentToSend = contentToSend.replace(
          permissionModePattern,
          `<permission-mode>Active: ${permissionMode}</permission-mode>`,
        );
      }

      if (userMsg.providerFid) {
        onSendMessage(
          contentToSend,
          userMsg.uploadedFiles,
          undefined,
          undefined,
          shouldSkipLogic,
          undefined,
          undefined,
          {
            user_action: 'edit',
            edit_message_id: userMsg.providerFid,
            parent_message_id: userMsg.providerParentId,
          },
        );
        return;
      }

      if (onRevertConversation) {
        onRevertConversation(messageId, userMsg.timestamp);
      }
      setTimeout(() => {
        onSendMessage(contentToSend, userMsg.uploadedFiles, undefined, undefined, shouldSkipLogic);
      }, 100);
    },
    [messages, onRevertConversation, onSendMessage, permissionMode],
  );

  /**
   * Edit a user message with new content (and optionally revert file changes).
   */
  const handleEditRequest = useCallback(
    (messageId: string, newContent: string, revert: boolean) => {
      const msgIndex = messages.findIndex((m) => m.id === messageId);
      if (msgIndex === -1) return;

      const userMsg = messages[msgIndex];
      if (userMsg.role !== 'user') return;
      if (!onSendMessage) return;

      let rawTemplate = userMsg.rawRequest || '';
      const permissionModePattern =
        /<permission-mode>Active:\s*(approval|full-access|fullAccess)<\/permission-mode>/;
      if (permissionModePattern.test(rawTemplate)) {
        rawTemplate = rawTemplate.replace(
          permissionModePattern,
          `<permission-mode>Active: ${permissionMode}</permission-mode>`,
        );
      }

      const hasWrapper = /<user-message>/.test(rawTemplate);
      const shouldSkipLogic = !hasWrapper;

      if (revert && onRevertConversation) {
        onRevertConversation(messageId, userMsg.timestamp);
        setTimeout(() => {
          onSendMessage(
            newContent,
            userMsg.uploadedFiles,
            undefined,
            undefined,
            shouldSkipLogic,
            undefined,
            undefined,
            userMsg.providerFid
              ? {
                  user_action: 'edit',
                  edit_message_id: userMsg.providerFid,
                  parent_message_id: userMsg.providerParentId,
                }
              : undefined,
          );
        }, 100);
        return;
      }

      if (userMsg.providerFid) {
        if (onRevertConversation) {
          onRevertConversation(messageId, userMsg.timestamp);
        }
        setTimeout(() => {
          onSendMessage(
            newContent,
            userMsg.uploadedFiles,
            undefined,
            undefined,
            shouldSkipLogic,
            undefined,
            undefined,
            {
              user_action: 'edit',
              edit_message_id: userMsg.providerFid,
              parent_message_id: userMsg.providerParentId,
            },
          );
        }, 100);
        return;
      }

      if (onRevertConversation) {
        onRevertConversation(messageId, userMsg.timestamp);
      }
      setTimeout(() => {
        onSendMessage(newContent, userMsg.uploadedFiles, undefined, undefined, shouldSkipLogic);
      }, 100);
    },
    [messages, onRevertConversation, onSendMessage, permissionMode],
  );

  /**
   * Retry an assistant message: find the preceding user message, revert to
   * the assistant message, then resend the user message.
   */
  const handleRetryRequest = useCallback(
    (messageId: string) => {
      const msgIndex = messages.findIndex((m) => m.id === messageId);
      if (msgIndex <= 0) return;

      let prevUserMsg: Message | null = null;
      for (let i = msgIndex - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          prevUserMsg = messages[i];
          break;
        }
      }
      if (!prevUserMsg) return;

      const targetMessage = messages[msgIndex];

      if (onRevertConversation) {
        onRevertConversation(messageId, targetMessage.timestamp);
      }

      if (onSendMessage && prevUserMsg.rawRequest) {
        setTimeout(() => {
          let rawReq = prevUserMsg!.rawRequest || '';

          const permissionModePattern =
            /<permission-mode>Active:\s*(approval|full-access|fullAccess)<\/permission-mode>/;
          if (permissionModePattern.test(rawReq)) {
            rawReq = rawReq.replace(
              permissionModePattern,
              `<permission-mode>Active: ${permissionMode}</permission-mode>`,
            );
          }

          const userContentMatch = rawReq.match(/<user-message>\n?([\s\S]*?)\n?<\/user-message>/);
          let contentToSend: string;
          let shouldSkipLogic: boolean;

          if (userContentMatch) {
            contentToSend = userContentMatch[1];
            shouldSkipLogic = false;
          } else {
            contentToSend = rawReq;
            shouldSkipLogic = true;
          }

          onSendMessage(
            contentToSend,
            prevUserMsg!.uploadedFiles,
            undefined,
            undefined,
            shouldSkipLogic,
          );
        }, 100);
      }
    },
    [messages, onRevertConversation, onSendMessage, permissionMode],
  );

  return { handleRegenerateRequest, handleEditRequest, handleRetryRequest };
}