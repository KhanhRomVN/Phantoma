/**
 * ------------------------------------------------------------------
 * Replace In File Parser
 * ------------------------------------------------------------------
 * Parse nội dung tag replace_in_file từ phản hồi của AI thành params.
 *
 * Main functions:
 * - parseReplaceInFile() : Trích xuất file_path, old_content, new_content
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { extractParamValue } from '@renderer/modules/Code/shared/zen/zen-bridge';

// ── Types ──
import type { ReplaceInFileParams } from '../tool.types';

// ─── Functions ───────────────────────────────────────────────────────────────
export const parseReplaceInFile = (innerContent: string): ReplaceInFileParams => {
  // Parse according to tools-reference.ts schema: file_path only
  const filePath = extractParamValue(innerContent, 'file_path');
  const oldContent = extractParamValue(innerContent, 'old_content');
  const newContent = extractParamValue(innerContent, 'new_content');

  return {
    file_path: filePath || '',
    old_content: oldContent || '',
    new_content: newContent || '',
  };
};
