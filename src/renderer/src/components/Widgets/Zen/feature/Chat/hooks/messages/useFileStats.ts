/**
 * ------------------------------------------------------------------
 * useFileStats
 * ------------------------------------------------------------------
 * Hook tính toán thống kê file hội thoại với tính toán tăng dần.
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
import { Message } from '../../types/message';

// ── Utils ──
import { extractRawContentDiff, hasMutationTools } from '../../utils/tool-mutation-registry';

// ─── Types ──────────────────────────────────────────────────────────────
interface FileStats {
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
}

// ─── Hook ───────────────────────────────────────────────────────────────
export const useFileStats = (
  messages: Message[],
  loadedConversationFileStats: FileStats | null,
): FileStats => {
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  //   Track last computed file stats for incremental updates
  const lastFileStatsLengthRef = useRef(0);
  const lastFileStatsMapRef = useRef<Map<string, { additions: number; deletions: number }>>(
    new Map(),
  );

  const conversationFileStats = useMemo(() => {
    // If we have loaded stats from history and no new messages, use loaded stats
    if (loadedConversationFileStats && messages.length > 0) {
      const hasNewMutations = messages.some((m) => m.content && hasMutationTools(m.content));
      if (!hasNewMutations) {
        return loadedConversationFileStats;
      }
    }

    // PERF OPTIMIZATION: Incremental computation - only scan new messages
    const canUseIncremental = messages.length >= lastFileStatsLengthRef.current;

    let fileChanges: Map<string, { additions: number; deletions: number }>;

    if (canUseIncremental && lastFileStatsLengthRef.current > 0) {
      // Start from previous map and scan only new messages
      fileChanges = new Map(lastFileStatsMapRef.current);

      const newMessages = messages.slice(lastFileStatsLengthRef.current);

      scanMessagesForFileChanges(newMessages, fileChanges);
    } else {
      // Full scan (messages were edited or first render)
      fileChanges = new Map();

      scanMessagesForFileChanges(messages, fileChanges);
    }

    // Cache map for next incremental update
    lastFileStatsLengthRef.current = messages.length;
    lastFileStatsMapRef.current = fileChanges;

    const totalFiles = fileChanges.size;
    const totalAdditions = Array.from(fileChanges.values()).reduce(
      (sum, stat) => sum + stat.additions,
      0,
    );
    const totalDeletions = Array.from(fileChanges.values()).reduce(
      (sum, stat) => sum + stat.deletions,
      0,
    );

    return {
      totalFiles,
      totalAdditions,
      totalDeletions,
    };
  }, [messages, loadedConversationFileStats]);

  return conversationFileStats;
};

/**
 * Helper function to scan messages for file changes
 */
function scanMessagesForFileChanges(
  messagesToScan: Message[],
  fileChanges: Map<string, { additions: number; deletions: number }>,
) {
  messagesToScan.forEach((msg) => {
    if (msg.role === 'assistant' && msg.content) {
      const extracted = extractRawContentDiff(msg.content);
      extracted.forEach((stats: { additions: number; deletions: number }, filePath: string) => {
        if (!fileChanges.has(filePath)) {
          fileChanges.set(filePath, { additions: 0, deletions: 0 });
        }
        const existing = fileChanges.get(filePath)!;
        existing.additions += stats.additions;
        existing.deletions += stats.deletions;
      });
    }
  });
}
