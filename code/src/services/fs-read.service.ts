import { promises as fs } from 'fs';
import type { Dirent } from 'fs';
import path from 'path';
import { AppError } from '../utils/http';
import { safePath } from '../utils/guard';
import { runGit } from './git-runner';

export interface FileStat {
  size: number;
  isDirectory: boolean;
  isFile: boolean;
  mtime: number;
  ctime: number;
}

export interface TreeNode {
  name: string;
  type: 'file' | 'folder';
  size?: number;
  children?: TreeNode[];
}

export interface TreeOptions {
  depth: number;
  exclude: string[];
  hidden: boolean;
}

export interface FindFilesOptions {
  max?: number;
  exclude?: string[];
}

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

export interface GrepMatch {
  lineNumber: number;
  lineContent: string;
}

export interface GrepOptions {
  filePath?: string;
  folderPath?: string;
  maxFiles?: number;
  maxFileSize?: number;
  exclude?: string[];
}

export interface GrepData {
  searchTerm: string;
  pattern: string;
  results: Record<string, { matches: GrepMatch[] }>;
  totalFilesSearched: number;
  totalMatches: number;
  filesSkippedSize?: number;
}

const DEFAULT_GREP_MAX_FILE_SIZE = 1024 * 1024;
const MAX_TREE_DEPTH = 20;
const MAX_FIND_DEPTH = 10;
const MAX_WALK_DEPTH = 12;
const MAX_WALK_FILES = 5000;
const MAX_GIT_FILES = 20000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

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
    else if (entry.isFile()) files.push(path.relative(root, full).split(path.sep).join('/'));
  }
}

export const fsReadService = {
  readFile: async (filePath: string): Promise<string> => {
    if (!(await exists(filePath))) throw new AppError(`File not found: ${filePath}`, 404);
    for (let attempt = 0; attempt < 5; attempt++) {
      const content = await fs.readFile(filePath, 'utf-8');
      const stat = await fs.stat(filePath);
      if (content.length > 0 || stat.size === 0) return content;
      if (attempt < 4) await sleep(100 * (attempt + 1));
    }
    return fs.readFile(filePath, 'utf-8');
  },

  stat: async (filePath: string): Promise<FileStat> => {
    try {
      const s = await fs.stat(filePath);
      return {
        size: s.size,
        isDirectory: s.isDirectory(),
        isFile: s.isFile(),
        mtime: s.mtimeMs,
        ctime: s.ctimeMs,
      };
    } catch {
      throw new AppError(`File not found: ${filePath}`, 404);
    }
  },

  tree: async (dirPath: string, options: TreeOptions): Promise<TreeNode[]> => {
    const depth = Math.min(Math.max(Math.floor(options.depth) || 1, 1), MAX_TREE_DEPTH);
    try {
      return await buildTree(dirPath, depth, new Set(options.exclude), options.hidden);
    } catch (err: any) {
      throw new AppError(`Failed to read directory: ${err.message}`, 404);
    }
  },

  findFiles: async (root: string, pattern: string, options: FindFilesOptions = {}): Promise<Array<{ path: string }>> => {
    const skip = new Set(['node_modules', ...(options.exclude ?? [])]);
    const max = options.max && options.max > 0 ? options.max : Infinity;
    const matches = nameMatcher(pattern);
    const results: Array<{ path: string }> = [];

    const walk = async (dir: string, depth: number): Promise<void> => {
      if (depth > MAX_FIND_DEPTH || results.length >= max) return;
      let entries: Dirent[];
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (results.length >= max) return;
        if (entry.name.startsWith('.') || skip.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(full, depth + 1);
        else if (matches(entry.name)) results.push({ path: full });
      }
    };

    await walk(root, 0);
    return results;
  },

  readLines: async (filePath: string, start: number, end?: number): Promise<string> => {
    const lines = (await fsReadService.readFile(filePath)).split(/\r?\n/);
    return lines.slice(start || 0, end !== undefined ? end + 1 : lines.length).join('\n');
  },

  grep: async (searchTerm: string, options: GrepOptions): Promise<GrepData> => {
    const { filePath, folderPath } = options;
    if (!filePath && !folderPath) throw new AppError('Either filePath or folderPath must be provided', 400);
    if (filePath && folderPath) throw new AppError('Provide only one of filePath or folderPath, not both', 400);

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
      const found = await fsReadService.findFiles(folderPath!, '*', {
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
        safePath(file, 'path');
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
  },

  listProjectFiles: async (root: string): Promise<{ files: string[] }> => {
    if (!(await exists(root))) throw new AppError(`Invalid workspace path: ${root}`, 404);
    const git = await runGit(['ls-files', '-z', '--cached', '--others', '--exclude-standard'], root);
    if (!git.error && git.stdout) {
      return { files: Array.from(new Set(git.stdout.split('\0').filter(Boolean))).slice(0, MAX_GIT_FILES) };
    }
    const files: string[] = [];
    await walkFiles(root, root, 0, files);
    return { files };
  },
};