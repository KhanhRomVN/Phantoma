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
import * as JSZip from 'jszip';
import { logger } from '../utils/logger';

const SKILL_DOWNLOAD_URL = 'https://mcp.directory/api/skills/download';
const SKILL_ENTRY_FILE = 'SKILL.md';
const DOWNLOAD_TIMEOUT_MS = 60000;

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
        const namedJsonPath = path.join(dirPath, `${slug}.json`);
        const metaFile =
          [namedJsonPath, metaPath, skillJsonPath].find((p) => fs.existsSync(p)) ?? null;
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

  private toSafeName(slug: string): string {
    const safe = slug.replace(/[^a-zA-Z0-9._-]/g, '_');
    return /^\.+$/.test(safe) ? '_' : safe;
  }

  /** Thư mục của 1 skill: ~/.phantoma/skills/{slug}/ (toàn cục cho mọi module). */
  getSkillDir(slug: string): string {
    return path.join(SKILLS_DIR, this.toSafeName(slug));
  }

  private async extractZip(buffer: Buffer, targetDir: string): Promise<void> {
    const zip = await JSZip.loadAsync(buffer);
    const files = Object.values(zip.files).filter(
      (f) => !f.dir && !f.name.startsWith('__MACOSX/'),
    );
    const entry = files
      .filter(
        (f) => path.posix.basename(f.name).toLowerCase() === SKILL_ENTRY_FILE.toLowerCase(),
      )
      .sort((a, b) => a.name.split('/').length - b.name.split('/').length)[0];
    if (!entry) throw new Error(`Skill archive does not contain ${SKILL_ENTRY_FILE}`);

    const prefix = entry.name.slice(0, entry.name.length - path.posix.basename(entry.name).length);
    const root = path.resolve(targetDir);

    for (const f of files) {
      if (!f.name.startsWith(prefix)) continue;
      const dest = path.resolve(root, f.name.slice(prefix.length));
      if (!dest.startsWith(root + path.sep)) continue;
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, await f.async('nodebuffer'));
    }
  }

  /** Tải zip từ mcp.directory, giải nén vào thư mục tạm rồi đổi tên để tránh skill dở dang. */
  async installSkill(skill: Record<string, any>): Promise<void> {
    if (!skill?.slug) throw new Error('installSkill requires a skill with slug');
    if (skill.id === undefined || skill.id === null) {
      throw new Error('installSkill requires a skill with id');
    }
    this.ensureSkillsDir();

    const res = await fetch(`${SKILL_DOWNLOAD_URL}/${encodeURIComponent(String(skill.id))}`, {
      redirect: 'follow',
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());

    const finalDir = this.getSkillDir(skill.slug);
    const tmpDir = `${finalDir}.tmp-${Date.now()}`;
    try {
      fs.mkdirSync(tmpDir, { recursive: true });
      await this.extractZip(buffer, tmpDir);
      fs.writeFileSync(
        path.join(tmpDir, `${this.toSafeName(skill.slug)}.json`),
        JSON.stringify(skill, null, 2),
        'utf-8',
      );
      fs.rmSync(finalDir, { recursive: true, force: true });
      fs.renameSync(tmpDir, finalDir);
    } catch (err: any) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      logger.error(`[SkillStorage] installSkill '${skill.slug}' failed:`, err.message);
      throw err;
    }
  }

  uninstallSkill(slug: string): void {
    fs.rmSync(this.getSkillDir(slug), { recursive: true, force: true });
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