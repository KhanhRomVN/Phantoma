/**
 * ------------------------------------------------------------------
 * IPC handler CDP
 * ------------------------------------------------------------------
 * Đăng ký IPC handler cho các thao tác Chrome DevTools Protocol:
 * kết nối/ngắt kết nối, điều hướng, overlay giám sát, yêu cầu
 * inspector và tải WASM.
 *
 * Hàm chính:
 * - setupCDPHandlers() : Đăng ký IPC handler cdp: và inspector:
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Electron ──
import { ipcMain } from 'electron';

// ── Node.js ──
import * as zlib from 'zlib';

// ── Internal ──
import { logger } from '../utils/logger';

// ─── Functions ──────────────────────────────────────────────────────────
export function setupCDPHandlers() {
  // ── ĐÃ CHUYỂN sang express-server (/api/v1/runtime/cdp/* + /inspector/send-request) ──
  // cdp:connect/disconnect/status/get-state/navigate/reload/inject-border/
  // remove-border và inspector:send-request giờ do runtime.controller xử lý.
  // Giữ inspector:fetch-wasm (không thuộc runtime target).

  ipcMain.handle('inspector:fetch-wasm', async (_, url: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
      const arrayBuffer = await response.arrayBuffer();
      let buffer = Buffer.from(arrayBuffer);

      // Check for GZIP magic bytes (0x1f, 0x8b)
      if (buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
        try {
          buffer = zlib.gunzipSync(buffer);
        } catch (decompressionError) {
          logger.error('[WASM Fetch] Decompression failed:', decompressionError);
          // Continue with original buffer if decompression fails
        }
      }

      // Return as Uint8Array (serializable)
      return new Uint8Array(buffer);
    } catch (error: any) {
      logger.error('Failed to fetch WASM:', error);
      throw new Error(error.message);
    }
  });
}