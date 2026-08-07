import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import chokidar, { FSWatcher } from 'chokidar';
const exec = promisify(execCallback);

// ─── Watcher Manager ─────────────────────────────────────────────────────────
const watchers = new Map<string, FSWatcher>();

function startWatching(
  projectPath: string,
  sender: Electron.WebContents,
): void {
  if (watchers.has(projectPath)) return; // already watching

  // Debounce: gộp các event trong 300ms thành 1 lần gửi
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const changedDirs = new Set<string>();

  const flush = () => {
    changedDirs.forEach((dirPath) => {
      sender.send('fs:dir-changed', { dirPath, projectPath });
    });
    changedDirs.clear();
  };

  const watcher = chokidar.watch(projectPath, {
    ignored: [
      /(^|[\/\\])\../,           // dotfiles
      '**/node_modules/**',
      '**/.git/**',
    ],
    persistent: true,
    ignoreInitial: true,
    depth: 99,                   // đủ sâu cho mọi project
  });

  watcher.on('all', (_eventName, filePath) => {
    const dir = path.dirname(filePath);
    changedDirs.add(dir);

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(flush, 300);
  });

  watcher.on('error', (err) => {
    console.error(`[fs:watcher] Error watching ${projectPath}:`, err.message);
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

// Certificate installation state
let certInstalled = false;

export async function installSystemCA(): Promise<boolean> {
  try {
    const caPath = path.join(process.cwd(), '.http-mitm-proxy', 'certs', 'ca.pem');
    const destPath = '/usr/local/share/ca-certificates/phantoma.crt';

    if (!fs.existsSync(caPath)) {
      return false;
    }

    // Check if certificate is already installed
    if (fs.existsSync(destPath)) {
      return true;
    }

    // Use pkexec or sudo with timeout
    const command = `pkexec sh -c "cp '${caPath}' '${destPath}' && update-ca-certificates"`;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn('[Cert] Installation timed out after 30s');
        resolve(false);
      }, 30000);

      execCallback(command, (error: any, stdout: any, stderr: any) => {
        clearTimeout(timeout);
        if (error) {
          console.error('[Cert] Installation failed:', error.message);
          console.error('[Cert] stderr:', stderr);
          resolve(false);
          return;
        }
        certInstalled = true;
        resolve(true);
      });
    });
  } catch (e: any) {
    console.error('[Cert] Error installing CA:', e);
    return false;
  }
}

export function setupFSHandlers() {
  // ===== File System & Shell IPC Handlers =====
  ipcMain.handle('fs:read-file', async (_, filePath: string) => {
    try {
      if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
      return fs.readFileSync(filePath, 'utf-8');
    } catch (e: any) {
      throw new Error(`Failed to read file: ${e.message}`);
    }
  });

  ipcMain.handle('fs:write-file', async (_, filePath: string, content: string) => {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, 'utf-8');
      return true;
    } catch (e: any) {
      throw new Error(`Failed to write file: ${e.message}`);
    }
  });

  ipcMain.handle('fs:mkdir', async (_, dirPath: string) => {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      return true;
    } catch (e: any) {
      throw new Error(`Failed to create directory: ${e.message}`);
    }
  });

  ipcMain.handle('fs:list-dir', async (_, dirPath: string) => {
    try {
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
    } catch (e: any) {
      throw new Error(`Failed to list directory: ${e.message}`);
    }
  });

  ipcMain.handle('fs:watch-dir', async (event, projectPath: string) => {
    try {
      startWatching(projectPath, event.sender);
      return true;
    } catch (e: any) {
      throw new Error(`Failed to watch directory: ${e.message}`);
    }
  });

  ipcMain.handle('fs:unwatch-dir', async (_, projectPath: string) => {
    stopWatching(projectPath);
    return true;
  });

  ipcMain.handle('fs:delete', async (_, targetPath: string) => {
    try {
      if (!fs.existsSync(targetPath)) return false;
      const stat = fs.statSync(targetPath);
      if (stat.isDirectory()) {
        fs.rmSync(targetPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(targetPath);
      }
      return true;
    } catch (e: any) {
      throw new Error(`Failed to delete: ${e.message}`);
    }
  });

  ipcMain.handle('shell:exec', async (_, command: string, cwd?: string) => {
    return new Promise((resolve) => {
      execCallback(command, { cwd: cwd || process.cwd() }, (error: any, stdout: any, stderr: any) => {
        if (error) {
          resolve({ success: false, error: error.message, stderr, stdout });
        } else {
          resolve({ success: true, stdout, stderr });
        }
      });
    });
  });

  // Certificate Installation IPC
  ipcMain.handle('cert:install-system-ca', async () => {
    return await installSystemCA();
  });
}