import { taskService, type UpdateTaskInput } from '../services/task.service';
import {
  compact,
  parseDueDate,
  parsePriority,
  parseStatus,
  runTaskTool,
  summarizeTask,
  type TaskToolParams,
} from './TaskToolUtils';

export const executeUpdateTask = (params?: TaskToolParams) =>
  runTaskTool('update_task', params, async (p, projectPath) => {
    const updates: UpdateTaskInput = compact({
      title: p.title,
      description: p.description,
      status: parseStatus(p.status),
      priority: parsePriority(p.priority),
      endDate: parseDueDate(p.due_date),
    });
    if (Object.keys(updates).length === 0) {
      throw new Error(
        'No fields to update: pass at least one of title, description, status, priority, due_date',
      );
    }
    const task = await taskService.update(projectPath, p.task_id, updates);
    return JSON.stringify({ task: summarizeTask(task) });
  });