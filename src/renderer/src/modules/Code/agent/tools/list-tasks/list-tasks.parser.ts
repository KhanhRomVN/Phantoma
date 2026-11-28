/**
 * ------------------------------------------------------------------
 * List Tasks Parser
 * ------------------------------------------------------------------
 * Parser params cho tool list_tasks (status tùy chọn).
 *
 * Main constants:
 * - parseListTasks : Parser của tool list_tasks
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { createToolParser } from '../shared/task-tool-parser.util';

// ─── Constants ───────────────────────────────────────────────────────────────
export const parseListTasks = createToolParser('list_tasks', {
  required: [],
  optional: ['status'],
});