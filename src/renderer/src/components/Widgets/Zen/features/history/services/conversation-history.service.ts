/**
 * ------------------------------------------------------------------
 * conversation-history.service
 * ------------------------------------------------------------------
 * Data access riêng cho History:
 * - dựng danh sách summary (concurrency bị giới hạn)
 * - đọc messages của một conversation (cache-first, qua adapter typed)
 * - delete / clear kèm invalidate cache
 *
 * `loadConversationSummaries` bằng API đó để không đọc full messages.
 * ------------------------------------------------------------------
 */

import ConversationService from '@renderer/components/Widgets/Zen/shared/services/ConversationService';
import type { ConversationItem, HistoryMessage } from '../types';

// ─── Cache adapter (global bridge có type) ──────────────────────────────
interface ConversationCacheEntry {
  messages: HistoryMessage[];
  conversationId: string;
}

interface ConversationCacheBridge {
  get(id: string): ConversationCacheEntry | null | undefined;
  set(id: string, entry: ConversationCacheEntry): void;
  delete?(id: string): void;
}

/** Nơi duy nhất truy cập `window.ConversationCache`. */
const getCache = (): ConversationCacheBridge | undefined =>
  (window as unknown as { ConversationCache?: ConversationCacheBridge }).ConversationCache;

const invalidateCache = (ids: string[]): void => {
  const cache = getCache();
  if (!cache || typeof cache.delete !== 'function') return;
  for (const id of ids) {
    try {
      cache.delete(id);
    } catch (error) {
      console.warn('[conversation-history] Failed to invalidate cache:', id, error);
    }
  }
};

// ─── Concurrency ────────────────────────────────────────────────────────
const LIST_CONCURRENCY = 6;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]);
    }
  });

  await Promise.all(runners);
  return results;
}

// ─── Summary ────────────────────────────────────────────────────────────
export interface ConversationSummaryResult {
  items: ConversationItem[];
  failedCount: number;
}

async function loadSummary(key: string, id: string): Promise<ConversationItem | null> {
  const data = await ConversationService.get(key, id);
  if (!data) return null;

  const firstMessage = data.messages[0];
  const title = firstMessage?.content.substring(0, 100) || 'New Conversation';
  const preview = data.messages
    .slice(0, 3)
    .map((m) => m.content.substring(0, 50))
    .join(' ');

  let providerId: string | undefined;
  let modelId: string | undefined;
  let totalTokenUsage = 0;
  let totalRequests = 0;

  for (const rawMsg of data.messages) {
    const msg = rawMsg as HistoryMessage;
    if (msg.role === 'user') {
      totalRequests++;
    }
    if (msg.role === 'assistant') {
      if (!providerId && msg.providerId) providerId = msg.providerId;
      if (!modelId && msg.modelId) modelId = msg.modelId;
      if (!msg.isError && msg.tokenUsage) {
        totalTokenUsage += msg.tokenUsage;
      }
    }
  }

  return {
    id: data.conversationId,
    title,
    preview,
    timestamp: data.createdAt,
    lastModified: data.lastModified,
    createdAt: data.createdAt,
    messageCount: data.messages.length,
    folderPath: null, // Legacy field, giữ nguyên contract với onLoadConversation
    tabId: -1, // Legacy field, giữ nguyên contract với onLoadConversation
    totalRequests,
    totalTokenUsage,
    providerId,
    modelId,
    workflowAgentId: data.conversationOverrides?.workflowAgentId ?? data.workflowAgentId ?? null,
  };
}

/** Dựng danh sách conversation cho một history key. */
export async function loadConversationSummaries(key: string): Promise<ConversationSummaryResult> {
  const ids = await ConversationService.list(key);
  let failedCount = 0;

  const loaded = await mapWithConcurrency(ids, LIST_CONCURRENCY, async (id) => {
    try {
      return await loadSummary(key, id);
    } catch (error) {
      failedCount++;
      console.warn(`[conversation-history] Failed to load conversation ${id}:`, error);
      return null;
    }
  });

  const items = loaded.filter((c): c is ConversationItem => c !== null && c.messageCount > 0);
  return { items, failedCount };
}

// ─── Detail ─────────────────────────────────────────────────────────────
/** Đọc messages của một conversation (cache-first). Trả null nếu không có. */
export async function getConversationMessages(
  key: string,
  id: string,
): Promise<HistoryMessage[] | null> {
  const cache = getCache();
  const cached = cache?.get(id);
  if (cached?.messages && cached.messages.length > 0) return cached.messages;

  const data = await ConversationService.get(key, id);
  if (!data?.messages) return null;

  const messages = data.messages as HistoryMessage[];
  cache?.set(id, { messages, conversationId: id });
  return messages;
}

// ─── Mutations ──────────────────────────────────────────────────────────
export async function deleteConversation(key: string, id: string): Promise<void> {
  await ConversationService.delete(key, id);
  invalidateCache([id]);
}

export async function clearConversations(key: string, ids: string[]): Promise<void> {
  await ConversationService.deleteAll(key);
  invalidateCache(ids);
}
