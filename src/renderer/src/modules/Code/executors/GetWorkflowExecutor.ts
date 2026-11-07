import { workflowService } from '../services/workflow.service';
import { runTaskTool, type TaskToolParams } from './TaskToolUtils';

export const executeGetWorkflow = (params?: TaskToolParams) =>
  runTaskTool('get_workflow', params, async (p, projectPath) => {
    const info = await workflowService.get(projectPath, p.task_id);
    return info.content;
  });