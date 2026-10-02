/**
 * ------------------------------------------------------------------
 * IPC Handler — Task Storage (SQLite)
 * ------------------------------------------------------------------
 * Đăng ký các IPC handler cho thao tác CRUD task trong Code module.
 * Data được lưu per-project tại ~/.phantoma/code:{slug}/task.sqlite
 *
 * Channels:
 * - task:list     : Lấy danh sách tasks của một project
 * - task:get      : Lấy 1 task theo id
 * - task:create   : Tạo mới task
 * - task:update   : Cập nhật task
 * - task:delete   : Xóa task
 * ------------------------------------------------------------------
 */

import { ipcMain } from 'electron';
import { taskStorage, type CreateTaskInput, type UpdateTaskInput } from '../services/TaskStorage';
import { logger } from '../utils/logger';

export function setupTaskHandlers(): void {
  // ── List all tasks for a project ──
  ipcMain.handle('task:list', async (_event, projectPath: string) => {
    try {
      const tasks = taskStorage.listTasks(projectPath);
      return { success: true, data: tasks };
    } catch (e: any) {
      logger.error('[task:list] Error:', e);
      return { success: false, error: e.message || String(e) };
    }
  });

  // ── Get single task ──
  ipcMain.handle('task:get', async (_event, projectPath: string, taskId: string) => {
    try {
      const task = taskStorage.getTask(projectPath, taskId);
      if (!task) return { success: false, error: 'Task not found' };
      return { success: true, data: task };
    } catch (e: any) {
      logger.error('[task:get] Error:', e);
      return { success: false, error: e.message || String(e) };
    }
  });

  // ── Create task ──
  ipcMain.handle('task:create', async (_event, projectPath: string, input: CreateTaskInput) => {
    try {
      const task = taskStorage.createTask(projectPath, input);
      return { success: true, data: task };
    } catch (e: any) {
      logger.error('[task:create] Error:', e);
      return { success: false, error: e.message || String(e) };
    }
  });

  // ── Update task ──
  ipcMain.handle(
    'task:update',
    async (_event, projectPath: string, taskId: string, updates: UpdateTaskInput) => {
      try {
        const task = taskStorage.updateTask(projectPath, taskId, updates);
        if (!task) return { success: false, error: 'Task not found' };
        return { success: true, data: task };
      } catch (e: any) {
        logger.error('[task:update] Error:', e);
        return { success: false, error: e.message || String(e) };
      }
    },
  );

  // ── Delete task ──
  ipcMain.handle('task:delete', async (_event, projectPath: string, taskId: string) => {
    try {
      const deleted = taskStorage.deleteTask(projectPath, taskId);
      if (!deleted) return { success: false, error: 'Task not found' };
      return { success: true };
    } catch (e: any) {
      logger.error('[task:delete] Error:', e);
      return { success: false, error: e.message || String(e) };
    }
  });
}