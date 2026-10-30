/**
 * ------------------------------------------------------------------
 * IPC File System Handlers
 * ------------------------------------------------------------------
 * Bộ API hệ thống file đầy đủ cho Renderer process. Hỗ trợ thao tác
 * file/thư mục cơ bản, tìm kiếm regex/glob, giám sát thay đổi realtime
 * (via chokidar), thực thi shell command và quản lý chứng chỉ TLS hệ thống.
 *
 * Constants:
 * - watchers      : Map quản lý các FSWatcher cấp thư mục đang hoạt động
 * - fileWatchers  : Map quản lý các FSWatcher cấp file đơn lẻ đang hoạt động
 *
 * Channels:
 * - fs:read-file        : Đọc nội dung text từ một file
 * - fs:write-file       : Ghi đè hoặc tạo mới file với content string
 * - fs:list-dir         : Liệt kê chi tiết file/thư mục con (có stat info)
 * - fs:read-dir         : Liệt kê nhanh tên và type của entries trong thư mục
 * - fs:stat             : Lấy thông tin metadata (size, mtime, isDir...) của path
 * - fs:delete-file      : Xóa một file duy nhất
 * - fs:remove-dir       : Xóa thư mục và toàn bộ nội dung bên trong (rm -rf)
 * - fs:rename           : Đổi tên hoặc di chuyển file/thư mục
 * - fs:find-files       : Tìm kiếm file theo tên/pattern trong cây thư mục
 * - fs:search           : Tìm kiếm nâng cao với option case/word/regex/include/exclude
 * - fs:replace-all      : Thay thế hàng loạt chuỗi khớp trong nhiều file
 * - shell:open-path     : Mở path mặc định bằng ứng dụng hệ thống (xdg-open/open)
 * - fs:watch-dir        : Bắt đầu giám sát thay đổi trong thư mục
 * - fs:unwatch-dir      : Ngừng giám sát thư mục
 * - fs:watch-file       : Giám sát thay đổi của một file cụ thể
 * - fs:get-homedir      : Lấy đường dẫn home directory hiện tại
 * - fs:validate-paths   : Kiểm tra sự tồn tại và tính hợp lệ của danh sách paths
 *
 * Functions:
 * - setupFSHandlers()   : Entry point đăng ký tập hợp lớn IPC handler (fs:, shell:, cert:)
 * - installSystemCA()   : Logic cài đặt certificate gốc của Phantoma vào OS
 *
 * Utils:
 * - matchPattern()      : Helper so khớp glob pattern đơn giản
 * - globToRegex()       : Converter Glob -> RegExp
 * - buildSearchRegex()  : Builder RegExp cho search feature
 * - startWatching()     : Lifecycle manager cho directory watchers
 * - stopWatching()      : Cleanup cho directory watchers
 * - startWatchingFile() : Lifecycle manager cho file watchers
 * - stopWatchingFile()  : Cleanup cho file watchers
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Electron ──
import { ipcMain } from 'electron';

// ── Node.js ──
import * as fs from 'fs';
import * as path from 'path';
import { exec as execCallback, spawn, ChildProcess } from 'child_process';

// ── External ──
import chokidar, { FSWatcher } from 'chokidar';

// ── Internal ──
import { logger } from '../utils/logger';
import { scanSquareImages, readImageDataUrl } from '../utils/image-scan';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Simple glob pattern matching */
function matchPattern(name: string, pattern: string): boolean {
  const regexStr = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.');
  try {
    return new RegExp('^' + regexStr + '$', 'i').test(name);
  } catch {
    logger.warn(`[fs] Invalid glob pattern: ${pattern}, falling back to substring match`);
    return name.includes(pattern);
  }
}

/** Convert glob pattern (supports `*`, `?`, comma-separated) to RegExp for path filtering. */
function globToRegex(pattern: string): RegExp | null {
  const parts = pattern
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const sources = parts.map((p) =>
    p
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.'),
  );
  return new RegExp(`(?:${sources.join('|')})`, 'i');
}

