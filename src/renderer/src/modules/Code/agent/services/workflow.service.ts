import { TASKS_CHANGED_EVENT } from '../../shared/services/task.service';
import { codeApi, type CodeWorkflow } from '../../shared/api/code.api';

export interface WorkflowInfo {
  workflowId: string;
  taskId: string;
  content: string;
}

export interface WorkflowRef {
  workflowId: string;
  taskId: string;
}

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

const notifyChanged = (projectPath: string) => {
  window.dispatchEvent(new CustomEvent(TASKS_CHANGED_EVENT, { detail: projectPath }));
};

export const workflowService = {
  get: async (projectPath: string, taskId: string): Promise<WorkflowInfo> => {
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