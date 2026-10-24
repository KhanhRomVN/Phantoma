/**
 * ------------------------------------------------------------------
 * IPC Dialog & System Handlers
 * ------------------------------------------------------------------
 * Quản lý các tương tác với hệ thống điều hành và giao diện người dùng
 * cấp thấp (Native Dialogs, Notifications, System Info).
 * Tách biệt khỏi logic nghiệp vụ (Business Logic) để dễ dàng mock/test.
 *
 * Channels:
 * - dialog:show-save       : Generic Save Dialog wrapper
 * - system:get-info        : Lấy thông tin OS, Shell, Home Dir
 *
 * Functions:
 * - setupDialogHandlers() : Entry point đăng ký IPC handler nhóm 'dialog:' và 'system:'
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { ipcMain, BrowserWindow, dialog, shell } from 'electron';
import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { logger } from '../utils/logger';

// ─── Helpers ───────────────────────────────────────────────────────────
function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows();
  return windows.length > 0 ? windows[0] : null;
}

function findChromiumExecutable(): string {
  if (process.platform === 'win32') {
    const progFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
    const progFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const localAppData =
      process.env['LocalAppData'] ||
      (process.env['USERPROFILE'] ? path.join(process.env['USERPROFILE'], 'AppData', 'Local') : '');
    const candidates = [
      path.join(progFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(progFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(progFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(progFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(progFiles, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
      path.join(progFilesX86, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
      path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
    ];
    for (const c of candidates) {
      if (c && fs.existsSync(c)) return c;
    }
  } else if (process.platform === 'darwin') {
    const candidates = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  }

  for (const b of [
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
    'microsoft-edge',
    'brave-browser',
  ]) {
    try {
      execSync(`which ${b}`, { stdio: 'ignore' });
      return b;
    } catch {
      continue;
    }
  }
  return '';
}

// ─── Setup ──────────────────────────────────────────────────────────────
export function setupDialogHandlers(): void {
  // ── Show Save Dialog ──
  ipcMain.handle('dialog:show-save', async (_event, options: any) => {
    try {
      const win = getMainWindow();
      if (!win) return { success: false, canceled: true, error: 'No window' };

      const result = await dialog.showSaveDialog(win, {
        title: options.title || 'Save File As',
        defaultPath: options.defaultPath,
        filters: options.filters,
        properties: options.properties || ['createDirectory'],
      });

      if (!result.canceled && result.filePath) {
        return { success: true, filePath: result.filePath };
      }
      return { success: false, canceled: true };
    } catch (e: any) {
      logger.error('[dialog:show-save] Error:', e);
      return { success: false, error: e.message };
    }
  });

  // ── Select files / folders ──
  ipcMain.handle(
    'dialog:select-paths',
    async (_event, options: { kind: 'file' | 'folder'; multiple?: boolean }) => {
      try {
        const win = getMainWindow();
        if (!win) return { success: false, canceled: true, error: 'No window' };

        const properties: Array<'openFile' | 'openDirectory' | 'multiSelections'> =
          options.kind === 'folder' ? ['openDirectory'] : ['openFile'];
        if (options.multiple) properties.push('multiSelections');

        const result = await dialog.showOpenDialog(win, { properties });

        if (result.canceled) return { success: false, canceled: true, paths: [] };
        return { success: true, paths: result.filePaths };
      } catch (e: any) {
        logger.error('[dialog:select-paths] Error:', e);
        return { success: false, error: e.message, paths: [] };
      }
    },
  );


  // ── Open Chromium with a specific profile (no CDP) ──
  ipcMain.handle('openBrowserWithProfile', async (_event, message: any) => {
    const url = message?.url as string | undefined;
    const userDataDir = message?.userDataDir as string | undefined;
    const profileDirectory = message?.profileDirectory as string | undefined;

    if (!url || typeof url !== 'string') return;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
    } catch {
      return;
    }

    const executable = findChromiumExecutable();
    if (!executable) {
      logger.warn('[openBrowserWithProfile] No Chromium found, falling back to openExternal');
      await shell.openExternal(url).catch(() => undefined);
      return;
    }

    const args: string[] = ['--no-first-run', '--no-default-browser-check'];
    if (userDataDir) {
      try {
        fs.mkdirSync(userDataDir, { recursive: true });
      } catch {
        logger.warn('[openBrowserWithProfile] Cannot create userDataDir:', userDataDir);
      }
      args.push(`--user-data-dir=${userDataDir}`);
    }
    if (profileDirectory && /^[\w .-]+$/.test(profileDirectory)) {
      args.push(`--profile-directory=${profileDirectory}`);
    }
    args.push(url);

    try {
      const child = spawn(executable, args, { detached: true, stdio: 'ignore' });
      child.unref();
    } catch (e: any) {
      logger.error('[openBrowserWithProfile] Error:', e);
      await shell.openExternal(url).catch(() => undefined);
    }
  });

  // ── Get System Info ──
  ipcMain.handle('system:get-info', async () => {
    return {
      os: `${os.platform()} ${os.release()}`,
      arch: os.arch(),
      ide: 'Phantoma (Electron)',
      shell: process.env.SHELL || (os.platform() === 'win32' ? 'powershell' : '/bin/bash'),
      homeDir: os.homedir(),
      cwd: process.cwd(),
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
    };
  });
}
