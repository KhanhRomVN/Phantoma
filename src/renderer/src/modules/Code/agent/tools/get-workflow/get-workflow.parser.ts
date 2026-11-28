/**
 * ------------------------------------------------------------------
 * Get Workflow Parser
 * ------------------------------------------------------------------
 * Parser params cho tool get_workflow (yêu cầu task_id).
 *
 * Main constants:
 * - parseGetWorkflow : Parser của tool get_workflow
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { createToolParser } from '../shared/task-tool-parser.util';

// ─── Constants ───────────────────────────────────────────────────────────────
export const parseGetWorkflow = createToolParser('get_workflow', {
  required: ['task_id'],
});