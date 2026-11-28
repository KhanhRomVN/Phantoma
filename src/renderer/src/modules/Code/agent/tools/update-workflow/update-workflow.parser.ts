/**
 * ------------------------------------------------------------------
 * Update Workflow Parser
 * ------------------------------------------------------------------
 * Parser params cho tool update_workflow (task_id, old_content,
 * new_content bắt buộc; old/new_content giữ nguyên định dạng gốc).
 *
 * Main constants:
 * - parseUpdateWorkflow : Parser của tool update_workflow
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { createToolParser } from '../shared/task-tool-parser.util';

// ─── Constants ───────────────────────────────────────────────────────────────
export const parseUpdateWorkflow = createToolParser('update_workflow', {
  required: ['task_id', 'old_content', 'new_content'],
  verbatim: ['old_content', 'new_content'],
});