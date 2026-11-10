/**
 * ------------------------------------------------------------------
 * IPC Skill Handlers
 * ------------------------------------------------------------------
 * Skill lưu toàn cục ở ~/.phantoma/skills/, dùng chung cho mọi module.
 * - skill:read                  : Fetch chi tiết skill từ mcp.directory.
 * - skill:fetch-leaderboard     : Leaderboard marketplace.
 * - skill:search                : Tìm skill trên marketplace.
 * - skill:fetch-detail          : Chi tiết skill theo slug.
 * - skill:install               : Tải + giải nén skill.
 * - skill:uninstall             : Xóa skill đã cài.
 * - skill:open-folder           : Mở thư mục skill trong file manager.
 * - skill:list-installed        : Liệt kê skill đã cài local.
 * - skill:read-content          : Đọc SKILL.md của skill đã cài.
 * - skill:load-workspace-state  : Đọc groups/toggles.
 * - skill:save-workspace-state  : Ghi groups/toggles.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { ipcMain, shell } from 'electron';
import * as fs from 'fs';

// ── Internal ──
import { skillStorage } from '../storage/SkillStorage';
import {
  fetchLeaderboard,
  searchSkills,
  fetchSkillDetailBySlug,
} from '../services/skill-marketplace';
import { logger } from '@main/utils/logger';

// ─── Helpers ────────────────────────────────────────────────────────────
function handleData<T>(channel: string, fn: (args: any) => Promise<T> | T): void {
  ipcMain.handle(channel, async (_, args) => {
    try {
      return { success: true, data: await fn(args) };
    } catch (error: any) {
      logger.error(`[IPC][${channel}] Failed:`, error.message);
      return { success: false, error: error.message };
    }
  });
}

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

  handleData('skill:fetch-leaderboard', () => fetchLeaderboard());
  handleData('skill:search', ({ query, limit, offset }) => searchSkills(query, limit, offset));
  handleData('skill:fetch-detail', ({ slug }) => fetchSkillDetailBySlug(slug));

  handleData('skill:install', async ({ skill }) => {
    await skillStorage.installSkill(skill);
    return true;
  });

  handleData('skill:uninstall', ({ slug }) => {
    skillStorage.uninstallSkill(slug);
    return true;
  });

  handleData('skill:open-folder', async ({ slug }) => {
    const dir = skillStorage.getSkillDir(slug);
    if (!fs.existsSync(dir)) throw new Error(`Skill '${slug}' is not installed`);
    const error = await shell.openPath(dir);
    if (error) throw new Error(error);
    return true;
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