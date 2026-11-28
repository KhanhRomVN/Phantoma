/**
 * ------------------------------------------------------------------
 * Update Workflow Executor
 * ------------------------------------------------------------------
 * Thực thi tool update_workflow: thay thế một đoạn nội dung trong
 * workflow của task theo task_id.
 *
 * Main functions:
 * - executeUpdateWorkflow() : Cập nhật workflow theo old_content/new_content
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Services ──
import { workflowService } from '../../services/workflow.service';

// ── Utils ──
import { runTaskTool, type TaskToolParams } from '../shared/task-tool.util';

// ─── Functions ───────────────────────────────────────────────────────────────
export const executeUpdateWorkflow = (params?: TaskToolParams) =>
  runTaskTool('update_workflow', params, async (p, projectPath) => {
    const info = await workflowService.update(
      projectPath,
      p.task_id,
      p.old_content,
      p.new_content,
    );
    return `Updated workflow ${info.workflowId} of task ${info.taskId}`;
  });