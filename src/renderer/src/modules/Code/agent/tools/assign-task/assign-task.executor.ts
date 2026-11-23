import { useCodeStore } from '../../../shared/stores/code.store';
import { taskService } from '../../../shared/services/task.service';
import { runTaskTool, summarizeTask, type TaskToolParams } from '../shared/task-tool.util';

export const executeAssignTask = (params?: TaskToolParams) =>
  runTaskTool('assign_task', params, async (p, projectPath) => {
    // ASSUMED: assigning to the orchestrator = linking the active workspace session id to the task
    const sessionId = useCodeStore.getState().activeWorkspaceSessionId;
    if (!sessionId) throw new Error('No active workspace session to assign the task to');
    const task = await taskService.update(projectPath, p.task_id, { sessionId });
    return JSON.stringify({ task: summarizeTask(task) });
  });