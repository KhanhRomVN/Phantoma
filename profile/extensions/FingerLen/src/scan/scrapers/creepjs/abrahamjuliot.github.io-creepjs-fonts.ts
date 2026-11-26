import { clean, q, plain, until, sleep } from '../_helpers';

/**
 * Scraper cho CreepJS Fonts test — https://abrahamjuliot.github.io/creepjs/tests/fonts.html
 * 39 fields: check status, combined/ascent/descent/width hashes, font load list, text metrics
 */
export async function scrapeCreepjsFonts(timeoutMs: number): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  
  try {
    await until(() => !!q('#fingerprint-data .hash'), timeoutMs, 400);
    await sleep(800);

    const root = q('#fingerprint-data');
    const mainHash = clean(q('#fingerprint-data > .visitor-info .hash')?.textContent);
    if (mainHash) out.fontsHash = mainHash;

    const rawText = plain(root);
    if (rawText) out.fontsRaw = rawText;
  } catch (e: any) {
    out.__error = String(e && e.message ? e.message : e);
  }
  
  return out;
}