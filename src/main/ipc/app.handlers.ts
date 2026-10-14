/**
 * ------------------------------------------------------------------
 * IPC App Handlers
 * ------------------------------------------------------------------
 * Đăng ký IPC handler cho các thao tác liên quan đến ứng dụng hệ thống:
 * liệt kê danh sách ứng dụng đã cài đặt (cross-platform) và truy vấn
 * mức sử dụng bộ nhớ của tiến trình Electron.
 *
 * Types:
 * - DiscoveredApp   : Cấu trúc dữ liệu đại diện cho một ứng dụng tìm thấy
 * - DesktopEntry    : Interface trung gian để parse file .desktop
 *
 * Constants:
 * - APPLICATIONS_PATHS : Danh sách thư mục chứa shortcut ứng dụng trên Linux
 * - ICON_THEME_PATHS   : Danh sách thư mục icon theme chuẩn
 *
 * Channels:
 * - app:list-installed  : Quét và trả về danh sách ứng dụng đã cài đặt trên hệ thống
 *
 * Functions:
 * - setupAppHandlers() : Entry point đăng ký toàn bộ IPC handler nhóm 'app:'
 *
 * Utils:
 * - findIconPath()     : Tra cứu đường dẫn tuyệt đối của icon từ tên hoặc path tương đối
 * - parseDesktopFile() : Phân tích nội dung file .desktop thành object key-value
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Node.js ──
import * as fs from 'fs';
import * as path from 'path';

// ── Electron ─
import { ipcMain, safeStorage, app } from 'electron';

// ── Node.js ─
import * as fs from 'fs';
import * as path from 'path';

// ── Internal 
import { logger } from '../utils/logger';

// ─── Interfaces & Types ─────────────────────────────────────────────────
interface DiscoveredApp {
  name: string;
  exec: string;
  icon?: string;
  description?: string;
  path: string; // Path to the .desktop file
}

interface DesktopEntry {
  Name?: string;
  Exec?: string;
  Icon?: string;
  Comment?: string;
  NoDisplay?: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────
const APPLICATIONS_PATHS = [
  '/usr/share/applications',
  path.join(process.env.HOME || '', '.local/share/applications'),
];

const ICON_THEME_PATHS = [
  '/usr/share/icons/hicolor/48x48/apps',
  '/usr/share/icons/hicolor/128x128/apps',
  '/usr/share/icons/hicolor/256x256/apps',
  '/usr/share/icons/hicolor/scalable/apps',
  '/usr/share/pixmaps',
  path.join(process.env.HOME || '', '.local/share/icons/hicolor/48x48/apps'),
];

// ─── Functions ──────────────────────────────────────────────────────────
export function setupAppHandlers() {
  // ── ĐÃ CHUYỂN sang express-server (/api/v1/runtime) ──
  // 'app:launch' và 'app:terminate' giờ do runtime.controller xử lý.
  // Giữ lại các handler không thuộc runtime target.

  ipcMain.handle('app:list-installed', async (): Promise<DiscoveredApp[]> => {
    const apps: DiscoveredApp[] = [];
    const seenExecs = new Set<string>();

    for (const dir of APPLICATIONS_PATHS) {
      if (!fs.existsSync(dir)) continue;

      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (!file.endsWith('.desktop')) continue;

          const filePath = path.join(dir, file);
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const entry = parseDesktopFile(content);

            // Basic validation
            if (entry && entry.Name && entry.Exec && !entry.NoDisplay) {
              // Clean up Exec command (remove %f, %u etc)
              const cleanExec = entry.Exec.replace(/%[fFuUdDnNijkvm]/g, '').trim();

              // Avoid duplicates based on Exec command (simplified)
              // Just usage first word as key might be too aggressive,
              // but full string might verify arguments.
              // Let's use name + exec signature to dedupe.
              const uniqueKey = `${entry.Name}:${cleanExec}`;

              if (!seenExecs.has(uniqueKey)) {
                seenExecs.add(uniqueKey);
                apps.push({
                  name: entry.Name,
                  exec: cleanExec,
                  icon: findIconPath(entry.Icon),
                  description: entry.Comment,
                  path: filePath,
                });
              }
            }
          } catch (e) {
            logger.warn(`[AppScanner] Failed to read desktop file: ${filePath}`);
          }
        }
      } catch (e) {
        logger.error(`Failed to scan directory ${dir}:`, e);
      }
    }
    // Sort by name
    return apps.sort((a, b) => a.name.localeCompare(b.name));
  });

  /**
   * Handler tạm thời cho 'projectContext'.
   * Ngăn chặn lỗi "No handler registered" khi Renderer invoke kênh này.
   */
  ipcMain.handle('projectContext', async (_event, _args) => {
    return {
      name: '',
      path: '',
      template: '',
      fileCount: 0,
      serviceCount: 0,
    };
  });

  // ── Secure Sudo Password Storage ────────────────────────────────────────
  const SECURE_STORAGE_FILE = path.join(app.getPath('userData'), 'secure-sudo.json');

  /**
   * Save encrypted sudo password to disk.
   * Channel: 'app:set-sudo-password'
   */
  ipcMain.handle('app:set-sudo-password', async (_event, password: string): Promise<boolean> => {
    try {
      if (!password) {
        // Remove file if empty password is provided (clear storage)
        if (fs.existsSync(SECURE_STORAGE_FILE)) {
          fs.unlinkSync(SECURE_STORAGE_FILE);
        }
        return true;
      }

      if (!safeStorage.isEncryptionAvailable()) {
        logger.warn('[SecureStorage] Encryption not available. Storing in plaintext (INSECURE).');
        // Fallback or throw error depending on security policy. 
        // For now, we refuse to store insecurely to prevent accidental leaks.
        throw new Error('System encryption unavailable. Cannot securely store password.');
      }

      const encryptedBuffer = safeStorage.encryptString(password);
      fs.writeFileSync(SECURE_STORAGE_FILE, encryptedBuffer);
      logger.info('[SecureStorage] Sudo password saved successfully.');
      return true;
    } catch (err: any) {
      logger.error('[SecureStorage] Failed to save password:', err.message);
      return false;
    }
  });

  /**
   * Load and decrypt sudo password from disk.
   * Channel: 'app:get-sudo-password'
   */
  ipcMain.handle('app:get-sudo-password', async (): Promise<string | null> => {
    try {
      if (!fs.existsSync(SECURE_STORAGE_FILE)) {
        return null;
      }

      if (!safeStorage.isEncryptionAvailable()) {
        logger.warn('[SecureStorage] Encryption not available. Cannot decrypt stored password.');
        return null;
      }

      const encryptedBuffer = fs.readFileSync(SECURE_STORAGE_FILE);
      const decryptedPassword = safeStorage.decryptString(encryptedBuffer);
      return decryptedPassword;
    } catch (err: any) {
      logger.error('[SecureStorage] Failed to load password:', err.message);
      return null;
    }
  });
}

