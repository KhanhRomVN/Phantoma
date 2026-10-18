/**
 * ------------------------------------------------------------------
 * IPC Skill Handlers
 * ------------------------------------------------------------------
 * - skill:read                  : Fetch chi tiết skill từ mcp.directory.
 * - skill:list-installed        : Liệt kê skill đã cài local.
 * - skill:read-content          : Đọc SKILL.md của skill đã cài.
 * - skill:load-workspace-state  : Đọc groups/toggles.
 * - skill:save-workspace-state  : Ghi groups/toggles.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { ipcMain } from 'electron';

// ── Internal ──
import { skillStorage } from '../storage/SkillStorage';
import { logger } from '@main/utils/logger';

// ─── Functions ──────────────────────────────────────────────────────────
export function setupSkillHandlers(): void {
  ipcMain.handle('skill:read', async (_, { skill_id }) => {
    try {
      const detail = await skillStorage.fetchSkillDetail(skill_id);
      return { success: true, detail };
    } catch (error: any) {
      logger.error('[IPC][skill:read] Failed:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('skill:list-installed', async () => {
    try {
      const data = skillStorage.listInstalledSkills();
      return { success: true, data };
    } catch (error: any) {
      logger.error('[IPC][skill:list-installed] Failed:', error.message);
      return { success: false, error: error.message, data: [] };
    }
  });

  ipcMain.handle('skill:read-content', async (_, { slug }) => {
    try {
      const data = skillStorage.readSkillContent(slug);
      return { success: true, data };
    } catch (error: any) {
      logger.error('[IPC][skill:read-content] Failed:', error.message);
      return { success: false, error: error.message, data: null };
    }
  });

  ipcMain.handle('skill:load-workspace-state', async () => {
    try {
      const data = skillStorage.loadWorkspaceState();
      return { success: true, data };
    } catch (error: any) {
      logger.error('[IPC][skill:load-workspace-state] Failed:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('skill:save-workspace-state', async (_, { state }) => {
    try {
      skillStorage.saveWorkspaceState(state);
      return { success: true };
    } catch (error: any) {
      logger.error('[IPC][skill:save-workspace-state] Failed:', error.message);
      return { success: false, error: error.message };
    }
  });
}