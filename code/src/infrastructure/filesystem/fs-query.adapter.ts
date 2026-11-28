import type { Dirent } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { AppError } from '../../application/errors/app.error';
import type { GitCommandPort } from '../../application/ports/git-command.port';

import type {
  FileStat,
  FileSystemReadPort,
  FindFilesOptions,
  GrepData,
  GrepMatch,
  GrepOptions,
  TreeNode,
  TreeOptions,
} from '../../application/ports/filesystem.port';

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '.cache',
  'coverage',
  'target',
  'vendor',
  '__pycache__',
  '.venv',
  'venv',
  '.idea',
  '.vscode',
  '.turbo',
]);

const DEFAULT_GREP_MAX_FILE_SIZE = 1024 * 1024;
const MAX_TREE_DEPTH = 20;
const MAX_FIND_DEPTH = 10;
const MAX_WALK_DEPTH = 12;
const MAX_WALK_FILES = 5000;
const MAX_GIT_FILES = 20000;

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function nameMatcher(pattern: string): (name: string) => boolean {
  const source = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.');
  try {
    const re = new RegExp(`^${source}$`, 'i');
    return (name) => re.test(name);
  } catch {
    return (name) => name.includes(pattern);
  }
}

async function buildTree(dir: string, depth: number, exclude: Set<string>, hidden: boolean): Promise<TreeNode[]> {
  const names = (await fs.readdir(dir)).filter((n) => !exclude.has(n) && (hidden || !n.startsWith('.')));
  const nodes = await Promise.all(
    names.map(async (name): Promise<TreeNode> => {
      const full = path.join(dir, name);
      try {
        const stat = await fs.stat(full);
        if (!stat.isDirectory()) return { name, type: 'file', size: stat.size };
        const node: TreeNode = { name, type: 'folder', size: stat.size };
        if (depth > 1) node.children = await buildTree(full, depth - 1, exclude, hidden).catch(() => []);
        return node;
      } catch {
        return { name, type: 'file' };
      }
    }),
  );
  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

async function walkFiles(root: string, current: string, depth: number, files: string[]): Promise<void> {
  if (depth > MAX_WALK_DEPTH || files.length >= MAX_WALK_FILES) return;
  let entries: Dirent[];
  try {
    entries = await fs.readdir(current, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (files.length >= MAX_WALK_FILES) return;
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) await walkFiles(root, full, depth + 1, files);
    else files.push(path.relative(root, full));
  }
}

export class FsQueryAdapter implements FileSystemReadPort {
  constructor(private readonly gitCommand: GitCommandPort) {}

  async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }

  async readLines(filePath: string, start: number, end?: number): Promise<string> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    return lines.slice(start - 1, end).join('\n');
  }

  async read(filePath: string, range?: { start?: number; end?: number }): Promise<string> {
    if (!range?.start && !range?.end) return this.readFile(filePath);
    const fh = await fs.open(filePath, 'r');
    try {
      const { size } = await fh.stat();
      const start = range.start ?? 0;
      const end = range.end ?? size;
      const length = Math.max(0, end - start);
      if (length === 0) return '';
      const buf = Buffer.alloc(length);
      await fh.read(buf, 0, length, start);
      return buf.toString('utf-8');
    } finally {
      await fh.close();
    }
  }

  async stat(filePath: string): Promise<FileStat> {
    const stat = await fs.stat(filePath);
    return {
      size: stat.size,
      isDirectory: stat.isDirectory(),
      isFile: stat.isFile(),
      mtime: stat.mtimeMs,
      ctime: stat.ctimeMs,
    };
  }

  async tree(dirPath: string, options: TreeOptions): Promise<TreeNode[]> {
    const depth = Math.min(options.depth, MAX_TREE_DEPTH);
    const exclude = new Set(options.exclude);
    return buildTree(dirPath, depth, exclude, options.hidden);
  }

  async findFiles(root: string, pattern: string, options?: FindFilesOptions): Promise<Array<{ path: string }>> {
    const max = Math.min(options?.max ?? 1000, 10000);
    const exclude = new Set(options?.exclude ?? []);
    const match = nameMatcher(pattern);
    const results: Array<{ path: string }> = [];
    const queue: Array<{ dir: string; depth: number }> = [{ dir: root, depth: 0 }];

    while (queue.length && results.length < max) {
      const { dir, depth } = queue.shift()!;
      if (depth > MAX_FIND_DEPTH) continue;
      let entries: Dirent[];
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (results.length >= max) break;
        if (entry.name.startsWith('.')) continue;
        if (exclude.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name)) queue.push({ dir: full, depth: depth + 1 });
        } else if (match(entry.name)) {
          results.push({ path: full });
        }
      }
    }
    return results;
  }

  async grep(searchTerm: string, options: GrepOptions): Promise<GrepData> {
    const { filePath, folderPath, pathAccess } = options;
    if (!filePath && !folderPath) throw new AppError('Either filePath or folderPath is required', 400);

    let regex: RegExp;
    try {
      regex = new RegExp(searchTerm, 'i');
    } catch (err: any) {
      throw new AppError(`Invalid regex pattern: ${searchTerm} - ${err.message}`, 400);
    }

    let files: string[];
    if (filePath) {
      files = [filePath];
    } else {
      if (!(await exists(folderPath!))) throw new AppError(`Folder not found: ${folderPath}`, 404);
      const found = await this.findFiles(folderPath!, '*', {
        max: options.maxFiles,
        exclude: options.exclude,
      });
      files = found.map((f) => f.path);
    }

    const maxSize = options.maxFileSize ?? DEFAULT_GREP_MAX_FILE_SIZE;
    const results: Record<string, { matches: GrepMatch[] }> = {};
    let filesSkippedSize = 0;
    let totalMatches = 0;

    for (const file of files) {
      try {
        pathAccess.safePath(file, 'path');
        if ((await fs.stat(file)).size > maxSize) {
          filesSkippedSize++;
          continue;
        }
        const matches: GrepMatch[] = [];
        (await fs.readFile(file, 'utf-8')).split(/\r?\n/).forEach((line, i) => {
          if (regex.test(line)) matches.push({ lineNumber: i + 1, lineContent: line.trim() });
        });
        if (matches.length > 0) {
          results[file] = { matches };
          totalMatches += matches.length;
        }
      } catch {
        continue;
      }
    }

    return {
      searchTerm,
      pattern: regex.source,
      results,
      totalFilesSearched: files.length,
      totalMatches,
      ...(filesSkippedSize > 0 ? { filesSkippedSize } : {}),
    };
  }

  async listProjectFiles(root: string): Promise<{ files: string[] }> {
    if (!(await exists(root))) throw new AppError(`Invalid workspace path: ${root}`, 404);
    const git = await this.gitCommand.run(['ls-files', '-z', '--cached', '--others', '--exclude-standard'], root);
    if (!git.error && git.stdout) {
      return { files: Array.from(new Set(git.stdout.split('\0').filter(Boolean))).slice(0, MAX_GIT_FILES) };
    }
    const files: string[] = [];
    await walkFiles(root, root, 0, files);
    return { files };
  }
}