/** Build a search RegExp from query and VS Code-like search options. */
function buildSearchRegex(
  query: string,
  options: { caseSensitive?: boolean; wholeWord?: boolean; isRegex?: boolean },
): RegExp {
  const { caseSensitive, wholeWord, isRegex } = options;
  let source = isRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (wholeWord) source = `\\b(?:${source})\\b`;
  const flags = caseSensitive ? 'g' : 'gi';
  return new RegExp(source, flags);
}

const RG_BIN = require
  .resolve(
    `@vscode/ripgrep-${process.platform}-${process.arch}/bin/${process.platform === 'win32' ? 'rg.exe' : 'rg'}`,
  )
  .replace('app.asar', 'app.asar.unpacked');
const RG_EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build'];
const RG_MAX_MATCHES = 10000;
const RG_FLUSH_MS = 50;

interface RgSearchOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  isRegex?: boolean;
  includePattern?: string;
  excludePattern?: string;
}

interface RgFileResult {
  file: string;
  matches: Array<{ lineNumber: number; lineContent: string; column: number }>;
}

const activeSearches = new Map<string, ChildProcess>();

function splitGlobs(pattern?: string): string[] {
  return (pattern ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
}

function rgText(field: { text?: string; bytes?: string } | undefined): string | null {
  if (!field) return null;
  if (typeof field.text === 'string') return field.text;
  if (typeof field.bytes === 'string') return Buffer.from(field.bytes, 'base64').toString('utf-8');
  return null;
}

function buildRgArgs(query: string, options: RgSearchOptions, searchPath: string): string[] {
  const args = ['--json', '--hidden', '--no-ignore', '--engine', 'auto'];
  args.push(options.caseSensitive ? '--case-sensitive' : '--ignore-case');
  if (options.wholeWord) args.push('--word-regexp');
  if (!options.isRegex) args.push('--fixed-strings');
  for (const glob of splitGlobs(options.includePattern)) args.push('--glob', glob);
  for (const dir of RG_EXCLUDE_DIRS) args.push('--glob', `!**/${dir}/**`);
  for (const glob of splitGlobs(options.excludePattern)) args.push('--glob', `!${glob}`);
  args.push('--regexp', query, '--', searchPath);
  return args;
}

// ─── Watcher Manager ─────────────────────────────────────────────────────────

const watchers = new Map<string, FSWatcher>();

function startWatching(projectPath: string, sender: Electron.WebContents): void {
  if (watchers.has(projectPath)) return;

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const changedDirs = new Set<string>();

  const flush = () => {
    changedDirs.forEach((dirPath) => {
      sender.send('fs:dir-changed', { dirPath, projectPath });
    });
    changedDirs.clear();
  };

  const watcher = chokidar.watch(projectPath, {
    ignored: [/(^|[\/\\])\../, '**/node_modules/**', '**/.git/**', '**/log.log'],
    persistent: true,
    ignoreInitial: true,
    depth: 99,
  });

  watcher.on('all', (_eventName, filePath) => {
    const dir = path.dirname(filePath);
    changedDirs.add(dir);
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(flush, 300);
  });

  watcher.on('error', (err) => {
    logger.error('[fs:watcher] Error watching ' + projectPath + ':', err.message);
  });

  watchers.set(projectPath, watcher);
}

function stopWatching(projectPath: string): void {
  const watcher = watchers.get(projectPath);
  if (watcher) {
    watcher.close();
    watchers.delete(projectPath);
  }
}

// ─── Per-file Watcher ────────────────────────────────────────────────────────

const fileWatchers = new Map<string, FSWatcher>();

function startWatchingFile(filePath: string, sender: Electron.WebContents): void {
  if (fileWatchers.has(filePath)) return;

  const watcher = chokidar.watch(filePath, {
    persistent: true,
    ignoreInitial: true,
    atomic: true,
  });

  watcher.on('change', () => {
    try {
      const stat = fs.statSync(filePath);
      sender.send('fs:file-changed', { filePath, mtime: stat.mtimeMs });
    } catch {
      logger.warn(`[fs:file-watcher] Failed to stat changed file: ${filePath}`);
    }
  });

  watcher.on('error', (err: Error) => {
    logger.error(`[fs:file-watcher] Error watching ${filePath}:`, err.message);
  });

  fileWatchers.set(filePath, watcher);
}

function stopWatchingFile(filePath: string): void {
  const watcher = fileWatchers.get(filePath);
  if (watcher) {
    watcher.close();
    fileWatchers.delete(filePath);
  }
}

// ─── Certificate ────────────────────────────────────────────────────────────

export async function installSystemCA(): Promise<boolean> {
  try {
    const caPath = path.join(process.cwd(), '.http-mitm-proxy', 'certs', 'ca.pem');
    const destPath = '/usr/local/share/ca-certificates/phantoma.crt';
    if (!fs.existsSync(caPath)) return false;
    if (fs.existsSync(destPath)) return true;

    const command =
      'pkexec sh -c "cp \'' + caPath + "' '" + destPath + '\' && update-ca-certificates"';
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, 30000);
      execCallback(command, (error: any, _stdout: any, stderr: any) => {
        clearTimeout(timeout);
        if (error) {
          logger.error('[Cert] Failed:', error.message, stderr);
          resolve(false);
          return;
        }
        resolve(true);
      });
    });
  } catch (e: any) {
    logger.error('[Cert] Error:', e);
    return false;
  }
}

