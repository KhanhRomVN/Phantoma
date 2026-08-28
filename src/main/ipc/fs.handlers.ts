/**
 * ------------------------------------------------------------------
 * IPC handler hệ thống file
 * ------------------------------------------------------------------
 * IPC handler hệ thống file cho renderer. Cung cấp đọc-ghi file/thư mục,
 * liệt kê, tìm kiếm, lệnh shell, theo dõi file và
 * cài đặt CA hệ thống.
 *
 * Hàm chính:
 * - setupFSHandlers()   : Đăng ký tất cả IPC handler fs:/shell:/cert:
 * - installSystemCA()   : Cài đặt CA Phantoma vào kho tin cậy hệ thống
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Electron ──
import { ipcMain } from 'electron';

// ── Node.js ──
import * as fs from 'fs';
import * as path from 'path';
import { exec as execCallback } from 'child_process';

// ── External ──
import chokidar, { FSWatcher } from 'chokidar';

// ── Internal ──
import { logger } from '../utils/logger';

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

  ipcMain.handle('fs:mkdir', async (_, dirPath: string) => {
    fs.mkdirSync(dirPath, { recursive: true });
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

  // Delete file/folder (original)
  ipcMain.handle('fs:delete', async (_, targetPath: string) => {
    if (!fs.existsSync(targetPath)) return false;
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) fs.rmSync(targetPath, { recursive: true, force: true });
    else fs.unlinkSync(targetPath);
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

  // Grep / regex search
  ipcMain.handle('fs:grep', async (_, targetPath: string, searchTerm: string) => {
    const regex = new RegExp(searchTerm, 'i');
    const results: Record<string, { matches: Array<{ lineNumber: number; lineContent: string }> }> =
      {};
    const MAX_FILE_SIZE = 1024 * 1024;

    const searchInFile = (filePath: string) => {
      try {
        const stat = fs.statSync(filePath);
        if (stat.size > MAX_FILE_SIZE) return;
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split(/\r?\n/);
        const matches: Array<{ lineNumber: number; lineContent: string }> = [];
        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i]))
            matches.push({ lineNumber: i + 1, lineContent: lines[i].trim() });
        }
        if (matches.length > 0) results[filePath] = { matches };
      } catch {
        logger.warn(`[fs] Skipping unreadable file: ${filePath}`);
      }
    };

    const stat = fs.statSync(targetPath);
    if (stat.isFile()) {
      searchInFile(targetPath);
    } else if (stat.isDirectory()) {
      const walk = (dir: string, depth: number) => {
        if (depth > 10) return;
        try {
          for (const entry of fs.readdirSync(dir)) {
            if (entry.startsWith('.') || entry === 'node_modules') continue;
            const fullPath = path.join(dir, entry);
            try {
              const s = fs.statSync(fullPath);
              if (s.isDirectory()) walk(fullPath, depth + 1);
              else if (s.isFile()) searchInFile(fullPath);
            } catch {
              logger.warn(`[fs] Skipping inaccessible path: ${fullPath}`);
            }
          }
        } catch {
          logger.warn(`[fs] Skipping inaccessible directory: ${dir}`);
        }
      };
      walk(targetPath, 0);
    }

    const totalMatches = Object.values(results).reduce((sum, r) => sum + r.matches.length, 0);
    return { results, totalFilesSearched: Object.keys(results).length, totalMatches };
  });

  // Shell: open path in OS file manager
  ipcMain.handle('shell:open-path', async (_, targetPath: string) => {
    const { shell } = await import('electron');
    return shell.openPath(targetPath);
  });

  // Shell: exec command
  ipcMain.handle('shell:exec', async (_, command: string, cwd?: string) => {
    return new Promise((resolve) => {
      execCallback(
        command,
        { cwd: cwd || process.cwd() },
        (error: any, stdout: any, stderr: any) => {
          if (error) resolve({ success: false, error: error.message, stderr, stdout });
          else resolve({ success: true, stdout, stderr });
        },
      );
    });
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

  ipcMain.handle('fs:unwatch-file', async (_, filePath: string) => {
    stopWatchingFile(filePath);
    return true;
  });

  // Certificate
  ipcMain.handle('cert:install-system-ca', async () => {
    return await installSystemCA();
  });

  // Get homedir
  ipcMain.handle('fs:get-homedir', async () => {
    return require('os').homedir();
  });
}
