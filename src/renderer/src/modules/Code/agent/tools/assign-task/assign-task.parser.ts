/**
 * ------------------------------------------------------------------
 * Assign Task Parser
 * ------------------------------------------------------------------
 * Parser params cho tool assign_task (yêu cầu task_id).
 *
 * Main constants:
 * - parseAssignTask : Parser của tool assign_task
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { createToolParser } from '../shared/task-tool-parser.util';

// ─── Constants ───────────────────────────────────────────────────────────────
export const parseAssignTask = createToolParser('assign_task', {
  required: ['task_id'],
});