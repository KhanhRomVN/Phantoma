/**
 * ------------------------------------------------------------------
 * Create Task Parser
 * ------------------------------------------------------------------
 * Parser params cho tool create_task (title bắt buộc; description,
 * priority, due_date tùy chọn).
 *
 * Main constants:
 * - parseCreateTask : Parser của tool create_task
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { createToolParser } from '../shared/task-tool-parser.util';

// ─── Constants ───────────────────────────────────────────────────────────────
export const parseCreateTask = createToolParser('create_task', {
  required: ['title'],
  optional: ['description', 'priority', 'due_date'],
  verbatim: ['description'],
});