/**
 * ------------------------------------------------------------------
 * Create Workflow Executor
 * ------------------------------------------------------------------
 * Thực thi tool create_workflow: tạo workflow mới cho một task từ
 * task_id và content.
 *
 * Main functions:
 * - executeCreateWorkflow() : Tạo workflow và trả về workflow_id, task_id
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Services ──
import { workflowService } from '../../services/workflow.service';

// ── Utils ──
import { runTaskTool, type TaskToolParams } from '../shared/task-tool.util';

// ─── Functions ───────────────────────────────────────────────────────────────
export const executeCreateWorkflow = (params?: TaskToolParams) =>
  runTaskTool('create_workflow', params, async (p, projectPath) => {
    const ref = await workflowService.create(projectPath, p.task_id, p.content);
    return JSON.stringify({ workflow_id: ref.workflowId, task_id: ref.taskId });
  });