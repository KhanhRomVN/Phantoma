import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
const exec = promisify(execCallback);

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
