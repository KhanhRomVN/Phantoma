/**
 * ------------------------------------------------------------------
 * conversation-summary
 * ------------------------------------------------------------------
 * Mapper thuần dùng chung cho Home và History: dựng summary từ
 * ConversationData (title, preview, số message, token, provider/model).
 *
 * Main functions:
 * - mapConversationSummary() : ConversationData -> ConversationSummary
 * - mapWithConcurrency()     : map async với giới hạn song song
 * ------------------------------------------------------------------
 */

import type { ConversationData } from './conversation-storage.service';

export interface ConversationSummary {
  id: string;
  tabId: number;
  folderPath: string | null;
  title: string;
  preview: string;
  lastModified: number;
  createdAt: number;
  timestamp?: number;
  messageCount: number;
  totalRequests: number;
  totalTokenUsage: number;
  providerId?: string;
  modelId?: string;
  workflowAgentId?: ConversationData['workflowAgentId'];
}

const text = (v: unknown): string => (typeof v === 'string' ? v : '');

export function mapConversationSummary(
  data: ConversationData | null | undefined,
): ConversationSummary | null {
  const raw: unknown = data?.messages;
  const messages: any[] = Array.isArray(raw) ? raw : [];
  if (!data || messages.length === 0) return null;

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
  };
}

export async function mapWithConcurrency<T, R>(
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