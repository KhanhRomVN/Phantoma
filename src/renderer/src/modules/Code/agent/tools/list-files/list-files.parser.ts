/**
 * ------------------------------------------------------------------
 * List Files Parser
 * ------------------------------------------------------------------
 * Parse nội dung tag list_files từ phản hồi của AI thành params.
 *
 * Main functions:
 * - parseListFiles() : Trích xuất folder_path, type và depth
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { extractParamValue } from '@renderer/modules/Code/shared/zen/zen-bridge';

// ── Types ──
import type { ListFilesParams } from '../tool.types';

// ─── Functions ───────────────────────────────────────────────────────────────
export const parseListFiles = (innerContent: string): ListFilesParams => {
  // Parse according to tools-reference.ts schema: folder_path only
  const folderPath = extractParamValue(innerContent, 'folder_path');
  const type = extractParamValue(innerContent, 'type');
  const depthStr = extractParamValue(innerContent, 'depth');

  let depth: number | 'max' | undefined;
  if (depthStr) {
    if (depthStr.toLowerCase() === 'max') {
      depth = 'max';
    } else {
      const parsed = parseInt(depthStr, 10);
      depth = !isNaN(parsed) ? parsed : undefined;
    }
  }

  return {
    folder_path: folderPath || '',
    type: type || undefined,
    depth,
  };
};
