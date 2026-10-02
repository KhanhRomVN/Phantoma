/**
 * ------------------------------------------------------------------
 * IPC handler proxy
 * ------------------------------------------------------------------
 * IPC handler cho quản lý phiên proxy. Đăng ký các thao tác
 * proxy: cho tạo phiên, chặn bắt, breakpoint
 * và fetch nội bộ sử dụng module net của Electron.
 *
 * Hàm chính:
 * - setupProxyHandlers() : Đăng ký IPC handler proxy: và phantoma:
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Electron ──
import { ipcMain, net } from 'electron';

// ── Internal ──
import { logger } from '../utils/logger';

// ─── Functions ──────────────────────────────────────────────────────────
export function setupProxyHandlers() {
  // Phantoma internal fetch — bypass proxy, dùng electron net module
  ipcMain.handle('phantoma:fetch', async (_, url: string, method: string, body?: string) => {
    try {
      const response = await net.fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ?? undefined,
        bypassCustomProtocolHandlers: true,
      });
      const text = await response.text();
      return { ok: response.ok, status: response.status, body: text };
    } catch (e: any) {
      logger.error('[Proxy] phantoma:fetch failed:', e);
      return { ok: false, status: 0, body: '', error: e?.message ?? String(e) };
    }
  });

  // ── ĐÃ CHUYỂN sang express-server (/api/v1/runtime/proxy/*) ──
  // proxy:create-session, proxy:set-intercept, proxy:set-breakpoint-rules,
  // proxy:resolve-breakpoint, proxy:forward-request, proxy:drop-request,
  // proxy:stop, proxy:stop-session giờ do runtime.controller xử lý.
  // Chỉ giữ phantoma:fetch (dùng nội bộ, không thuộc runtime target).
}