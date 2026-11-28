/**
 * ------------------------------------------------------------------
 * Delete File Parser
 * ------------------------------------------------------------------
 * Parse nội dung tag delete_file từ phản hồi của AI thành params.
 *
 * Main functions:
 * - parseDeleteFile() : Trích xuất file_path
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { extractParamValue } from '@renderer/modules/Code/shared/zen/zen-bridge';

// ── Types ──
import type { DeleteFileParams } from '../tool.types';

// ─── Functions ───────────────────────────────────────────────────────────────
export const parseDeleteFile = (innerContent: string): DeleteFileParams => {
  // Parse according to tools-reference.ts schema: file_path only
  const filePath = extractParamValue(innerContent, 'file_path');

  return {
    file_path: filePath || '',
  };
};
