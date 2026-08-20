import {
  ConversationService as NewConversationService,
  ConversationData as NewConversationData,
  generateMessageId,
} from '../../../services/ConversationService';
import { extensionService } from '../../../services/ExtensionService';
import { Message } from '../types/message';
import { ConversationCache } from './ConversationCache';
import { logger } from '@renderer/utils/logger';

/**
 * Convert Message[] from Chat to New System format
 */
function convertMessagesToNewFormat(messages: Message[]): NewConversationData['messages'] {
  return messages
    .filter((m) => !m.isCancelled)
    .map((m) => ({
      id: m.id || generateMessageId(),
      role: m.role,
      content: m.content,
      timestamp: m.timestamp || Date.now(),
      tokenUsage: m.token_usage,
      conversationId: m.conversationId,
    }));
}

/**
 * Get moduleId from feature context
 * This should be called with proper context from parent component
 */
function getModuleIdFromContext(sessionId: number, folderPath: string | null): string {
  // Try to get from global feature context
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

  // Fallback to old format (will be migrated)
  const safeFolderPath = folderPath || 'global';
  return `legacy:${sessionId}:${safeFolderPath}`;
}

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
    logger.warn('[ConversationService] Failed to log chat:', err);
  }
};

export const calculateTokens = (text: string): number => {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
};

export const saveConversation = async (
  sessionId: number,
  folderPath: string | null,
  messages: Message[],
  conversationId?: string,
  skipTimestampUpdate?: boolean,
  backendConversationId?: string,
  toolOutputs?: Record<string, { output: string; isError: boolean; terminalId?: string }>,
  singleLineReviewActions?: Record<string, { action: any; actionId: string; messageId: string }>,
  conversationFileStats?: {
    totalFiles: number;
    totalAdditions: number;
    totalDeletions: number;
  },
): Promise<string> => {
  try {
    const convId = conversationId || Date.now().toString();
    const moduleId = getModuleIdFromContext(sessionId, folderPath);

    // Get existing conversation data
    let existingData: NewConversationData | null = null;
    try {
      existingData = await NewConversationService.get(moduleId, convId);
    } catch (error) {
      // Conversation doesn't exist yet, will create new
    }

    // Check cache for additional data
    const cached = ConversationCache.get(convId);
    if (cached && !existingData) {
      existingData = {
        conversationId: convId,
        backendConversationId: cached.backendConversationId,
        messages: cached.messages || [],
        toolOutputs: cached.toolOutputs,
        singleLineReviewActions: cached.singleLineReviewActions,
        conversationFileStats: cached.conversationFileStats,
        createdAt: Date.now(),
        lastModified: Date.now(),
      };
    }

    // Merge tool outputs
    const mergedToolOutputs =
      toolOutputs && Object.keys(toolOutputs).length > 0
        ? { ...(existingData?.toolOutputs || {}), ...toolOutputs }
        : existingData?.toolOutputs || undefined;

    // Merge single line review actions
    const mergedSingleLineReviewActions =
      singleLineReviewActions && Object.keys(singleLineReviewActions).length > 0
        ? {
            ...(existingData?.singleLineReviewActions || {}),
            ...singleLineReviewActions,
          }
        : existingData?.singleLineReviewActions || undefined;

    // Convert messages to new format
    const convertedMessages = convertMessagesToNewFormat(messages);

    // Prepare data for new system
    const newData: NewConversationData = {
      conversationId: convId,
      backendConversationId: backendConversationId || existingData?.backendConversationId,
      messages: convertedMessages,
      toolOutputs: mergedToolOutputs,
      questionAnswers: existingData?.questionAnswers,
      singleLineReviewActions: mergedSingleLineReviewActions,
      conversationFileStats: conversationFileStats || existingData?.conversationFileStats,
      createdAt: existingData?.createdAt || Date.now(),
      lastModified: skipTimestampUpdate ? existingData?.lastModified || Date.now() : Date.now(),
    };

    // Save to new system
    await NewConversationService.save(moduleId, convId, newData);

    // Update cache
    ConversationCache.set(convId, {
      messages: convertedMessages as Message[],
      conversationId: convId,
      backendConversationId: newData.backendConversationId,
      toolOutputs: mergedToolOutputs,
      singleLineReviewActions: mergedSingleLineReviewActions,
      conversationFileStats: conversationFileStats,
    });

    // Sync to backend (keep for compatibility)
    extensionService.postMessage({
      command: 'saveConversationState',
      conversationId: convId,
      messages: convertedMessages,
      backendConversationId: newData.backendConversationId,
      toolOutputs: mergedToolOutputs,
      singleLineReviewActions: mergedSingleLineReviewActions,
      conversationFileStats: conversationFileStats,
    });

    return convId;
  } catch (error: any) {
    logger.error('[ConversationService][saveConversation] ❌ Error:', error);
    return '';
  }
};

export const deleteConversation = async (
  conversationId?: string,
  sessionId?: number,
  folderPath?: string | null,
): Promise<boolean> => {
  if (!conversationId) return false;

  try {
    const moduleId = getModuleIdFromContext(sessionId || -1, folderPath || null);

    // Delete from cache
    ConversationCache.delete(conversationId);

    // Delete from new system
    await NewConversationService.delete(moduleId, conversationId);

    // Notify backend (keep for compatibility)
    extensionService.postMessage({
      command: 'deleteConversation',
      conversationId: conversationId,
    });

    return true;
  } catch (error) {
    logger.error('[ConversationService][deleteConversation] Error:', error);
    return false;
  }
};
