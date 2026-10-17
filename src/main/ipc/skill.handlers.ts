/**
 * ------------------------------------------------------------------
 * IPC Skill Handlers
 * ------------------------------------------------------------------
 * Cầu nối IPC cho Skill feature — fetch chi tiết skill từ mcp.directory.
 *
 * Channels:
 * - skill:read : Fetch chi tiết + content của một skill theo skill_id
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Electron ──
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
}