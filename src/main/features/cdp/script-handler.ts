/**
 * ------------------------------------------------------------------
 * Trình xử lý script CDP
 * ------------------------------------------------------------------
 * Xử lý sự kiện Debugger.scriptParsed từ CDP. Ánh xạ ID script
 * sang URL và lấy nguồn script đã giải nén cho renderer.
 *
 * Hàm chính:
 * - handleScriptParsed() : Lưu ánh xạ script và gửi nguồn
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Internal ──
import { CdpManager } from './cdp-manager';
import { logger } from '../../utils/logger';

// ─── Functions ──────────────────────────────────────────────────────────
export async function handleScriptParsed(this: CdpManager, params: any) {
  const { scriptId, url, embedderName, hasSourceURL, sourceMapURL } = params;

  if (!url || url.startsWith('extensions::') || url.startsWith('chrome-extension://')) {
    return; // Skip extension scripts
  }

  // Store scriptId mapping for URL
  if (url) {
    this.scriptIdMap.set(url, scriptId);
  }

  // Immediately fetch the unpacked source from Debugger
  try {
    const result = await this.send('Debugger.getScriptSource', { scriptId });
    if (result && result.scriptSource) {
      const source = result.scriptSource;

      // Send unpacked source to renderer
      this.sendToRenderer('cdp:script-source', {
        scriptId,
        url,
        source,
        size: source.length,
        timestamp: Date.now(),
        hasSourceURL,
        sourceMapURL,
      });
    }
  } catch (e: any) {
    logger.warn(`[CDP] Failed to get script source for ${scriptId}:`, e.message);
  }
}