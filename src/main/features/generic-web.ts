/**
 * ------------------------------------------------------------------
 * Cửa sổ web generic
 * ------------------------------------------------------------------
 * Tạo và quản lý các phiên bản BrowserWindow cho duyệt web
 * qua proxy. Hỗ trợ session theo từng cửa sổ, user agent tùy chỉnh,
 * cấu hình proxy và tùy chọn bypass Cloudflare.
 *
 * Hàm chính:
 * - closeAllGenericWebWindows(): Đóng tất cả các cửa sổ generic đang hoạt động
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Electron ──
import { BrowserWindow } from 'electron';

// ─── Constants ──────────────────────────────────────────────────────────
// Keep track of windows by ID or Partition to prevent duplicates if needed
// For now, simpler to just store active windows in a map if we want named singleton behavior
const activeWindows: Map<string, BrowserWindow> = new Map();

// ─── Functions ──────────────────────────────────────────────────────────
export function closeAllGenericWebWindows() {
  for (const [, window] of activeWindows.entries()) {
    if (!window.isDestroyed()) {
      window.close();
    }
  }
  activeWindows.clear();
}
