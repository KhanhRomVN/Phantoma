import { clean, q, plain, until, sleep } from '../_helpers';

/**
 * Scraper cho CreepJS Math test — https://abrahamjuliot.github.io/creepjs/tests/math.html
 * 49 fields: JS Runtime detection (Chromium/Firefox/Tor/Safari), Math function results
 */
export async function scrapeCreepjsMath(timeoutMs: number): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  
  try {
    await until(() => !!q('#fingerprint-data .hash'), timeoutMs, 400);
    await sleep(800);

    const root = q('#fingerprint-data');
    const mainHash = clean(q('#fingerprint-data > .visitor-info .hash')?.textContent);
    if (mainHash) out.mathHash = mainHash;

    const rawText = plain(root);
    if (rawText) out.mathRaw = rawText;
  } catch (e: any) {
    out.__error = String(e && e.message ? e.message : e);
  }
  
  return out;
}