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

import ConversationService from '@renderer/components/Widgets/Zen/shared/conversations/conversation-storage.service';
import {
  mapConversationSummary,
  mapWithConcurrency,
} from '@renderer/components/Widgets/Zen/shared/conversations/conversation-summary';
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


// ─── Summary ────────────────────────────────────────────────────────────
export interface ConversationSummaryResult {
  items: ConversationItem[];
  failedCount: number;
}

async function loadSummary(key: string, id: string): Promise<ConversationItem | null> {
  return mapConversationSummary(await ConversationService.get(key, id));
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
