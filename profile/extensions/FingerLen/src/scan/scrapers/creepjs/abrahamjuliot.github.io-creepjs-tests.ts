import { clean, q, plain, until, sleep } from '../_helpers';

/**
 * Scraper cho các trang test riêng lẻ của CreepJS (workers, iframes, fonts, etc.)
 * Chạy TRONG tab của website, phải tự chứa (serialize-safe).
 */
export async function scrapeCreepjsTest(pageId: string, timeoutMs: number): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  
  try {
    await until(() => !!q('#fingerprint-data .hash'), timeoutMs, 400);
    await sleep(800);

    const root = q('#fingerprint-data');
    const testName = pageId.replace('creepjs-', '');
    
    // Lấy hash chính từ <strong>TestName</strong><span class="hash">...</span>
    const mainHash = clean(q('#fingerprint-data > .visitor-info .hash')?.textContent);
    if (mainHash) out[testName + 'Hash'] = mainHash;

    // Lấy tất cả hash con (ví dụ: workers có Window/Dedicated/Shared/Service hash)
    const subHashes: Record<string, string> = {};
    for (const strong of Array.from(root?.querySelectorAll('strong') || [])) {
      const title = clean(strong.textContent);
      const hashEl = strong.nextElementSibling;
      if (hashEl && hashEl.classList.contains('hash')) {
        const hashVal = clean(hashEl.textContent);
        if (hashVal) subHashes[title] = hashVal;
      }
    }
    if (Object.keys(subHashes).length) out[testName + 'SubHashes'] = subHashes;

    // Lấy toàn bộ text content làm raw data
    const rawText = plain(root);
    if (rawText) out[testName + 'Raw'] = rawText;
  } catch (e: any) {
    out.__error = String(e && e.message ? e.message : e);
  }
  
  return out;
}