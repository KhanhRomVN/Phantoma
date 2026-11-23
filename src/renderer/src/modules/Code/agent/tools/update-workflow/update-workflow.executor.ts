import { workflowService } from '../../services/workflow.service';
import { runTaskTool, type TaskToolParams } from '../shared/task-tool.util';

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