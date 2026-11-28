/**
 * ------------------------------------------------------------------
 * Git Diff Parser
 * ------------------------------------------------------------------
 * Parse nội dung tag git_diff từ phản hồi của AI thành params.
 *
 * Main functions:
 * - parseGitDiff() : Trích xuất file_path (tùy chọn)
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { extractParamValue } from '@renderer/modules/Code/shared/zen/zen-bridge';

// ── Types ──
import type { GitDiffParams } from '../tool.types';

// ─── Functions ───────────────────────────────────────────────────────────────
/**
 * Parse git_diff tag from AI response
 * Format: <git_diff><file_path>...</file_path></git_diff>
 * According to tools-reference.ts: file_path is optional
 */
export function parseGitDiff(innerContent: string): GitDiffParams {
  const params: GitDiffParams = {};

  // Extract file_path (optional according to schema)
  params.file_path = extractParamValue(innerContent, 'file_path') ?? undefined;

  return params;
}
