import { useCodeStore } from '../hooks/useCodeStore';
import { taskService } from '../services/task.service';
import { runTaskTool, summarizeTask, type TaskToolParams } from './TaskToolUtils';

export const executeAssignTask = (params?: TaskToolParams) =>
  runTaskTool('assign_task', params, async (p, projectPath) => {
    // ASSUMED: assigning to the orchestrator = linking the active workspace session id to the task
    const sessionId = useCodeStore.getState().activeWorkspaceSessionId;
    if (!sessionId) throw new Error('No active workspace session to assign the task to');
    const task = await taskService.update(projectPath, p.task_id, { sessionId });
    return JSON.stringify({ task: summarizeTask(task) });
  });