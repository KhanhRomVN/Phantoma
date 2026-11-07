import { taskService } from '../services/task.service';
import { detailTask, runTaskTool, type TaskToolParams } from './TaskToolUtils';

export const executeGetTask = (params?: TaskToolParams) =>
  runTaskTool('get_task', params, async (p, projectPath) => {
    const task = await taskService.get(projectPath, p.task_id);
    return JSON.stringify({ task: detailTask(task) });
  });