// ─── Setup ───────────────────────────────────────────────────────────────────

export function setupFSHandlers() {
  // File read/write
  ipcMain.handle('fs:read-file', async (_, filePath: string) => {
    if (!fs.existsSync(filePath)) throw new Error('File not found: ' + filePath);
    for (let attempt = 0; attempt < 5; attempt++) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const stat = fs.statSync(filePath);
      if (content.length > 0 || stat.size === 0) return content;
      if (attempt < 4) {
        await new Promise((r) => setTimeout(r, 100 * (attempt + 1)));
      }
    }
    return fs.readFileSync(filePath, 'utf-8');
  });

  ipcMain.handle('fs:write-file', async (_, filePath: string, content: string) => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  });

  // Directory listing (original)
  ipcMain.handle('fs:list-dir', async (_, dirPath: string) => {
    const files = fs.readdirSync(dirPath);
    return files.map((file) => {
      const fullPath = path.join(dirPath, file);
      const stats = fs.statSync(fullPath);
      return {
        name: file,
        path: fullPath,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        mtime: stats.mtimeMs,
      };
    });
  });

  ipcMain.handle('fs:read-dir', async (_, dirPath: string) => {
    const files = fs.readdirSync(dirPath);
    return files.map((file) => {
      const fullPath = path.join(dirPath, file);
      let type: 'file' | 'folder' = 'file';
      let size: number | undefined;
      try {
        const stats = fs.statSync(fullPath);
        type = stats.isDirectory() ? 'folder' : 'file';
        size = stats.size;
      } catch {
        logger.warn(`[fs] Failed to stat file: ${fullPath}`);
        /* keep defaults */
      }
      return { name: file, type, size };
    });
  });

  // File stat
  ipcMain.handle('fs:stat', async (_, filePath: string) => {
    if (!fs.existsSync(filePath)) throw new Error('File not found: ' + filePath);
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      mtime: stats.mtimeMs,
      ctime: stats.ctimeMs,
    };
  });

  // Delete file
  ipcMain.handle('fs:delete-file', async (_, filePath: string) => {
    if (!fs.existsSync(filePath)) throw new Error('File not found: ' + filePath);
    fs.unlinkSync(filePath);
    return true;
  });

  // Delete folder (recursive)
  ipcMain.handle('fs:remove-dir', async (_, dirPath: string) => {
    if (!fs.existsSync(dirPath)) throw new Error('Directory not found: ' + dirPath);
    fs.rmSync(dirPath, { recursive: true, force: true });
    return true;
  });

  // Rename file/folder
  ipcMain.handle('fs:rename', async (_, oldPath: string, newPath: string) => {
    if (!fs.existsSync(oldPath)) throw new Error('File not found: ' + oldPath);
    fs.mkdirSync(path.dirname(newPath), { recursive: true });
    fs.renameSync(oldPath, newPath);
    return true;
  });

  // Find files by pattern
  ipcMain.handle('fs:find-files', async (_, dirPath: string, pattern: string) => {
    const results: string[] = [];
    const walk = (currentDir: string, depth: number) => {
      if (depth > 10) return;
      try {
        const entries = fs.readdirSync(currentDir);
        for (const entry of entries) {
          if (entry.startsWith('.') || entry === 'node_modules') continue;
          const fullPath = path.join(currentDir, entry);
          try {
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) walk(fullPath, depth + 1);
            else if (matchPattern(entry, pattern)) results.push(fullPath);
          } catch {
            logger.warn(`[fs] Skipping inaccessible path: ${fullPath}`);
          }
        }
      } catch {
        logger.warn(`[fs] Skipping inaccessible directory: ${currentDir}`);
      }
    };
    walk(dirPath, 0);
    return results.map((p) => ({ path: p }));
  });

  // Streaming content search powered by ripgrep (results pushed via fs:search-chunk / fs:search-done)
  ipcMain.handle(
    'fs:search-start',
    (
      event,
      searchId: string,
      projectPath: string,
      query: string,
      options: RgSearchOptions = {},
    ) => {
      const sender = event.sender;
      const send = (channel: string, payload: unknown) => {
        if (!sender.isDestroyed()) sender.send(channel, payload);
      };

      const proc = spawn(RG_BIN, buildRgArgs(query, options, projectPath), { windowsHide: true });
      activeSearches.set(searchId, proc);

      let buffer = '';
      let stderr = '';
      let current: RgFileResult | null = null;
      let pending: RgFileResult[] = [];
      let totalMatches = 0;
      let totalFiles = 0;
      let truncated = false;
      let flushTimer: ReturnType<typeof setTimeout> | null = null;

      const flush = () => {
        if (flushTimer) {
          clearTimeout(flushTimer);
          flushTimer = null;
        }
        if (pending.length === 0) return;
        send('fs:search-chunk', { searchId, results: pending });
        pending = [];
      };

      const handleLine = (line: string) => {
        if (!line) return;
        let msg: any;
        try {
          msg = JSON.parse(line);
        } catch {
          return;
        }
        const data = msg.data;
        if (msg.type === 'begin') {
          const file = rgText(data.path);
          current = file ? { file, matches: [] } : null;
        } else if (msg.type === 'match' && current) {
          const text = rgText(data.lines);
          if (text === null) return;
          const content = text.replace(/\r?\n$/, '');
          const startByte: number = data.submatches?.[0]?.start ?? 0;
          const column = Buffer.from(content).subarray(0, startByte).toString('utf-8').length + 1;
          current.matches.push({
            lineNumber: data.line_number,
            lineContent: content.substring(0, 500),
            column,
          });
          totalMatches++;
          if (totalMatches >= RG_MAX_MATCHES && !truncated) {
            truncated = true;
            proc.kill();
          }
        } else if (msg.type === 'end' && current) {
          if (current.matches.length > 0) {
            pending.push(current);
            totalFiles++;
            if (!flushTimer) flushTimer = setTimeout(flush, RG_FLUSH_MS);
          }
          current = null;
        }
      };

      proc.stdout.setEncoding('utf-8');
      proc.stdout.on('data', (chunk: string) => {
        buffer += chunk;
        let nl: number;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          handleLine(buffer.slice(0, nl));
          buffer = buffer.slice(nl + 1);
        }
      });

      proc.stderr.on('data', (chunk) => {
        if (stderr.length < 2000) stderr += chunk.toString();
      });

      proc.on('error', (err) => {
        if (!activeSearches.delete(searchId)) return;
        send('fs:search-done', {
          searchId,
          totalMatches,
          totalFiles,
          truncated,
          error: err.message,
        });
      });

      proc.on('close', (code) => {
        if (!activeSearches.delete(searchId)) return;
        if (buffer) handleLine(buffer);
        if (current && current.matches.length > 0) {
          pending.push(current);
          totalFiles++;
        }
        flush();
        const failed = code === 2 && totalMatches === 0;
        send('fs:search-done', {
          searchId,
          totalMatches,
          totalFiles,
          truncated,
          error: failed ? stderr.trim().split('\n')[0] || 'Search failed' : undefined,
        });
      });
    },
  );

  ipcMain.handle('fs:search-cancel', async (_, searchId: string) => {
    const proc = activeSearches.get(searchId);
    activeSearches.delete(searchId);
    proc?.kill();
  });

  // Replace all matches in the given files (used by the Search panel)
  ipcMain.handle(
    'fs:replace-all',
    async (
      _,
      files: string[],
      query: string,
      replacement: string,
      options: { caseSensitive?: boolean; wholeWord?: boolean; isRegex?: boolean } = {},
    ) => {
      if (!query || files.length === 0) {
        return { replacedFiles: 0, replacedMatches: 0 };
      }
      let regex: RegExp;
      try {
        regex = buildSearchRegex(query, options);
      } catch {
        throw new Error('Invalid search pattern');
      }
      let replacedFiles = 0;
      let replacedMatches = 0;
      for (const filePath of files) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          let count = 0;
          const newContent = content.replace(regex, () => {
            count++;
            return replacement;
          });
          if (count > 0) {
            fs.writeFileSync(filePath, newContent, 'utf-8');
            replacedFiles++;
            replacedMatches += count;
          }
        } catch (e: any) {
          logger.warn(`[fs:replace-all] Failed on ${filePath}: ${e?.message ?? e}`);
        }
      }
      return { replacedFiles, replacedMatches };
    },
  );

  // Shell: open path in OS file manager
  ipcMain.handle('shell:open-path', async (_, targetPath: string) => {
    const { shell } = await import('electron');
    const result = await shell.openPath(targetPath);
    return result;
  });

  // File watcher
  ipcMain.handle('fs:watch-dir', async (event, projectPath: string) => {
    startWatching(projectPath, event.sender);
    return true;
  });

  ipcMain.handle('fs:unwatch-dir', async (_, projectPath: string) => {
    stopWatching(projectPath);
    return true;
  });

  // Per-file watcher
  ipcMain.handle('fs:watch-file', async (event, filePath: string) => {
    startWatchingFile(filePath, event.sender);
    return true;
  });

  // Get homedir
  ipcMain.handle('fs:get-homedir', async () => {
    return require('os').homedir();
  });

  // Validate existence of multiple paths (for cleaning up stale projects)
  ipcMain.handle('fs:validate-paths', async (_, paths: string[]) => {
    const invalidPaths: string[] = [];
    for (const p of paths) {
      try {
        if (!p || !fs.existsSync(p)) {
          invalidPaths.push(p);
        } else {
          // Additional check: ensure it's a directory, not a file
          const stat = fs.statSync(p);
          if (!stat.isDirectory()) {
            invalidPaths.push(p);
          }
        }
      } catch {
        invalidPaths.push(p);
      }
    }
    return { validCount: paths.length - invalidPaths.length, invalidPaths };
  });

  ipcMain.handle('fs:scan-square-images', async (_, projectPath: string) => {
    try {
      return await scanSquareImages(projectPath);
    } catch (err) {
      logger.warn('[fs] scan-square-images failed:', err);
      return [];
    }
  });

  ipcMain.handle('fs:read-image-data-url', async (_, filePath: string, maxSide?: number) => {
    return readImageDataUrl(filePath, maxSide);
  });
}
