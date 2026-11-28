/**
 * ------------------------------------------------------------------
 * Conversation Cache
 * ------------------------------------------------------------------
 * In-memory cache cho conversation data với LRU eviction.
 * Lưu messages, toolOutputs, và singleLineReviewActions tạm thời.
 * Question answers được quản lý cùng vòng đời với record conversation:
 * eviction/delete/clear luôn dọn cả hai.
 *
 * Main exports:
 * - ConversationCache : Singleton object với get/set/delete/clear
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Types ──
import { Message } from '../types/message.types';

// ─── Types ──────────────────────────────────────────────────────────────
export interface CachedConversation {
  messages: Message[];
  conversationId: string;
  backendConversationId?: string;
  currentModel?: any;
  currentAccount?: any;
  toolOutputs?: Record<string, { output: string; isError: boolean; terminalId?: string }>;
  singleLineReviewActions?: Record<string, { action: any; actionId: string; messageId: string }>;
  questionAnswers?: Record<string, Record<string, any>>;
  conversationFileStats?: {
    totalFiles: number;
    totalAdditions: number;
    totalDeletions: number;
  };
}

type QuestionAnswers = Record<string, Record<string, any>>;

// ─── State ──────────────────────────────────────────────────────────────
const MAX_CACHE = 20;

// Map giữ thứ tự insertion: phần tử đầu là least-recently-used.
const cache = new Map<string, CachedConversation>();

// Question answers tách khỏi record chính để không bị ghi đè khi set() không kèm answers.
const questionAnswersStore = new Map<string, QuestionAnswers>();

const touch = (conversationId: string, data: CachedConversation): void => {
  cache.delete(conversationId);
  cache.set(conversationId, data);
};

const remove = (conversationId: string): void => {
  cache.delete(conversationId);
  questionAnswersStore.delete(conversationId);
};

// ─── API ────────────────────────────────────────────────────────────────
export const ConversationCache = {
  get: (conversationId: string): CachedConversation | undefined => {
    const result = cache.get(conversationId);
    if (!result) return undefined;

    const qaFromStore = questionAnswersStore.get(conversationId);
    if (qaFromStore && !result.questionAnswers) {
      result.questionAnswers = qaFromStore;
    }
    touch(conversationId, result);
    return result;
  },
  set: (conversationId: string, data: CachedConversation) => {
    if (data?.questionAnswers && Object.keys(data.questionAnswers).length > 0) {
      questionAnswersStore.set(conversationId, data.questionAnswers);
    }

    if (!cache.has(conversationId) && cache.size >= MAX_CACHE) {
      const lru = cache.keys().next().value as string | undefined;
      if (lru !== undefined) remove(lru);
    }
    touch(conversationId, data);

    // Notify listeners that cache was updated (for AgentGroup to re-compute tab states)
    window.dispatchEvent(new CustomEvent('phantoma:conversation-cache-updated', { detail: { conversationId } }));
  },
  getQuestionAnswers: (conversationId: string): QuestionAnswers | undefined => {
    return questionAnswersStore.get(conversationId);
  },
  delete: (conversationId: string) => {
    remove(conversationId);
  },
  clear: () => {
    cache.clear();
    questionAnswersStore.clear();
  },
};