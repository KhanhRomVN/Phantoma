import { clean, q, txt, until, set, bool } from '../_helpers';

/**
 * Scraper cho BrowserLeaks /canvas — https://browserleaks.com/canvas
 * 37 fields: Canvas support, fingerprint signature, uniqueness, image file details, likely detection, signature stats
 */
export async function scrapeBlCanvas(timeoutMs: number): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  
  try {
    await until(() => /[0-9a-f]{16,}/i.test(txt('#canvas-hash')), timeoutMs);
    
    // Canvas Support Detection
    set(out, 'canvas2dApi', bool(txt('#canvas-2d-api')));
    set(out, 'textApiForCanvas', bool(txt('#text-api')));
    set(out, 'canvasToDataUrl', bool(txt('#canvas-toDataURL')));
    
    // Canvas Fingerprint
    set(out, 'canvasSignature', txt('#canvas-hash'));
    set(out, 'canvasUniqueness', txt('#canvas-ratio'));
    
    // Image File Details
    set(out, 'imageFileSize', txt('#image-file-size'));
    set(out, 'imageNumColors', txt('#image-num-colors'));
    const chunks = Array.from(document.querySelectorAll('#image-chunks .chunk'));
    for (let i = 0; i < chunks.length; i++) {
      set(out, `imageChunk${i + 1}`, clean(chunks[i].textContent));
    }
    
    // Likely detection
    set(out, 'likelyBrowser', txt('#likely-browser'));
    set(out, 'likelyOs', txt('#likely-os'));
    
    // Signature Stats
    const statsRows = document.querySelectorAll('#signature-stats tr');
    const stats: Record<string, string> = {};
    for (const row of Array.from(statsRows)) {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const key = clean(cells[0].textContent);
        const val = clean(cells[1].textContent);
        if (key && val) stats[key] = val;
      }
    }
    if (Object.keys(stats).length) out.signatureStats = stats;
  } catch (e: any) {
    out.__error = String(e && e.message ? e.message : e);
  }
  
  return out;
}