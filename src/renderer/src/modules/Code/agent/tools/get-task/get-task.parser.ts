/**
 * ------------------------------------------------------------------
 * Get Task Parser
 * ------------------------------------------------------------------
 * Parser params cho tool get_task (yêu cầu task_id).
 *
 * Main constants:
 * - parseGetTask : Parser của tool get_task
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { createToolParser } from '../shared/task-tool-parser.util';

// ─── Constants ───────────────────────────────────────────────────────────────
export const parseGetTask = createToolParser('get_task', {
  required: ['task_id'],
});