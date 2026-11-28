/**
 * ------------------------------------------------------------------
 * Assign Task Executor
 * ------------------------------------------------------------------
 * Thực thi tool assign_task: gán task vào workspace session đang active
 * (orchestrator) bằng cách cập nhật sessionId của task.
 *
 * Main functions:
 * - executeAssignTask() : Gán task theo task_id cho session hiện tại
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Services ──
import { taskService } from '../../../shared/services/task.service';

// ── Stores ──
import { useCodeStore } from '../../../shared/stores/code.store';

// ── Utils ──
import { runTaskTool, summarizeTask, type TaskToolParams } from '../shared/task-tool.util';

// ─── Functions ───────────────────────────────────────────────────────────────
export const executeAssignTask = (params?: TaskToolParams) =>
  runTaskTool('assign_task', params, async (p, projectPath) => {
    // ASSUMED: assigning to the orchestrator = linking the active workspace session id to the task
    const sessionId = useCodeStore.getState().activeWorkspaceSessionId;
    if (!sessionId) throw new Error('No active workspace session to assign the task to');
    const task = await taskService.update(projectPath, p.task_id, { sessionId });
    return JSON.stringify({ task: summarizeTask(task) });
  });