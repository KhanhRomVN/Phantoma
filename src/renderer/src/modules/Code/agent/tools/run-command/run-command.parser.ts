/**
 * ------------------------------------------------------------------
 * Run Command Parser
 * ------------------------------------------------------------------
 * Parse nội dung tag run_command từ phản hồi của AI thành params.
 *
 * Main functions:
 * - parseRunCommand() : Trích xuất command, terminal_id, cwd
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { extractParamValue } from '@renderer/modules/Code/shared/zen/zen-bridge';

// ── Types ──
import type { RunCommandParams } from '../tool.types';

// ─── Functions ───────────────────────────────────────────────────────────────
export const parseRunCommand = (innerContent: string): RunCommandParams => {
  // Parse according to tools-reference.ts schema: command (required), cwd (optional)
  // Note: terminal_id is not in official schema but kept for internal use
  return {
    command: extractParamValue(innerContent, 'command') || '',
    terminal_id: extractParamValue(innerContent, 'terminal_id') || undefined,
    cwd: extractParamValue(innerContent, 'cwd') || undefined,
  };
};
