/**
 * ------------------------------------------------------------------
 * Get Workflow Executor
 * ------------------------------------------------------------------
 * Thực thi tool get_workflow: lấy nội dung workflow của một task theo task_id.
 *
 * Main functions:
 * - executeGetWorkflow() : Lấy workflow và trả về content
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Services ──
import { workflowService } from '../../services/workflow.service';

// ── Utils ──
import { runTaskTool, type TaskToolParams } from '../shared/task-tool.util';

// ─── Functions ───────────────────────────────────────────────────────────────
export const executeGetWorkflow = (params?: TaskToolParams) =>
  runTaskTool('get_workflow', params, async (p, projectPath) => {
    const info = await workflowService.get(projectPath, p.task_id);
    return info.content;
  });