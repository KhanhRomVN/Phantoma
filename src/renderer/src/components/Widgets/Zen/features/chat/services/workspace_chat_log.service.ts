/**
 * ------------------------------------------------------------------
 * Workspace Chat Log Service
 * ------------------------------------------------------------------
 * Tích hợp log chat với extension/workspace.
 *
 * Main functions:
 * - logChatToWorkspace() : Log chat activity ra workspace
 * ------------------------------------------------------------------
 */

import { extensionService } from '../../../shared/services/ExtensionService';

export const logChatToWorkspace = (chatUuid: string, message: any) => {
  try {
    const vscodeApi = (window as any).vscodeApi;
    if (!vscodeApi) {
      return;
    }

    const logEntry = { ...message };
    logEntry.timestamp = new Date().toISOString();
    logEntry.conversationId = message.conversationId;

    extensionService.postMessage({
      command: 'logChat',
      chatUuid,
      logEntry,
    });
  } catch (err) {
    console.warn('[ConversationService] Failed to log chat:', err);
  }
};