// ─── Helper Functions ───────────────────────────────────────────────────
function findIconPath(iconName?: string): string | undefined {
  if (!iconName) return undefined;

  // If absolute path
  if (path.isAbsolute(iconName)) {
    return fs.existsSync(iconName) ? iconName : undefined;
  }

  // Look in theme paths
  const extensions = ['.png', '.svg', '.xpm', ''];
  for (const dir of ICON_THEME_PATHS) {
    if (!fs.existsSync(dir)) continue;
    for (const ext of extensions) {
      const iconPath = path.join(dir, `${iconName}${ext}`);
      // Case sensitive check usually, but let's try direct access
      if (fs.existsSync(iconPath)) {
        return iconPath;
      }
    }
  }

  return undefined;
}

function parseDesktopFile(content: string): DesktopEntry | null {
  const lines = content.split('\n');
  const entry: DesktopEntry = {};
  let inDesktopEntry = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '[Desktop Entry]') {
      inDesktopEntry = true;
      continue;
    }

    // Only care about main section (handling others is complex)
    if (trimmed.startsWith('[') && trimmed !== '[Desktop Entry]') {
      inDesktopEntry = false;
    }

    if (!inDesktopEntry) continue;

    if (trimmed.startsWith('Name=')) {
      entry.Name = trimmed.substring(5);
    } else if (trimmed.startsWith('Exec=')) {
      entry.Exec = trimmed.substring(5);
    } else if (trimmed.startsWith('Icon=')) {
      entry.Icon = trimmed.substring(5);
    } else if (trimmed.startsWith('Comment=')) {
      entry.Comment = trimmed.substring(8);
    } else if (trimmed.startsWith('NoDisplay=')) {
      entry.NoDisplay = trimmed.substring(10).toLowerCase() === 'true';
    }
  }

  // Sometimes localized names exist, but we just take the first unlocalized one usually.
  // Real parsers are more complex, but this suffices for "Name="
  return entry;
}
