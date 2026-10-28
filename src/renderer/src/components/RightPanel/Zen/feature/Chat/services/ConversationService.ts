/**
 * ------------------------------------------------------------------
 * Conversation Service
 * ------------------------------------------------------------------
 * Service xử lý lưu/đọc/xóa conversation trong chat.
 * Chuyển đổi Message[] sang format của hệ thống mới và sync với backend.
 *
 * Main functions:
 * - saveConversation()    : Lưu conversation hiện tại
 * - deleteConversation()  : Xóa conversation theo ID
 * - calculateTokens()     : Ước tính số tokens từ text
 * - logChatToWorkspace()  : Log chat activity ra workspace
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Services ──
import {
  ConversationService as NewConversationService,
  ConversationData as NewConversationData,
  generateMessageId,
} from '../../../services/ConversationService';
import { extensionService } from '../../../services/ExtensionService';

// ── Types ──
import { Message } from '../types/message';
import type { WorkflowAgentId } from '../types/workflow-agents';

// ── Local ──
import { ConversationCache } from './ConversationCache';

// ── Utils ──

// ─── Functions ──────────────────────────────────────────────────────────
/**
 * Convert Message[] from Chat to New System format
 */
function convertMessagesToNewFormat(messages: Message[]): NewConversationData['messages'] {
  return messages
    .filter((m) => !m.isCancelled)
    .map((m) => ({
      ...m,
      id: m.id || generateMessageId(),
      role: m.role,
      content: m.content,
      timestamp: m.timestamp || Date.now(),
      tokenUsage: m.token_usage ?? m.usage?.total_tokens,
      token_usage: m.token_usage ?? m.usage?.total_tokens,
      conversationId: m.conversationId,
      providerId: m.providerId,
      modelId: m.modelId,
      accountId: m.accountId,
      isError: m.isError,
    }));
}

/**
 * Get moduleId from feature context
 * This should be called with proper context from parent component
 */
export function getModuleIdFromContext(sessionId: number, folderPath: string | null): string {
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
  } else if (feature === 'design' && (window as any).__activeDesignId) {
    return `design:${(window as any).__activeDesignId}`;
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
    console.warn('[ConversationService] Failed to log chat:', err);
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
  conversationOverrides?: {
    useSkillEnabled?: boolean;
    memoryEnabled?: boolean;
    toolFormat?: 'xml' | 'json';
    workflowAgentId?: WorkflowAgentId | null;
  },
): Promise<string> => {
  try {
    const convId = conversationId || Date.now().toString();
    const moduleId = getModuleIdFromContext(sessionId, folderPath);

    // Get existing conversation data
    let existingData: NewConversationData | null = null;
    try {
      existingData = await NewConversationService.get(moduleId, convId, folderPath);
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
      conversationOverrides: conversationOverrides || existingData?.conversationOverrides,
      createdAt: existingData?.createdAt || Date.now(),
      lastModified: skipTimestampUpdate ? existingData?.lastModified || Date.now() : Date.now(),
    };

    // Save to new system
    await NewConversationService.save(moduleId, convId, newData, folderPath);

    // Update cache
    ConversationCache.set(convId, {
      messages: convertedMessages as Message[],
      conversationId: convId,
      backendConversationId: newData.backendConversationId,
      toolOutputs: mergedToolOutputs,
      singleLineReviewActions: mergedSingleLineReviewActions,
      conversationFileStats: conversationFileStats,
    });

    // Lưu vào hệ thống mới đã đủ — không cần sync thêm qua postMessage
    // (gây duplicate folder "unknown" do thiếu moduleId trong payload)

    return convId;
  } catch (error: any) {
    console.error('[ConversationService][saveConversation] ❌ Error:', error);
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
    await NewConversationService.delete(moduleId, conversationId, folderPath);

    // Notify backend (keep for compatibility)
    extensionService.postMessage({
      command: 'deleteConversation',
      conversationId: conversationId,
    });

    return true;
  } catch (error) {
    console.error('[ConversationService][deleteConversation] Error:', error);
    return false;
  }
};
