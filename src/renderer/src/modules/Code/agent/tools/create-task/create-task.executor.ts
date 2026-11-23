import { taskService, type CreateTaskInput } from '../../../shared/services/task.service';
import {
  compact,
  parseDueDate,
  parsePriority,
  runTaskTool,
  summarizeTask,
  type TaskToolParams,
} from '../shared/task-tool.util';

export const executeCreateTask = (params?: TaskToolParams) =>
  runTaskTool('create_task', params, async (p, projectPath) => {
    const input: CreateTaskInput = compact({
      title: p.title,
      description: p.description,
      priority: parsePriority(p.priority),
      endDate: parseDueDate(p.due_date),
    });
    const task = await taskService.create(projectPath, input);
    return JSON.stringify({ task: summarizeTask(task) });
  });