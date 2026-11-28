/**
 * ------------------------------------------------------------------
 * Create Workflow Parser
 * ------------------------------------------------------------------
 * Parser params cho tool create_workflow (task_id và content bắt buộc,
 * content giữ nguyên định dạng gốc).
 *
 * Main constants:
 * - parseCreateWorkflow : Parser của tool create_workflow
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { createToolParser } from '../shared/task-tool-parser.util';

// ─── Constants ───────────────────────────────────────────────────────────────
export const parseCreateWorkflow = createToolParser('create_workflow', {
  required: ['task_id', 'content'],
  verbatim: ['content'],
});