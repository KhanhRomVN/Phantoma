import { workflowService } from '../services/workflow.service';
import { runTaskTool, type TaskToolParams } from './TaskToolUtils';

export const executeCreateWorkflow = (params?: TaskToolParams) =>
  runTaskTool('create_workflow', params, async (p, projectPath) => {
    const ref = await workflowService.create(projectPath, p.task_id, p.content);
    return JSON.stringify({ workflow_id: ref.workflowId, task_id: ref.taskId });
  });