import { clean, q, plain, until, sleep } from '../_helpers';

/**
 * Scraper cho CreepJS Prototype test — https://abrahamjuliot.github.io/creepjs/tests/prototype.html
 * 3 fields: properties searched count, lies detected count, pass/fail status
 */
export async function scrapeCreepjsPrototype(timeoutMs: number): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  
  try {
    await until(() => !!q('#fingerprint-data .hash'), timeoutMs, 400);
    await sleep(800);

    const root = q('#fingerprint-data');
    const mainHash = clean(q('#fingerprint-data > .visitor-info .hash')?.textContent);
    if (mainHash) out.prototypeHash = mainHash;

    const rawText = plain(root);
    if (rawText) out.prototypeRaw = rawText;
  } catch (e: any) {
    out.__error = String(e && e.message ? e.message : e);
  }
  
  return out;
}