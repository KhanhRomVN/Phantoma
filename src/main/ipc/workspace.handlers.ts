/**
 * ------------------------------------------------------------------
 * IPC Workspace Handlers
 * ------------------------------------------------------------------
 * Cung cấp dữ liệu workspace cho MessageInput: danh sách file/folder
 * (mention editor), quét git repository (GitRepoPickerDrawer), và
 * kiểm tra trạng thái git sẵn sàng (ActionDropdown).
 *
 * Channels:
 * - workspace:get-files        : Quét cây thư mục (respect gitignore nhẹ)
 * - workspace:get-folders      : Chỉ trả về folder trong workspace
 * - workspace:scan-git-repos   : Quét tối đa 4 cấp tìm repo có .git
 * - workspace:check-git-ready  : Kiểm tra workspace có staged change
 * - media:open-temp-image      : Ghi base64 ra file tạm và mở
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Electron ──
import { ipcMain, shell, BrowserWindow } from 'electron';

// ── Node.js ──
import { promises as fsPromises, existsSync, mkdirSync } from 'fs';
import { execFile } from 'child_process';
import { join, relative, sep } from 'path';
import { tmpdir } from 'os';

// ── Internal ──
import { logger } from '../utils/logger';

// ─── Constants ──────────────────────────────────────────────────────────
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

const MAX_FILES = 5000;
const MAX_DEPTH = 12;
const MAX_GIT_REPO_DEPTH = 4;

interface WorkspaceEntry {
  path: string;
  type: 'file' | 'folder';
}

interface GitRepoInfo {
  absPath: string;
  relPath: string;
  branch: string;
  staged: number;
  unstaged: number;
  untracked: number;
  added: number;
  deleted: number;
  unpushed: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────

/** Chuyển path tuyệt đối sang path tương đối dạng posix (dùng cho mention). */
function toPosixRelative(root: string, target: string): string {
  const rel = relative(root, target);
  return rel.split(sep).join('/');
}

async function walkDir(
  root: string,
  current: string,
  depth: number,
  files: WorkspaceEntry[],
  folders: WorkspaceEntry[],
): Promise<void> {
  if (depth > MAX_DEPTH) return;
  if (files.length >= MAX_FILES) return;

  let entries: import('fs').Dirent[];
  try {
    entries = await fsPromises.readdir(current, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (files.length >= MAX_FILES) return;
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;

    const fullPath = join(current, entry.name);
    const relPath = toPosixRelative(root, fullPath);

    if (entry.isDirectory()) {
      folders.push({ path: relPath, type: 'folder' });
      await walkDir(root, fullPath, depth + 1, files, folders);
    } else if (entry.isFile()) {
      files.push({ path: relPath, type: 'file' });
    }
  }
}

/** Spawn git CLI, resolve output; lỗi trả về chuỗi rỗng. */
function runGitArgs(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve) => {
    execFile(
      'git',
      args,
      { cwd, maxBuffer: 10 * 1024 * 1024 },
      (err: any, stdout: string) => {
        resolve(err ? '' : stdout);
      },
    );
  });
}

/** Đọc trạng thái 1 repo — dùng `git status --porcelain=v1` và `git log` để đếm. */
async function collectRepoInfo(absPath: string, root: string): Promise<GitRepoInfo | null> {
  const branch = (await runGitArgs(['rev-parse', '--abbrev-ref', 'HEAD'], absPath)).trim();
  const statusOut = await runGitArgs(['status', '--porcelain=v1'], absPath);
  if (!statusOut && !branch) return null;

  let staged = 0;
  let unstaged = 0;
  let untracked = 0;
  let added = 0;
  let deleted = 0;

  for (const line of statusOut.split('\n')) {
    if (line.length < 2) continue;
    const x = line[0]; // index
    const y = line[1]; // worktree
    if (x === '?' && y === '?') {
      untracked += 1;
      continue;
    }
    if (x !== ' ' && x !== '?') staged += 1;
    if (y !== ' ' && y !== '?') unstaged += 1;
  }

  const numstat = await runGitArgs(['diff', '--numstat'], absPath);
  const numstatCached = await runGitArgs(['diff', '--cached', '--numstat'], absPath);
  for (const out of [numstat, numstatCached]) {
    for (const line of out.split('\n')) {
      const parts = line.split('\t');
      if (parts.length >= 3) {
        added += parseInt(parts[0], 10) || 0;
        deleted += parseInt(parts[1], 10) || 0;
      }
    }
  }

  const unpushedOut = await runGitArgs(['log', 'origin/HEAD..HEAD', '--oneline'], absPath);
  const unpushed = unpushedOut.split('\n').filter((l) => l.trim().length > 0).length;

  return {
    absPath,
    relPath: toPosixRelative(root, absPath) || '.',
    branch: branch || 'detached',
    staged,
    unstaged,
    untracked,
    added,
    deleted,
    unpushed,
  };
}

