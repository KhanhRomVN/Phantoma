/**
 * ------------------------------------------------------------------
 * List Tasks Executor
 * ------------------------------------------------------------------
 * Thực thi tool list_tasks: liệt kê task chưa archive của project hiện
 * tại, có thể lọc theo status.
 *
 * Main functions:
 * - executeListTasks() : Trả về danh sách task đã tóm tắt dạng JSON
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Services ──
import { taskService } from '../../../shared/services/task.service';

// ── Utils ──
import { parseStatus, runTaskTool, summarizeTask, type TaskToolParams } from '../shared/task-tool.util';

// ─── Functions ───────────────────────────────────────────────────────────────
export const executeListTasks = (params?: TaskToolParams) =>
  runTaskTool('list_tasks', params, async (p, projectPath) => {
    const status = parseStatus(p.status);
    const tasks = (await taskService.list(projectPath)).filter(
      (t) => !t.archived && (!status || t.status === status),
    );
    return JSON.stringify({ tasks: tasks.map(summarizeTask) });
  });