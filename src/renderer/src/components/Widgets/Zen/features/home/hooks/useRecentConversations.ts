/**
 * ------------------------------------------------------------------
 * useRecentConversations
 * ------------------------------------------------------------------
 * Resolve module hiện tại, tải hội thoại gần đây và map sang ConversationItem.
 * Reload khi moduleId đổi; response cũ bị bỏ qua.
 * ------------------------------------------------------------------
 */

import { useEffect, useMemo, useState } from 'react';
import { ConversationItem } from '../../../history/History/types';
import ConversationService from '../../../shared/services/ConversationService';
import { resolveConversationModuleId } from '../../chat/registries/module.registry';

const DETAIL_CONCURRENCY = 5;

function getCurrentModuleId(): string | null {
  const scoped = resolveConversationModuleId();
  if (scoped) return scoped;

  const w = window as any;
  const feature = w.__activeFeature;
  if (feature === 'emulate' && w.__activeTargetId) return `emulate:${w.__activeTargetId}`;
  if (feature === 'code' && w.__currentProjectId) return `code:${w.__currentProjectId}`;
  if (feature === 'recon' && w.__activeTargetId) return `recon:${w.__activeTargetId}`;
  if (feature === 'design' && w.__activeDesignId) return `design:${w.__activeDesignId}`;
  return null;
}

const text = (v: unknown): string => (typeof v === 'string' ? v : '');

function toSummary(data: any): ConversationItem | null {
  const messages: any[] = Array.isArray(data?.messages) ? data.messages : [];
  if (messages.length === 0) return null;

  const title = text(messages[0]?.content).substring(0, 100) || 'New Conversation';
  const preview = messages
    .slice(0, 3)
    .map((m) => text(m?.content).substring(0, 50))
    .join(' ');

  let providerId: string | undefined;
  let modelId: string | undefined;
  let totalTokenUsage = 0;
  let totalRequests = 0;
  for (const m of messages) {
    if (m?.role === 'user') totalRequests++;
    if (m?.role === 'assistant') {
      if (!providerId && m.providerId) providerId = m.providerId;
      if (!modelId && m.modelId) modelId = m.modelId;
      if (!m.isError && m.tokenUsage) totalTokenUsage += m.tokenUsage;
    }
  }

  return {
    id: data.conversationId,
    title,
    preview,
    timestamp: data.createdAt,
    lastModified: data.lastModified,
    createdAt: data.createdAt,
    messageCount: messages.length,
    tabId: -1,
    totalRequests,
    totalTokenUsage,
    providerId,
    modelId,
    workflowAgentId: data.conversationOverrides?.workflowAgentId ?? data.workflowAgentId ?? null,
    folderPath: null,
  } as ConversationItem;
}

async function mapWithLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

function timeOf(c: ConversationItem): number {
  const t = new Date(c.lastModified || c.timestamp || c.createdAt || 0).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function useRecentConversations() {
  // Đọc mỗi render (rẻ); effect chạy lại khi Home re-render và module đã đổi
  const moduleId = getCurrentModuleId();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!moduleId) {
      console.warn('[Home] No active moduleId, cannot load history');
      setConversations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    (async () => {
      try {
        const ids = await ConversationService.list(moduleId);
        const items = await mapWithLimit(ids, DETAIL_CONCURRENCY, async (id) => {
          try {
            return toSummary(await ConversationService.get(moduleId, id));
          } catch (error) {
            console.warn(`[Home] Failed to load conversation ${id}:`, error);
            return null;
          }
        });
        if (!cancelled) {
          setConversations(items.filter((c): c is ConversationItem => c !== null));
        }
      } catch (error) {
        console.error('[Home] Failed to load history:', error);
        if (!cancelled) setConversations([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [moduleId]);

  const sorted = useMemo(
    () => [...conversations].sort((a, b) => timeOf(b) - timeOf(a)),
    [conversations],
  );

  return { conversations: sorted, isLoading };
}
