import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { logger } from '../utils/logger';

export interface DesignNode {
  id: string;
  name: string;
  route: string;
  file: string;
  x: number;
  y: number;
}

export interface DesignEdge {
  id: string;
  from: string;
  to: string;
}

export interface DesignMeta {
  id: string;
  name: string;
  description: string;
  nodes: DesignNode[];
  edges: DesignEdge[];
  createdAt: number;
  updatedAt: number;
}

export interface CreateDesignInput {
  name: string;
  description?: string;
  nodes: DesignNode[];
  edges?: DesignEdge[];
  files: Record<string, string>;
}

export interface UpdateDesignInput {
  name?: string;
  description?: string;
  nodes?: DesignNode[];
  edges?: DesignEdge[];
}

function getProjectSlug(projectPath: string): string {
  return Buffer.from(path.resolve(projectPath)).toString('base64url');
}

export function slugToProjectPath(slug: string): string {
  return Buffer.from(slug, 'base64url').toString('utf-8');
}

function getDesignsDir(projectPath: string): string {
  return path.join(
    app.getPath('home'),
    '.phantoma',
    `code:${getProjectSlug(projectPath)}`,
    'designs',
  );
}

function assertSafeId(designId: string) {
  if (!/^design_[A-Za-z0-9_]+$/.test(designId)) {
    throw new Error('Invalid design id');
  }
}

function getDesignDir(projectPath: string, designId: string): string {
  assertSafeId(designId);
  return path.join(getDesignsDir(projectPath), designId);
}

function resolveInside(baseDir: string, relPath: string): string {
  const base = path.resolve(baseDir);
  const target = path.resolve(base, relPath);
  if (target !== base && !target.startsWith(base + path.sep)) {
    throw new Error('Invalid path');
  }
  return target;
}

function writeJsonAtomic(filePath: string, data: unknown) {
  const tmpPath = `${filePath}.tmp`;
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    logger.error('[DesignStorage] Write failed:', err);
    throw err;
  }
}

function readMeta(designDir: string): DesignMeta | null {
  const metaPath = path.join(designDir, 'meta.json');
  if (!fs.existsSync(metaPath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    return {
      ...parsed,
      description: parsed.description ?? '',
      nodes: parsed.nodes ?? [],
      edges: parsed.edges ?? [],
    } as DesignMeta;
  } catch (err) {
    logger.warn('[DesignStorage] Corrupt meta.json', { designDir, err });
    return null;
  }
}

class DesignStorageService {
  public listDesigns(projectPath: string): DesignMeta[] {
    const dir = getDesignsDir(projectPath);
    if (!fs.existsSync(dir)) return [];
    const result: DesignMeta[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const meta = readMeta(path.join(dir, entry.name));
      if (meta) result.push(meta);
    }
    return result.sort((a, b) => b.createdAt - a.createdAt);
  }

  public getDesign(projectPath: string, designId: string): DesignMeta | undefined {
    return readMeta(getDesignDir(projectPath, designId)) ?? undefined;
  }

  public createDesign(projectPath: string, input: CreateDesignInput): DesignMeta {
    const id = `design_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const dir = getDesignDir(projectPath, id);

    for (const [relPath, content] of Object.entries(input.files)) {
      const target = resolveInside(dir, relPath);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content, 'utf-8');
    }

    const now = Date.now();
    const meta: DesignMeta = {
      id,
      name: input.name,
      description: input.description ?? '',
      nodes: input.nodes,
      edges: input.edges ?? [],
      createdAt: now,
      updatedAt: now,
    };
    writeJsonAtomic(path.join(dir, 'meta.json'), meta);
    return meta;
  }

  public updateDesign(
    projectPath: string,
    designId: string,
    updates: UpdateDesignInput,
  ): DesignMeta | undefined {
    const dir = getDesignDir(projectPath, designId);
    const existing = readMeta(dir);
    if (!existing) return undefined;
    const updated: DesignMeta = { ...existing, ...updates, updatedAt: Date.now() };
    writeJsonAtomic(path.join(dir, 'meta.json'), updated);
    return updated;
  }

  public deleteDesign(projectPath: string, designId: string): boolean {
    const dir = getDesignDir(projectPath, designId);
    if (!fs.existsSync(dir)) return false;
    fs.rmSync(dir, { recursive: true, force: true });
    return true;
  }

  public getDesignRoot(projectPath: string, designId: string): string {
    return getDesignDir(projectPath, designId);
  }

  public getDesignFilePath(projectPath: string, designId: string, relPath: string): string {
    return resolveInside(getDesignDir(projectPath, designId), relPath);
  }

  private getFlatFilePath(projectPath: string, designId: string, fileName: string): string {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.tsx?$/.test(fileName)) {
      throw new Error(`Invalid file name "${fileName}" (flat folder, .ts/.tsx only)`);
    }
    return resolveInside(getDesignDir(projectPath, designId), fileName);
  }

  public listFiles(projectPath: string, designId: string): { name: string; lines: number }[] {
    const dir = getDesignDir(projectPath, designId);
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
      .map((entry) => {
        const content = fs.readFileSync(path.join(dir, entry.name), 'utf-8');
        const lines = content.split('\n').length - (content.endsWith('\n') ? 1 : 0);
        return { name: entry.name, lines };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  public readFile(projectPath: string, designId: string, fileName: string): string {
    return fs.readFileSync(this.getFlatFilePath(projectPath, designId, fileName), 'utf-8');
  }

  public writeFile(
    projectPath: string,
    designId: string,
    fileName: string,
    content: string,
  ): { created: boolean } {
    const target = this.getFlatFilePath(projectPath, designId, fileName);
    const created = !fs.existsSync(target);
    fs.writeFileSync(target, content, 'utf-8');
    return { created };
  }

  public addPageNode(
    projectPath: string,
    designId: string,
    fileName: string,
  ): DesignNode | undefined {
    const meta = this.getDesign(projectPath, designId);
    if (!meta || meta.nodes.some((n) => n.file === fileName)) return undefined;
    const stem = fileName.replace(/\.tsx$/, '');
    const slug = stem.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    const node: DesignNode = {
      id: `node_${Date.now()}_${slug}`,
      name: stem,
      route: `/${slug}`,
      file: fileName,
      x: meta.nodes.length ? Math.max(...meta.nodes.map((n) => n.x)) + 400 : 80,
      y: meta.nodes.length ? meta.nodes[0].y : 120,
    };
    this.updateDesign(projectPath, designId, { nodes: [...meta.nodes, node] });
    return node;
  }

  public readSources(projectPath: string, designId: string): string {
    const chunks: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(tsx?|jsx?)$/.test(entry.name)) chunks.push(fs.readFileSync(full, 'utf-8'));
      }
    };
    walk(getDesignDir(projectPath, designId));
    return chunks.join('\n');
  }
}

export const designStorage = new DesignStorageService();