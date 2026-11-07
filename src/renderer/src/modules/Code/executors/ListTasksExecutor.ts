import { taskService } from '../services/task.service';
import { parseStatus, runTaskTool, summarizeTask, type TaskToolParams } from './TaskToolUtils';

export const executeListTasks = (params?: TaskToolParams) =>
  runTaskTool('list_tasks', params, async (p, projectPath) => {
    const status = parseStatus(p.status);
    const tasks = (await taskService.list(projectPath)).filter(
      (t) => !t.archived && (!status || t.status === status),
    );
    return JSON.stringify({ tasks: tasks.map(summarizeTask) });
  });