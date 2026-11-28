/**
 * ------------------------------------------------------------------
 * Update Task Parser
 * ------------------------------------------------------------------
 * Parser params cho tool update_task (task_id bắt buộc; title,
 * description, status, priority, due_date tùy chọn).
 *
 * Main constants:
 * - parseUpdateTask : Parser của tool update_task
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { createToolParser } from '../shared/task-tool-parser.util';

// ─── Constants ───────────────────────────────────────────────────────────────
export const parseUpdateTask = createToolParser('update_task', {
  required: ['task_id'],
  optional: ['title', 'description', 'status', 'priority', 'due_date'],
  verbatim: ['description'],
});