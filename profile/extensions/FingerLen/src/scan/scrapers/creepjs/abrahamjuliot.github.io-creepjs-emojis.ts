import { clean, q, plain, until, sleep } from '../_helpers';

/**
 * Scraper cho CreepJS Emojis test — https://abrahamjuliot.github.io/creepjs/tests/emojis.html
 * 1812 fields: emoji render hashes (30 unique hashes cho 1809 emojis)
 */
export async function scrapeCreepjsEmojis(timeoutMs: number): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  
  try {
    await until(() => !!q('#fingerprint-data .hash'), timeoutMs, 400);
    await sleep(800);

    const root = q('#fingerprint-data');
    const mainHash = clean(q('#fingerprint-data > .visitor-info .hash')?.textContent);
    if (mainHash) out.emojisHash = mainHash;

    const rawText = plain(root);
    if (rawText) out.emojisRaw = rawText;
  } catch (e: any) {
    out.__error = String(e && e.message ? e.message : e);
  }
  
  return out;
}