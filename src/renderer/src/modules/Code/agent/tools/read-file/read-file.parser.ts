/**
 * ------------------------------------------------------------------
 * Read File Parser
 * ------------------------------------------------------------------
 * Parse nội dung tag read_file từ phản hồi của AI thành params.
 *
 * Main functions:
 * - parseReadFile() : Trích xuất file_path, start_line, end_line
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { extractParamValue } from '@renderer/modules/Code/shared/zen/zen-bridge';

// ── Types ──
import type { ReadFileParams } from '../tool.types';

// ─── Functions ───────────────────────────────────────────────────────────────
export const parseReadFile = (innerContent: string): ReadFileParams => {
  // Parse according to tools-reference.ts schema: file_path only
  const filePath = extractParamValue(innerContent, 'file_path');
  const startLine = extractParamValue(innerContent, 'start_line');
  const endLine = extractParamValue(innerContent, 'end_line');

  return {
    file_path: filePath || '',
    start_line: startLine ? parseInt(startLine, 10) : undefined,
    end_line: endLine ? parseInt(endLine, 10) : undefined,
  };
};
