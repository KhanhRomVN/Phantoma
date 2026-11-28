/**
 * ------------------------------------------------------------------
 * Write To File Parser
 * ------------------------------------------------------------------
 * Parse nội dung tag write_to_file từ phản hồi của AI thành params.
 *
 * Main functions:
 * - parseWriteToFile() : Trích xuất file_path và content
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { extractParamValue } from '@renderer/modules/Code/shared/zen/zen-bridge';

// ── Types ──
import type { WriteToFileParams } from '../tool.types';

// ─── Constants ───────────────────────────────────────────────────────────────
// Enable debug logs via localStorage
const DEBUG_PARSER =
  typeof window !== 'undefined' && window.localStorage?.getItem('zen_debug_parser') === 'true';

// ─── Functions ───────────────────────────────────────────────────────────────
export const parseWriteToFile = (innerContent: string): WriteToFileParams => {
  // Parse according to tools-reference.ts schema: file_path only
  const filePath = extractParamValue(innerContent, 'file_path');
  const content = extractParamValue(innerContent, 'content');

  if (DEBUG_PARSER) {
    if (!filePath) {
      console.warn('[Zen][WriteToFileParser] ⚠️ file_path is missing or empty!');
    }
    if (!content) {
      console.warn('[Zen][WriteToFileParser] ⚠️ content is missing or empty!');
    }
  }

  return {
    file_path: filePath || '',
    content: content || '',
  };
};
