/**
 * ------------------------------------------------------------------
 * useRecentConversations
 * ------------------------------------------------------------------
 * Resolve module hiện tại, tải hội thoại gần đây và map sang ConversationItem.
 * Reload khi moduleId đổi; response cũ bị bỏ qua.
 * ------------------------------------------------------------------
 */

import { useEffect, useMemo, useState } from 'react';
import { ConversationItem } from '../../history/types';
import ConversationService from '../../../shared/conversations/conversation-storage.service';
import {
  mapConversationSummary,
  mapWithConcurrency,
} from '../../../shared/conversations/conversation-summary';
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
        const items = await mapWithConcurrency(ids, DETAIL_CONCURRENCY, async (id) => {
          try {
            return mapConversationSummary(await ConversationService.get(moduleId, id));
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
