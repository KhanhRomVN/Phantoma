/**
 * ------------------------------------------------------------------
 * IPC Task Handlers
 * ------------------------------------------------------------------
 * Giao diện CRUD cho hệ thống quản lý công việc (Task Tracker) tích hợp
 * sẵn trong IDE. Sử dụng SQLite làm backend lưu trữ cục bộ theo từng dự án
 * (~/.phantoma/...) để đảm bảo hiệu suất và tính độc lập dữ liệu.
 *
 * Channels:
 * - task:list   : Lấy toàn bộ danh sách tasks của một project
 * - task:get    : Chi tiết một task duy nhất theo ID
 * - task:create : Thêm mới một task vào database
 * - task:update : Sửa đổi thuộc tính của một task hiện có
 * - task:delete : Xóa vĩnh viễn một task
 *
 * Functions:
 * - setupTaskHandlers() : Entry point đăng ký IPC handler nhóm 'task:'
 * ------------------------------------------------------------------
 */

import { ipcMain } from 'electron';
import { taskStorage, type CreateTaskInput, type UpdateTaskInput } from '../storage/TaskStorage';
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
