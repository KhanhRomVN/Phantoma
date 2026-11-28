/**
 * ------------------------------------------------------------------
 * Workflow Service
 * ------------------------------------------------------------------
 * Wrapper gọi API workflow của Code backend (get/create/update) và
 * map dữ liệu về dạng WorkflowInfo/WorkflowRef dùng trong agent tools.
 * Tự thông báo thay đổi task sau khi create/update.
 *
 * Main types:
 * - WorkflowInfo : Thông tin đầy đủ của workflow (kèm content)
 * - WorkflowRef  : Tham chiếu workflow (id + taskId)
 *
 * Main functions:
 * - workflowService.get()    : Lấy workflow theo taskId
 * - workflowService.create() : Tạo workflow mới cho task
 * - workflowService.update() : Cập nhật nội dung workflow
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Services ──
import { notifyChanged } from '../../shared/services/task.service';
import { codeApi, type CodeWorkflow } from '../../shared/api/code.api';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface WorkflowInfo {
  workflowId: string;
  taskId: string;
  content: string;
}

export interface WorkflowRef {
  workflowId: string;
  taskId: string;
}

// ─── Functions ───────────────────────────────────────────────────────────────
function mapCodeWorkflowToInfo(workflow: CodeWorkflow): WorkflowInfo {
  return {
    workflowId: workflow.id,
    taskId: workflow.taskId,
    content: workflow.content,
  };
}

function mapCodeWorkflowToRef(workflow: CodeWorkflow): WorkflowRef {
  return {
    workflowId: workflow.id,
    taskId: workflow.taskId,
  };
}


// ─── Constants ───────────────────────────────────────────────────────────────
export const workflowService = {
  get: async (_projectPath: string, taskId: string): Promise<WorkflowInfo> => {
    const workflow = await codeApi.workflows.get(taskId);
    return mapCodeWorkflowToInfo(workflow);
  },

  create: async (projectPath: string, taskId: string, content: string): Promise<WorkflowRef> => {
    const workflow = await codeApi.workflows.create(taskId, content);
    notifyChanged(projectPath);
    return mapCodeWorkflowToRef(workflow);
  },

  update: async (projectPath: string, taskId: string, oldContent: string, newContent: string): Promise<WorkflowInfo> => {
    const workflow = await codeApi.workflows.update(taskId, oldContent, newContent);
    notifyChanged(projectPath);
    return mapCodeWorkflowToInfo(workflow);
  },
};