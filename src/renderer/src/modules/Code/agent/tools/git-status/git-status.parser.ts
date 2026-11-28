/**
 * ------------------------------------------------------------------
 * Git Status Parser
 * ------------------------------------------------------------------
 * Parse nội dung tag git_status từ phản hồi của AI thành params.
 *
 * Main functions:
 * - parseGitStatus() : Trích xuất items (JSON string) và raw output
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { extractParamValue } from '@renderer/modules/Code/shared/zen/zen-bridge';

// ── Types ──
import type { GitStatusParams } from '../tool.types';

// ─── Functions ───────────────────────────────────────────────────────────────
/**
 * Parse git_status tag from AI response
 * Format: <git_status><items>...</items><raw>...</raw></git_status>
 */
export function parseGitStatus(innerContent: string): GitStatusParams {
  const params: GitStatusParams = {};

  // Extract items as JSON string
  const itemsParam = extractParamValue(innerContent, 'items');
  if (itemsParam) {
    params.items = itemsParam;
  }

  // Extract raw output
  const rawParam = extractParamValue(innerContent, 'raw');
  if (rawParam) {
    params.raw = rawParam;
  }

  return params;
}
