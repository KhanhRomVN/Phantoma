/**
 * ------------------------------------------------------------------
 * Commit Message Parser
 * ------------------------------------------------------------------
 * Parse nội dung tag commit_message từ phản hồi của AI thành params.
 *
 * Main types:
 * - CommitMessageParams : Params của tool (message)
 *
 * Main functions:
 * - parseCommitMessage() : Trích xuất message từ tag hoặc nội dung thô
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { extractParamValue } from '@renderer/modules/Code/shared/zen/zen-bridge';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface CommitMessageParams {
  message?: string;
}

// ─── Functions ───────────────────────────────────────────────────────────────
/**
 * Parse commit_message tag from AI response
 * Format: <commit_message><message>...</message></commit_message>
 */
export function parseCommitMessage(innerContent: string): CommitMessageParams {
  const params: CommitMessageParams = {};

  const messageParam = extractParamValue(innerContent, 'message');
  if (messageParam) {
    params.message = messageParam;
  }

  if (!params.message && innerContent.trim()) {
    params.message = innerContent.trim();
  }

  return params;
}
