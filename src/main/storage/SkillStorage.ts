/**
 * ------------------------------------------------------------------
 * Skill Storage
 * ------------------------------------------------------------------
 * Đọc chi tiết skill từ mcp.directory (leaderboard marketplace).
 * Không phụ thuộc skill cài local, vì skill cài từ leaderboard có
 * thể chỉ có summary, thiếu content đầy đủ.
 *
 * Hàm chính:
 * - fetchSkillDetail() : Fetch chi tiết skill theo id
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Internal ──
import { logger } from '../utils/logger';

// ─── Types ──────────────────────────────────────────────────────────────
export interface SkillDetail {
  id: string;
  name: string;
  description: string;
  author?: string;
  views?: number;
  installs?: number;
  content?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────
const MCP_DIRECTORY_BASE = 'https://mcp.directory';

// ─── Class ──────────────────────────────────────────────────────────────
export class SkillStorage {
  /**
   * Fetch skill detail by id.
   */
  async fetchSkillDetail(skillId: string): Promise<SkillDetail> {
    if (!skillId) throw new Error('skill_id is required');

    const url = `${MCP_DIRECTORY_BASE}/api/skills/${encodeURIComponent(skillId)}`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} when fetching skill '${skillId}'`);
      }
      const json: any = await res.json();

      // Hỗ trợ cả envelope { success, data } và raw object
      const data = json?.data ?? json;

      return {
        id: data.id ?? skillId,
        name: data.name ?? skillId,
        description: data.description ?? '',
        author: data.author,
        views: data.views,
        installs: data.installs,
        content: data.content ?? data.body ?? '',
      };
    } catch (err: any) {
      logger.error(`[SkillStorage] Failed to fetch skill '${skillId}':`, err.message);
      throw err;
    }
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────
export const skillStorage = new SkillStorage();