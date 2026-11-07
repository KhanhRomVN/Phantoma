import { ipcMain } from 'electron';
import { taskStorage } from '../storage/TaskStorage';
import { workflowStorage } from '../storage/WorkflowStorage';
import { logger } from '../utils/logger';

const fail = (channel: string, e: any) => {
  logger.error(`[${channel}] Error:`, e);
  return { success: false, error: e?.message || String(e) };
};

export function setupWorkflowHandlers(): void {
  ipcMain.handle('workflow:get', async (_event, projectPath: string, taskId: string) => {
    try {
      const task = taskStorage.getTask(projectPath, taskId);
      if (!task) return { success: false, error: 'Task not found' };
      const content = workflowStorage.getWorkflow(projectPath, taskId);
      if (content === undefined) return { success: false, error: 'Task has no workflow' };
      return {
        success: true,
        data: { workflowId: workflowStorage.getWorkflowId(taskId), taskId, content },
      };
    } catch (e: any) {
      return fail('workflow:get', e);
    }
  });

  ipcMain.handle(
    'workflow:create',
    async (_event, projectPath: string, taskId: string, content: string) => {
      try {
        const task = taskStorage.getTask(projectPath, taskId);
        if (!task) return { success: false, error: 'Task not found' };
        if (workflowStorage.exists(projectPath, taskId)) {
          return { success: false, error: 'Task already has a workflow' };
        }
        const workflowId = workflowStorage.createWorkflow(projectPath, taskId, content);
        taskStorage.updateTask(projectPath, taskId, { workflowId });
        return { success: true, data: { workflowId, taskId } };
      } catch (e: any) {
        return fail('workflow:create', e);
      }
    },
  );

  ipcMain.handle(
    'workflow:update',
    async (_event, projectPath: string, taskId: string, oldContent: string, newContent: string) => {
      try {
        const task = taskStorage.getTask(projectPath, taskId);
        if (!task) return { success: false, error: 'Task not found' };
        const content = workflowStorage.updateWorkflow(projectPath, taskId, oldContent, newContent);
        return {
          success: true,
          data: { workflowId: workflowStorage.getWorkflowId(taskId), taskId, content },
        };
      } catch (e: any) {
        return fail('workflow:update', e);
      }
    },
  );
}