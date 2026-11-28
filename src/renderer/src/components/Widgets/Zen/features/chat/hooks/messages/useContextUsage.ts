/**
 * ------------------------------------------------------------------
 * useContextUsage
 * ------------------------------------------------------------------
 * Hook tính toán mức sử dụng token ngữ cảnh với tính toán tăng dần.
 * Phần lịch sử ổn định (mọi message trừ message cuối) được cache và chỉ
 * dùng lại khi các message cũ giữ nguyên reference; message cuối luôn được
 * tính lại để bắt kịp streaming. Edit/delete/replace/reorder → tính lại toàn bộ.
 *
 * Main returns:
 * - prompt     : Tổng prompt tokens
 * - completion : Tổng completion tokens
 * - total      : Tổng tokens
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useMemo, useRef } from 'react';

// ── Types ──
import { Message } from '../../types/message.types';

// ─── Types ──────────────────────────────────────────────────────────────
interface ContextUsage {
  prompt: number;
  completion: number;
  total: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────
const addMessageUsage = (acc: ContextUsage, msg: Message): void => {
  if (msg.isCancelled) return;
  if (msg.token_usage) {
    acc.total += msg.token_usage;
    if (msg.usage) {
      acc.prompt += msg.usage.prompt_tokens || 0;
      acc.completion += msg.usage.completion_tokens || 0;
    } else if (msg.role === 'user') {
      acc.prompt += msg.token_usage;
    } else {
      acc.completion += msg.token_usage;
    }
  } else if (msg.usage) {
    acc.prompt += msg.usage.prompt_tokens || 0;
    acc.completion += msg.usage.completion_tokens || 0;
    acc.total += msg.usage.total_tokens || 0;
  }
};

const emptyUsage = (): ContextUsage => ({ prompt: 0, completion: 0, total: 0 });

// ─── Hook ───────────────────────────────────────────────────────────────
export const useContextUsage = (messages: Message[]): ContextUsage => {
  // ASSUMED: messages are updated immutably (a changed message gets a new reference)
  const cacheRef = useRef<{ messages: Message[]; usage: ContextUsage }>({
    messages: [],
    usage: emptyUsage(),
  });

  return useMemo(() => {
    const stableCount = Math.max(messages.length - 1, 0);
    const cached = cacheRef.current;
    const prefixValid =
      cached.messages.length <= stableCount && cached.messages.every((m, i) => m === messages[i]);

    const base = prefixValid ? { ...cached.usage } : emptyUsage();
    for (let i = prefixValid ? cached.messages.length : 0; i < stableCount; i++) {
      addMessageUsage(base, messages[i]);
    }
    cacheRef.current = { messages: messages.slice(0, stableCount), usage: base };

    const result = { ...base };
    if (messages.length > 0) addMessageUsage(result, messages[messages.length - 1]);
    return result;
  }, [messages]);
};