/**
 * ------------------------------------------------------------------
 * Skill Storage
 * ------------------------------------------------------------------
 * 1. Fetch chi tiết skill từ mcp.directory (leaderboard marketplace).
 * 2. Quản lý skill đã cài local (~/.phantoma/skills/).
 * 3. Quản lý workspace state (~/.phantoma/skill-workspace-state.json).
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
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

export interface InstalledSkill {
  slug: string;
  name: string;
  author?: string;
  description: string;
  content?: string;
  sourceUrl?: string;
  category?: string;
  views?: number;
  installs?: number;
}

export interface SkillWorkspaceState {
  toggles: Record<string, boolean>;
  groups: Array<{
    name: string;
    slugs: string[];
    icon?: string;
    color?: string;
    description?: string;
  }>;
  collapsedGroups: Record<string, boolean>;
}

// ─── Constants ──────────────────────────────────────────────────────────
const MCP_DIRECTORY_BASE = 'https://mcp.directory';
const PHANTOMA_DIR = path.join(os.homedir(), '.phantoma');
const SKILLS_DIR = path.join(PHANTOMA_DIR, 'skills');
const WORKSPACE_STATE_FILE = path.join(PHANTOMA_DIR, 'skill-workspace-state.json');

const DEFAULT_WORKSPACE_STATE: SkillWorkspaceState = {
  toggles: {},
  groups: [],
  collapsedGroups: {},
};

// ─── Class ──────────────────────────────────────────────────────────────
export class SkillStorage {
  /**
   * Fetch skill detail by id from mcp.directory.
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

  /** Đảm bảo thư mục skills tồn tại. */
  private ensureSkillsDir(): void {
    if (!fs.existsSync(SKILLS_DIR)) {
      fs.mkdirSync(SKILLS_DIR, { recursive: true });
    }
  }

  /**
   * Liệt kê toàn bộ skill đã cài (mỗi skill là 1 thư mục con có
   * metadata.json hoặc skill.json).
   */
  listInstalledSkills(): InstalledSkill[] {
    try {
      this.ensureSkillsDir();
      const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
      const skills: InstalledSkill[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const slug = entry.name;
        const dirPath = path.join(SKILLS_DIR, slug);
        const metaPath = path.join(dirPath, 'metadata.json');
        const skillJsonPath = path.join(dirPath, 'skill.json');
        const skillMdPath = path.join(dirPath, 'SKILL.md');

        let meta: any = {};
        const metaFile = fs.existsSync(metaPath)
          ? metaPath
          : fs.existsSync(skillJsonPath)
            ? skillJsonPath
            : null;
        if (metaFile) {
          try {
            meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
          } catch {
            meta = {};
          }
        }

        let content: string | undefined;
        if (fs.existsSync(skillMdPath)) {
          try {
            content = fs.readFileSync(skillMdPath, 'utf-8');
          } catch {
            content = undefined;
          }
        }

        skills.push({
          slug,
          name: meta.name || slug,
          author: meta.author,
          description: meta.description || '',
          content,
          sourceUrl: meta.sourceUrl,
          category: meta.category,
          views: meta.views,
          installs: meta.installs,
        });
      }

      return skills;
    } catch (err: any) {
      logger.error('[SkillStorage] listInstalledSkills error:', err.message);
      return [];
    }
  }

  /** Đọc SKILL.md của 1 skill. */
  readSkillContent(slug: string): string | null {
    try {
      const skillMdPath = path.join(SKILLS_DIR, slug, 'SKILL.md');
      if (!fs.existsSync(skillMdPath)) return null;
      return fs.readFileSync(skillMdPath, 'utf-8');
    } catch {
      return null;
    }
  }

  /** Đọc workspace state (groups, toggles) từ file JSON. */
  loadWorkspaceState(): SkillWorkspaceState {
    try {
      if (!fs.existsSync(WORKSPACE_STATE_FILE)) {
        return DEFAULT_WORKSPACE_STATE;
      }
      const raw = fs.readFileSync(WORKSPACE_STATE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      return {
        toggles: data.toggles ?? {},
        groups: Array.isArray(data.groups) ? data.groups : [],
        collapsedGroups: data.collapsedGroups ?? {},
      };
    } catch (err: any) {
      logger.error('[SkillStorage] loadWorkspaceState error:', err.message);
      return DEFAULT_WORKSPACE_STATE;
    }
  }

  /** Ghi workspace state ra file JSON. */
  saveWorkspaceState(state: SkillWorkspaceState): void {
    try {
      if (!fs.existsSync(PHANTOMA_DIR)) {
        fs.mkdirSync(PHANTOMA_DIR, { recursive: true });
      }
      fs.writeFileSync(WORKSPACE_STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err: any) {
      logger.error('[SkillStorage] saveWorkspaceState error:', err.message);
      throw err;
    }
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────
export const skillStorage = new SkillStorage();