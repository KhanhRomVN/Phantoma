import { clean, q, plain, until, sleep } from '../_helpers';

/**
 * Scraper cho CreepJS Window test — https://abrahamjuliot.github.io/creepjs/tests/window.html
 * 391 fields: reported user agent, version hash table (388 hashes mapped to OS/browser versions),
 * API detection lists (Chrome 101-115 features)
 */
export async function scrapeCreepjsWindow(timeoutMs: number): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  
  try {
    await until(() => !!q('#fingerprint-data .hash'), timeoutMs, 400);
    await sleep(800);

    const root = q('#fingerprint-data');
    const mainHash = clean(q('#fingerprint-data > .visitor-info .hash')?.textContent);
    if (mainHash) out.windowHash = mainHash;

    const rawText = plain(root);
    if (rawText) out.windowRaw = rawText;
  } catch (e: any) {
    out.__error = String(e && e.message ? e.message : e);
  }
  
  return out;
}