/**
 * ------------------------------------------------------------------
 * useFileStats
 * ------------------------------------------------------------------
 * Hook tính toán thống kê file hội thoại với tính toán tăng dần.
 * Phần lịch sử ổn định (mọi message trừ message cuối) được cache và chỉ
 * dùng lại khi các message cũ giữ nguyên reference; message cuối luôn được
 * tính lại để bắt kịp streaming. Edit/delete/replace/reorder → tính lại toàn bộ.
 *
 * NOTE: Delegates to module-specific raw content diff extractors for incremental computation.
 * This is UI-specific optimization code. Parsed actions not available during streaming.
 *
 * Main returns:
 * - totalFiles     : Tổng số file bị thay đổi
 * - totalAdditions : Tổng số dòng được thêm
 * - totalDeletions : Tổng số dòng bị xóa
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useMemo, useRef } from 'react';

// ── Types ──
import { Message } from '../../types/message.types';

// ── Utils ──
import { extractRawContentDiff, hasMutationTools } from '../../registries/tool_mutation.registry';

// ─── Types ──────────────────────────────────────────────────────────────
interface FileStats {
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
}

type FileChanges = Map<string, { additions: number; deletions: number }>;

// ─── Helpers ────────────────────────────────────────────────────────────
const scanMessageForFileChanges = (msg: Message, fileChanges: FileChanges): void => {
  if (msg.role !== 'assistant' || !msg.content) return;
  extractRawContentDiff(msg.content).forEach(
    (stats: { additions: number; deletions: number }, filePath: string) => {
      const existing = fileChanges.get(filePath);
      fileChanges.set(filePath, {
        additions: (existing?.additions ?? 0) + stats.additions,
        deletions: (existing?.deletions ?? 0) + stats.deletions,
      });
    },
  );
};

const summarize = (fileChanges: FileChanges): FileStats => {
  let totalAdditions = 0;
  let totalDeletions = 0;
  fileChanges.forEach((stat) => {
    totalAdditions += stat.additions;
    totalDeletions += stat.deletions;
  });
  return { totalFiles: fileChanges.size, totalAdditions, totalDeletions };
};

// ─── Hook ───────────────────────────────────────────────────────────────
export const useFileStats = (
  messages: Message[],
  loadedConversationFileStats: FileStats | null,
): FileStats => {
  // ASSUMED: messages are updated immutably (a changed message gets a new reference)
  const cacheRef = useRef<{ messages: Message[]; changes: FileChanges }>({
    messages: [],
    changes: new Map(),
  });

  return useMemo(() => {
    if (loadedConversationFileStats && messages.length > 0) {
      const hasNewMutations = messages.some((m) => m.content && hasMutationTools(m.content));
      if (!hasNewMutations) {
        return loadedConversationFileStats;
      }
    }

    const stableCount = Math.max(messages.length - 1, 0);
    const cached = cacheRef.current;
    const prefixValid =
      cached.messages.length <= stableCount && cached.messages.every((m, i) => m === messages[i]);

    const base: FileChanges = prefixValid ? new Map(cached.changes) : new Map();
    for (let i = prefixValid ? cached.messages.length : 0; i < stableCount; i++) {
      scanMessageForFileChanges(messages[i], base);
    }
    cacheRef.current = { messages: messages.slice(0, stableCount), changes: base };

    const withLast: FileChanges = new Map(base);
    if (messages.length > 0) scanMessageForFileChanges(messages[messages.length - 1], withLast);
    return summarize(withLast);
  }, [messages, loadedConversationFileStats]);
};