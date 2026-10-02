/**
 * ------------------------------------------------------------------
 * IPC handler ứng dụng
 * ------------------------------------------------------------------
 * Đăng ký IPC handler cho các thao tác cấp ứng dụng: kết thúc,
 * quét ứng dụng PC, sử dụng bộ nhớ và khởi chạy ứng dụng.
 *
 * Hàm chính:
 * - setupAppHandlers() : Đăng ký IPC handler app: với ipcMain
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Electron ──
import { ipcMain } from 'electron';

// ── Internal ──
import { scanInstalledApps } from '../utils/app-scanner';

// ─── Functions ──────────────────────────────────────────────────────────
export function setupAppHandlers() {
  // ── ĐÃ CHUYỂN sang express-server (/api/v1/runtime) ──
  // 'app:launch' và 'app:terminate' giờ do runtime.controller xử lý.
  // Giữ lại các handler không thuộc runtime target.

  ipcMain.handle('apps:scan-pc', async () => {
    const apps = await scanInstalledApps();
    return apps;
  });

  ipcMain.handle('app:get-memory-usage', () => {
    return process.memoryUsage();
  });
}
