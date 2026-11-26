import { clean, q, plain, until, sleep } from '../_helpers';

/**
 * Scraper cho CreepJS Extensions test — https://abrahamjuliot.github.io/creepjs/tests/extensions.html
 * 1 field: Chrome extensions detection count (0 of 35 detected)
 */
export async function scrapeCreepjsExtensions(timeoutMs: number): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  
  try {
    await until(() => !!q('#fingerprint-data .hash'), timeoutMs, 400);
    await sleep(800);

    const root = q('#fingerprint-data');
    const mainHash = clean(q('#fingerprint-data > .visitor-info .hash')?.textContent);
    if (mainHash) out.extensionsHash = mainHash;

    const rawText = plain(root);
    if (rawText) out.extensionsRaw = rawText;
  } catch (e: any) {
    out.__error = String(e && e.message ? e.message : e);
  }
  
  return out;
}