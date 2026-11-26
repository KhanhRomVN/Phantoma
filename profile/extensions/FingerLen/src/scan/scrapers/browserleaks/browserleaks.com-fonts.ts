import { clean, q, txt, until, set, sleep } from '../_helpers';

/**
 * Scraper cho BrowserLeaks /fonts — https://browserleaks.com/fonts
 * 3 main fields: Font Metrics fingerprint, report summary, Unicode Glyphs fingerprint
 * Plus detailed font list and glyph measurements
 */
export async function scrapeBlFonts(timeoutMs: number): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  
  try {
    await until(() => /[0-9a-f]{16,}/i.test(txt('#fonts-metrics-hash')), timeoutMs, 1000); // check mỗi 1s thay vì 250ms
    await sleep(1000); // chờ thêm để đảm bảo tất cả fonts được render
    
    // Font Metrics
    set(out, 'fontsMetricsFingerprint', txt('#fonts-metrics-hash'));
    set(out, 'fontsMetricsReport', txt('#fonts-metrics-report'));
    
    // Font list với metrics (extract từ bảng hoặc pre)
    const fontListEl = q('#font-list');
    if (fontListEl) {
      const fontLines = clean(fontListEl.textContent).split('\n').filter(Boolean);
      out.fontList = fontLines;
    }
    
    // Unicode Glyphs
    set(out, 'glyphsFingerprint', txt('#fonts-glyphs-hash'));
    
    // Glyph measurements (extract từ bảng)
    const glyphTableEl = q('#glyph-table');
    if (glyphTableEl) {
      const glyphLines = clean(glyphTableEl.textContent).split('\n').filter(Boolean);
      out.glyphMeasurements = glyphLines;
    }
  } catch (e: any) {
    out.__error = String(e && e.message ? e.message : e);
  }
  
  return out;
}