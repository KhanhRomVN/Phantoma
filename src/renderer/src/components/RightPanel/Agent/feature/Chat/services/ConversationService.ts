import { extensionService } from "../../../services/ExtensionService";
import { Message } from "../types/message";
import { ConversationCache } from "./ConversationCache";
import { ChatSession } from "../types/chat";

const STORAGE_PREFIX = "zen-chat";

export interface ChatMetadata {
  id: string;
  sessionId: number;
  folderPath: string | null;
  title: string;
  lastModified: number;
  messageCount: number;
  createdAt: number;
  totalRequests: number;
  totalTokenUsage: number;
  uniqueTaskCount?: number;
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
      command: "logChat",
      chatUuid,
      logEntry,
    });
  } catch (err) {}
};

export const calculateTokens = (text: string): number => {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
};

export const getConversationKey = (
  sessionId: number,
  folderPath: string | null,
  conversationId?: string,
): string => {
  if (conversationId && conversationId.startsWith(STORAGE_PREFIX)) {
    return conversationId;
  }

  const safeFolderPath = folderPath || "global";
  const convId = conversationId || Date.now().toString();
  const fullKey = `${STORAGE_PREFIX}:${sessionId}:${safeFolderPath}:${convId}`;
  return fullKey;
};

export const saveConversation = async (
  sessionId: number,
  folderPath: string | null,
  messages: Message[],
  conversationId?: string,
  currentChat?: ChatSession,
  skipTimestampUpdate?: boolean,
  title?: string,
  backendConversationId?: string,
  toolOutputs?: Record<
    string,
    { output: string; isError: boolean; terminalId?: string }
  >,
  singleLineReviewActions?: Record<
    string,
    { action: any; actionId: string; messageId: string }
  >,
  conversationFileStats?: {
    totalFiles: number;
    totalAdditions: number;
    totalDeletions: number;
  },
): Promise<string> => {
  console.log('[ConversationService] saveConversation called:', {
    sessionId,
    folderPath,
    messageCount: messages.length,
    conversationId,
    skipTimestampUpdate,
    title,
    backendConversationId,
    hasToolOutputs: !!toolOutputs && Object.keys(toolOutputs).length > 0,
    hasSingleLineReviewActions: !!singleLineReviewActions && Object.keys(singleLineReviewActions).length > 0,
    hasConversationFileStats: !!conversationFileStats,
  });

  try {
    const moduleId = sessionId && sessionId !== -1 ? sessionId.toString() : 'chat';
    const convId = conversationId || Date.now().toString();
    console.log('[ConversationService] saving conversation:', { moduleId, convId, sessionId });

    // Check if IPC is available (window.api exposed by preload)
    if (!window.api || typeof window.api.invoke !== 'function') {
      console.warn('[ConversationService] window.api not available');
      return "";
    }

    const activeMessages = messages.filter((m) => !m.isCancelled);
    const totalRequests = activeMessages.filter(
      (m: Message) => m.role === "user",
    ).length;
    const totalTokenUsage = activeMessages.reduce(
      (sum: number, m: Message) => sum + (m.token_usage || 0),
      0,
    );

    let existingCreatedAt: number | undefined;
    let existingLastModified: number | undefined;
    let existingTitle: string | undefined;
    let existingBackendConversationId: string | undefined;
    let existingToolOutputs:
      | Record<
          string,
          { output: string; isError: boolean; terminalId?: string }
        >
      | undefined;
    let existingSingleLineReviewActions:
      | Record<string, { action: any; actionId: string; messageId: string }>
      | undefined;

    const cached = ConversationCache.get(convId);
    if (cached) {
      existingToolOutputs = cached.toolOutputs;
      existingSingleLineReviewActions = cached.singleLineReviewActions;
      existingBackendConversationId = cached.backendConversationId;
    }

    const key = `${moduleId}:${convId}`;

    try {
      const existingData = await window.api.invoke('conversation:get', { moduleId, conversationId: convId });
      if (existingData) {
        existingCreatedAt = existingData.metadata?.createdAt || existingData.createdAt;
        existingLastModified = existingData.metadata?.lastModified || existingData.lastModified;
        existingTitle = existingData.metadata?.title;
        if (!existingBackendConversationId) {
          existingBackendConversationId = existingData.backendConversationId;
        }
        if (
          !existingToolOutputs &&
          existingData.toolOutputs &&
          Object.keys(existingData.toolOutputs).length > 0
        ) {
          existingToolOutputs = existingData.toolOutputs;
        }
        if (
          !existingSingleLineReviewActions &&
          existingData.singleLineReviewActions &&
          Object.keys(existingData.singleLineReviewActions).length > 0
        ) {
          existingSingleLineReviewActions = existingData.singleLineReviewActions;
        }
      }
    } catch (error) {
      console.warn('[ConversationService] failed to read existing data:', error);
    }

    const messagesToSave = messages.map((m) => ({ ...m }));

    const mergedToolOutputs =
      toolOutputs && Object.keys(toolOutputs).length > 0
        ? { ...(existingToolOutputs || {}), ...toolOutputs }
        : existingToolOutputs || undefined;

    const mergedSingleLineReviewActions =
      singleLineReviewActions && Object.keys(singleLineReviewActions).length > 0
        ? {
            ...(existingSingleLineReviewActions || {}),
            ...singleLineReviewActions,
          }
        : existingSingleLineReviewActions || undefined;

    const data = {
      messages: messagesToSave,
      conversationId: convId,
      backendConversationId:
        backendConversationId || existingBackendConversationId,
      toolOutputs: mergedToolOutputs,
      singleLineReviewActions: mergedSingleLineReviewActions,
      conversationFileStats: conversationFileStats,
      metadata: {
        id: key,
        sessionId,
        folderPath,
        title:
          title ||
          existingTitle ||
          messages[0]?.content.substring(0, 100) ||
          "New Conversation",
        lastModified: skipTimestampUpdate
          ? existingLastModified || Date.now()
          : Date.now(),
        messageCount: messages.length,
        createdAt: existingCreatedAt || Date.now(),
        totalRequests,
        totalTokenUsage,
      } as ChatMetadata,
    };

    console.log('[ConversationService] saving data:', {
      key,
      messageCount: data.messages.length,
      metadata: data.metadata,
      hasToolOutputs: !!data.toolOutputs && Object.keys(data.toolOutputs).length > 0,
      hasSingleLineReviewActions: !!data.singleLineReviewActions && Object.keys(data.singleLineReviewActions).length > 0,
    });

    await window.api.invoke('conversation:save', { moduleId, conversationId: convId, data });

    // Sync conversation state to file JSON (for backend restore)
    extensionService.postMessage({
      command: "saveConversationState",
      conversationId: convId,
      messages: messagesToSave,
      backendConversationId:
        backendConversationId || existingBackendConversationId,
      toolOutputs: mergedToolOutputs,
      singleLineReviewActions: mergedSingleLineReviewActions,
      conversationFileStats: conversationFileStats,
      metadata: data.metadata,
    });

    // Update cache
    const cacheData = {
      messages: messagesToSave,
      conversationId: convId,
      backendConversationId:
        backendConversationId || existingBackendConversationId,
      toolOutputs: mergedToolOutputs,
      singleLineReviewActions: mergedSingleLineReviewActions,
      conversationFileStats: conversationFileStats,
    };
    ConversationCache.set(convId, cacheData);

    console.log('[ConversationService] saveConversation success:', convId);
    return convId;
  } catch (error) {
    console.error('[ConversationService] saveConversation error:', error);
    return "";
  }
};

