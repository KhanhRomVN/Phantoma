/**
 * ------------------------------------------------------------------
 * Get Task Executor
 * ------------------------------------------------------------------
 * Thực thi tool get_task: lấy chi tiết một task theo task_id.
 *
 * Main functions:
 * - executeGetTask() : Lấy task và trả về chi tiết dạng JSON
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Services ──
import { taskService } from '../../../shared/services/task.service';

// ── Utils ──
import { detailTask, runTaskTool, type TaskToolParams } from '../shared/task-tool.util';

// ─── Functions ───────────────────────────────────────────────────────────────
export const executeGetTask = (params?: TaskToolParams) =>
  runTaskTool('get_task', params, async (p, projectPath) => {
    const task = await taskService.get(projectPath, p.task_id);
    return JSON.stringify({ task: detailTask(task) });
  });