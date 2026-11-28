/**
 * ------------------------------------------------------------------
 * Create Task Executor
 * ------------------------------------------------------------------
 * Thực thi tool create_task: tạo task mới cho project hiện tại từ
 * title, description, priority và due_date.
 *
 * Main functions:
 * - executeCreateTask() : Tạo task và trả về bản tóm tắt
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Services ──
import { taskService, type CreateTaskInput } from '../../../shared/services/task.service';

// ── Utils ──
import {
  compact,
  parseDueDate,
  parsePriority,
  runTaskTool,
  summarizeTask,
  type TaskToolParams,
} from '../shared/task-tool.util';

// ─── Functions ───────────────────────────────────────────────────────────────
export const executeCreateTask = (params?: TaskToolParams) =>
  runTaskTool('create_task', params, async (p, projectPath) => {
    const input: CreateTaskInput = compact({
      title: p.title,
      description: p.description,
      priority: parsePriority(p.priority),
      endDate: parseDueDate(p.due_date),
    });
    const task = await taskService.create(projectPath, input);
    return JSON.stringify({ task: summarizeTask(task) });
  });