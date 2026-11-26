import { clean, q, plain, until, sleep } from '../_helpers';

/**
 * Scraper cho CreepJS Iframes test — https://abrahamjuliot.github.io/creepjs/tests/iframes.html
 * 1 field: iframe context comparison (window, contentWindow, nested, etc.)
 */
export async function scrapeCreepjsIframes(timeoutMs: number): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  
  try {
    await until(() => !!q('#fingerprint-data .hash'), timeoutMs, 400);
    await sleep(800);

    const root = q('#fingerprint-data');
    const mainHash = clean(q('#fingerprint-data > .visitor-info .hash')?.textContent);
    if (mainHash) out.iframesHash = mainHash;

    const rawText = plain(root);
    if (rawText) out.iframesRaw = rawText;
  } catch (e: any) {
    out.__error = String(e && e.message ? e.message : e);
  }
  
  return out;
}