async function scanRepos(
  root: string,
  current: string,
  depth: number,
  results: GitRepoInfo[],
): Promise<void> {
  if (depth > MAX_GIT_REPO_DEPTH) return;
  if (results.length >= 200) return;

  let entries: import('fs').Dirent[];
  try {
    entries = await fsPromises.readdir(current, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.') && entry.name !== '.git') continue;

    const fullPath = join(current, entry.name);
    if (entry.name === '.git') {
      const info = await collectRepoInfo(current, root);
      if (info) results.push(info);
      continue;
    }
    if (SKIP_DIRS.has(entry.name)) continue;
    await scanRepos(root, fullPath, depth + 1, results);
  }

  // Nếu root tự nó là repo (depth 0) — kiểm tra .git trực tiếp
  if (depth === 0 && existsSync(join(current, '.git'))) {
    const info = await collectRepoInfo(current, root);
    if (info && !results.some((r) => r.absPath === info.absPath)) {
      results.push(info);
    }
  }
}

// ─── Setup ──────────────────────────────────────────────────────────────
export function setupWorkspaceDataHandlers(): void {
  // ── Workspace files + folders ──
  ipcMain.handle('workspace:get-files', async (_, rootPath: string) => {
    try {
      if (!rootPath || !existsSync(rootPath)) {
        return { success: false, error: 'Invalid workspace path', files: [], folders: [] };
      }
      const files: WorkspaceEntry[] = [];
      const folders: WorkspaceEntry[] = [];
      await walkDir(rootPath, rootPath, 0, files, folders);
      return { success: true, files, folders };
    } catch (e: any) {
      logger.error('[workspace:get-files] Error:', e);
      return { success: false, error: e.message || String(e), files: [], folders: [] };
    }
  });

  ipcMain.handle('workspace:list-files', async (_, rootPath: string) => {
    try {
      if (!rootPath || !existsSync(rootPath)) return { success: false, files: [] };
      const out = await runGitArgs(
        ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
        rootPath,
      );
      if (out) {
        const files = out.split('\0').filter(Boolean);
        return { success: true, files: Array.from(new Set(files)).slice(0, 20000) };
      }
      // ASSUMED: non-git folders fall back to the SKIP_DIRS walk
      const files: WorkspaceEntry[] = [];
      const folders: WorkspaceEntry[] = [];
      await walkDir(rootPath, rootPath, 0, files, folders);
      return { success: true, files: files.map((f) => f.path) };
    } catch (e: any) {
      logger.error('[workspace:list-files] Error:', e);
      return { success: false, error: e.message || String(e), files: [] };
    }
  });

  ipcMain.handle('workspace:get-folders', async (_, rootPath: string) => {
    try {
      if (!rootPath || !existsSync(rootPath)) {
        return { success: false, error: 'Invalid workspace path', folders: [] };
      }
      const files: WorkspaceEntry[] = [];
      const folders: WorkspaceEntry[] = [];
      await walkDir(rootPath, rootPath, 0, files, folders);
      return { success: true, folders };
    } catch (e: any) {
      logger.error('[workspace:get-folders] Error:', e);
      return { success: false, error: e.message || String(e), folders: [] };
    }
  });

  // ── Git repo scan ──
  ipcMain.handle('workspace:scan-git-repos', async (_, rootPath: string) => {
    try {
      if (!rootPath || !existsSync(rootPath)) {
        return { success: false, error: 'Invalid workspace path', repos: [] };
      }
      const repos: GitRepoInfo[] = [];
      await scanRepos(rootPath, rootPath, 0, repos);
      return { success: true, repos };
    } catch (e: any) {
      logger.error('[workspace:scan-git-repos] Error:', e);
      return { success: false, error: e.message || String(e), repos: [] };
    }
  });

  // ── Git ready check (dùng cho ActionDropdown) ──
  ipcMain.handle('workspace:check-git-ready', async (_, rootPath: string) => {
    try {
      const cwd = rootPath || process.cwd();
      const hasGit = existsSync(join(cwd, '.git'));
      if (!hasGit) {
        return { hasGit: false, hasStaged: false, reason: 'Workspace is not a git repository' };
      }
      const stagedOut = await runGitArgs(['diff', '--cached', '--name-only'], cwd);
      const hasStaged = stagedOut.trim().length > 0;
      return {
        hasGit: true,
        hasStaged,
        reason: hasStaged ? undefined : 'No staged changes. Run git add first.',
      };
    } catch (e: any) {
      logger.error('[workspace:check-git-ready] Error:', e);
      return { hasGit: false, hasStaged: false, reason: e.message || String(e) };
    }
  });

  // ── Open temp image ──
  ipcMain.handle(
    'media:open-temp-image',
    async (event, payload: { content: string; filename: string }) => {
      try {
        const win = BrowserWindow.fromWebContents(event.sender);
        const base64 = payload.content.includes(',')
          ? payload.content.split(',')[1]
          : payload.content;
        const buf = Buffer.from(base64, 'base64');
        const dir = join(tmpdir(), 'phantoma-temp-images');
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        const safeName = payload.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = join(dir, `${Date.now()}-${safeName}`);
        await fsPromises.writeFile(filePath, buf);
        if (win) {
          await shell.openPath(filePath);
        } else {
          await shell.openPath(filePath);
        }
        return { success: true, filePath };
      } catch (e: any) {
        logger.error('[media:open-temp-image] Error:', e);
        return { success: false, error: e.message || String(e) };
      }
    },
  );
}