export const deleteConversation = async (
  conversationId?: string,
): Promise<boolean> => {
  if (!conversationId) return false;

  ConversationCache.delete(conversationId);

  return new Promise((resolve) => {
    extensionService.postMessage({
      command: "deleteConversation",
      conversationId: conversationId,
    });
    resolve(true);
  });
};

/**
 * Export conversation to Markdown format
 */
export const exportConversationToMarkdown = (
  messages: Message[],
  metadata?: { title?: string; createdAt?: number },
): string => {
  const lines: string[] = [];
  const title = metadata?.title || 'Conversation Export';
  const date = metadata?.createdAt ? new Date(metadata.createdAt).toLocaleString() : new Date().toLocaleString();

  lines.push(`# ${title}`);
  lines.push(`*Exported on: ${date}*`);
  lines.push('');

  let responseNumber = 0;
  for (const msg of messages) {
    if (msg.uiHidden || msg.isCancelled) continue;

    const role = msg.role === 'user' ? '## User' : `## Assistant ${msg.role === 'assistant' ? `(Response ${++responseNumber})` : ''}`;
    lines.push(role);
    lines.push('');

    // Extract content without XML tags for readability
    let content = msg.content;
    // Remove XML tags but keep the content inside
    content = content.replace(/<[^>]+>/g, (match) => {
      // If it's a closing tag, add a newline
      if (match.startsWith('</')) {
        return '\n';
      }
      // For opening tags, just remove
      return '';
    });
    // Clean up extra whitespace
    content = content.replace(/\n{3,}/g, '\n\n').trim();

    if (content) {
      lines.push(content);
    } else {
      lines.push('*[No content]*');
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
};

/**
 * Import conversation from Markdown format (basic support)
 */
export const importConversationFromMarkdown = (markdown: string): Message[] => {
  const messages: Message[] = [];
  const lines = markdown.split('\n');
  let currentRole: 'user' | 'assistant' | null = null;
  let currentContent: string[] = [];
  let responseNumber = 0;

  for (const line of lines) {
    if (line.startsWith('## User')) {
      // Save previous message
      if (currentRole && currentContent.length > 0) {
        const content = currentContent.join('\n').trim();
        if (content) {
          messages.push({
            id: `msg-${Date.now()}-${messages.length}`,
            role: currentRole,
            content,
            timestamp: Date.now() + messages.length,
            token_usage: calculateTokens(content),
          });
        }
      }
      currentRole = 'user';
      currentContent = [];
      responseNumber = 0;
    } else if (line.startsWith('## Assistant')) {
      // Save previous message
      if (currentRole && currentContent.length > 0) {
        const content = currentContent.join('\n').trim();
        if (content) {
          messages.push({
            id: `msg-${Date.now()}-${messages.length}`,
            role: currentRole,
            content,
            timestamp: Date.now() + messages.length,
            token_usage: calculateTokens(content),
          });
        }
      }
      currentRole = 'assistant';
      currentContent = [];
      responseNumber++;
    } else if (line.startsWith('---') || line.startsWith('*Exported on:')) {
      // Skip separators and metadata
      continue;
    } else if (line.startsWith('#')) {
      // Skip title
      continue;
    } else if (currentRole) {
      // Skip empty lines that are just separators
      if (line.trim() !== '' && line.trim() !== '---') {
        currentContent.push(line);
      }
    }
  }

  // Save last message
  if (currentRole && currentContent.length > 0) {
    const content = currentContent.join('\n').trim();
    if (content) {
      messages.push({
        id: `msg-${Date.now()}-${messages.length}`,
        role: currentRole,
        content,
        timestamp: Date.now() + messages.length,
        token_usage: calculateTokens(content),
      });
    }
  }

  return messages;
};

/**
 * Get conversation by ID
 */
export const getConversationById = async (
  conversationId: string,
): Promise<{
  messages: Message[];
  metadata?: ChatMetadata;
  toolOutputs?: Record<string, { output: string; isError: boolean }>;
  conversationFileStats?: { totalFiles: number; totalAdditions: number; totalDeletions: number };
} | null> => {
  try {
    // Check if IPC is available
    if (!window.api || typeof window.api.invoke !== 'function') {
      // Try cache first
      const cached = ConversationCache.get(conversationId);
      if (cached) {
        return {
          messages: cached.messages || [],
          toolOutputs: cached.toolOutputs,
          conversationFileStats: cached.conversationFileStats,
        };
      }
      return null;
    }

    const data = await window.api.invoke('conversation:get', { moduleId: 'chat', conversationId });

    if (!data) {
      // Try cache
      const cached = ConversationCache.get(conversationId);
      if (cached) {
        return {
          messages: cached.messages || [],
          toolOutputs: cached.toolOutputs,
          conversationFileStats: cached.conversationFileStats,
        };
      }
      return null;
    }

    return {
      messages: data.messages || [],
      metadata: data.metadata,
      toolOutputs: data.toolOutputs,
      conversationFileStats: data.conversationFileStats,
    };
  } catch (error) {
    console.error('[ConversationService] getConversationById error:', error);
    return null;
  }
};

/**
 * Extract file changes from conversation messages
 * Returns a map of file path to changes stats
 */
export const extractFileChanges = (
  messages: Message[],
): Map<
  string,
  {
    additions: number;
    deletions: number;
    toolType?: 'write_to_file' | 'replace_in_file' | 'revert_file';
    content?: string;
    oldContent?: string;
    newContent?: string;
  }
> => {
  const fileChanges = new Map<
    string,
    {
      additions: number;
      deletions: number;
      toolType?: 'write_to_file' | 'replace_in_file' | 'revert_file';
      content?: string;
      oldContent?: string;
      newContent?: string;
    }
  >();

  for (const msg of messages) {
    if (msg.role !== 'assistant' || !msg.content) continue;

    // Match write_to_file
    const writeMatches = msg.content.matchAll(
      /<write_to_file[^>]*?>[\s\S]*?<file_path[^>]*?>(.*?)<\/file_path>[\s\S]*?<content[^>]*?>([\s\S]*?)<\/content>[\s\S]*?<\/write_to_file>/gi,
    );
    for (const match of writeMatches) {
      const filePath = match[1]?.trim();
      const content = match[2] || '';
      if (filePath) {
        const stats = fileChanges.get(filePath) || { additions: 0, deletions: 0 };
        stats.additions += content.split('\n').length;
        stats.toolType = 'write_to_file';
        stats.content = content;
        fileChanges.set(filePath, stats);
      }
    }

    // Match replace_in_file
    const replaceMatches = msg.content.matchAll(
      /<replace_in_file[^>]*?>[\s\S]*?<file_path[^>]*?>(.*?)<\/file_path>[\s\S]*?<old_content[^>]*?>([\s\S]*?)<\/old_content>[\s\S]*?<new_content[^>]*?>([\s\S]*?)<\/new_content>[\s\S]*?<\/replace_in_file>/gi,
    );
    for (const match of replaceMatches) {
      const filePath = match[1]?.trim();
      const oldContent = match[2] || '';
      const newContent = match[3] || '';
      if (filePath) {
        const stats = fileChanges.get(filePath) || { additions: 0, deletions: 0 };
        stats.deletions += oldContent.split('\n').length;
        stats.additions += newContent.split('\n').length;
        stats.toolType = 'replace_in_file';
        stats.oldContent = oldContent;
        stats.newContent = newContent;
        fileChanges.set(filePath, stats);
      }
    }

    // Match revert_file (subtract changes)
    const revertMatches = msg.content.matchAll(
      /<revert_file[^>]*?>[\s\S]*?<file_path[^>]*?>(.*?)<\/file_path>[\s\S]*?<\/revert_file>/gi,
    );
    for (const match of revertMatches) {
      const filePath = match[1]?.trim();
      if (filePath && fileChanges.has(filePath)) {
        const stats = fileChanges.get(filePath)!;
        stats.toolType = 'revert_file';
        // Revert cancels out changes - set to 0
        stats.additions = 0;
        stats.deletions = 0;
        fileChanges.set(filePath, stats);
      }
    }
  }

  return fileChanges;
};