/**
 * ------------------------------------------------------------------
 * Project Storage — JSON File Based Implementation
 * ------------------------------------------------------------------
 * Mỗi project của module Code có 1 thư mục theo UUID:
 *   ~/.phantoma/code/{uuid}/project.json   (id, path, name, ... của project)
 * Cài đặt chung của module Code: ~/.phantoma/code/settings.json
 * Thư mục cũ đặt theo base64url(path) sẽ được tự động đổi sang UUID.
 * ------------------------------------------------------------------
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { app } from 'electron';
import { logger } from '../utils/logger';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const PROJECT_FILE = 'project.json';
const SETTINGS_FILE = 'settings.json';

function getCodeRoot(): string {
  return path.join(app.getPath('home'), '.phantoma', 'code');
}

function readJson(filePath: string): any | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    logger.error('[ProjectStorage] Read failed: ' + filePath, err);
    return null;
  }
}

function writeFileAtomic(filePath: string, content: string) {
  const tmpPath = `${filePath}.tmp`;
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(tmpPath, content, 'utf-8');
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    logger.error('[ProjectStorage] Write failed:', err);
    throw err;
  }
}

function decodeLegacyName(name: string): string | null {
  try {
    const decoded = Buffer.from(name, 'base64url').toString('utf-8');
    return path.isAbsolute(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

class ProjectStorageService {
  private pathToId = new Map<string, string>();
  private knownIds = new Set<string>();
  private lastWritten = new Map<string, string>();
  private loaded = false;

  private projectFile(id: string): string {
    if (!SAFE_ID_PATTERN.test(id)) throw new Error(`Invalid project id: ${id}`);
    return path.join(getCodeRoot(), id, PROJECT_FILE);
  }

  private ensureLoaded() {
    if (this.loaded) return;
    this.loaded = true;
    const root = getCodeRoot();
    if (!fs.existsSync(root)) return;

    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(root, entry.name);
      const data = readJson(path.join(dir, PROJECT_FILE));
      if (data && typeof data.path === 'string') {
        this.pathToId.set(path.resolve(data.path), entry.name);
        this.knownIds.add(entry.name);
        continue;
      }
      if (UUID_PATTERN.test(entry.name)) continue;

      const legacyPath = decodeLegacyName(entry.name);
      if (!legacyPath) continue;
      const id = crypto.randomUUID();
      try {
        fs.renameSync(dir, path.join(root, id));
        writeFileAtomic(this.projectFile(id), JSON.stringify({ id, path: legacyPath }, null, 2));
        this.pathToId.set(path.resolve(legacyPath), id);
        this.knownIds.add(id);
      } catch (err: any) {
        logger.error(`[ProjectStorage] Failed to migrate ${entry.name}:`, err?.message);
      }
    }
  }

  public getProjectId(projectPath: string): string {
    this.ensureLoaded();
    const resolved = path.resolve(projectPath);
    const existing = this.pathToId.get(resolved);
    if (existing) return existing;

    const id = crypto.randomUUID();
    writeFileAtomic(this.projectFile(id), JSON.stringify({ id, path: resolved }, null, 2));
    this.pathToId.set(resolved, id);
    this.knownIds.add(id);
    return id;
  }

  public getProjectDir(projectPath: string): string {
    return path.join(getCodeRoot(), this.getProjectId(projectPath));
  }

  public getProjectPath(id: string): string {
    const data = readJson(this.projectFile(id));
    if (!data || typeof data.path !== 'string') throw new Error(`Project not found: ${id}`);
    return data.path;
  }

  public loadAll(): any[] {
    this.ensureLoaded();
    const projects: any[] = [];
    for (const id of this.knownIds) {
      const data = readJson(this.projectFile(id));
      if (data && data.id && data.path && data.name !== undefined) projects.push(data);
    }
    return projects;
  }

  public saveAll(projects: any[]) {
    this.ensureLoaded();
    const incoming = new Set<string>();
    for (const p of projects) {
      if (!p || typeof p.id !== 'string' || typeof p.path !== 'string') continue;
      incoming.add(p.id);
      const mapped = this.pathToId.get(path.resolve(p.path));
      if (mapped && mapped !== p.id) {
        const from = path.join(getCodeRoot(), mapped);
        const to = path.join(getCodeRoot(), p.id);
        try {
          if (!fs.existsSync(to) && fs.existsSync(from)) fs.renameSync(from, to);
        } catch (err) {
          logger.error('[ProjectStorage] Merge stub dir failed:', err);
        }
        this.knownIds.delete(mapped);
        this.lastWritten.delete(mapped);
      }
      const json = JSON.stringify(p, null, 2);
      if (this.lastWritten.get(p.id) === json) continue;
      writeFileAtomic(this.projectFile(p.id), json);
      this.lastWritten.set(p.id, json);
      this.pathToId.set(path.resolve(p.path), p.id);
      this.knownIds.add(p.id);
    }

    for (const id of Array.from(this.knownIds)) {
      if (incoming.has(id)) continue;
      try {
        fs.rmSync(this.projectFile(id), { force: true });
      } catch (err) {
        logger.error('[ProjectStorage] Remove failed:', err);
      }
      this.knownIds.delete(id);
      this.lastWritten.delete(id);
      for (const [p, mapped] of this.pathToId) {
        if (mapped === id) this.pathToId.delete(p);
      }
    }
  }

  public loadSettings(): Record<string, unknown> {
    return readJson(path.join(getCodeRoot(), SETTINGS_FILE)) ?? {};
  }

  public saveSettings(settings: Record<string, unknown>) {
    writeFileAtomic(path.join(getCodeRoot(), SETTINGS_FILE), JSON.stringify(settings, null, 2));
  }
}

export const projectStorage = new ProjectStorageService();