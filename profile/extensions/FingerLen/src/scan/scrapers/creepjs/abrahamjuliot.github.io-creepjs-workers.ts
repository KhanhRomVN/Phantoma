import { clean, q, plain, until, sleep } from '../_helpers';

/**
 * Scraper cho CreepJS Workers test — https://abrahamjuliot.github.io/creepjs/tests/workers.html
 * 76 fields: comparison across 4 worker types (Window, Dedicated, Shared, Service) —
 * UA, data, platform, fonts, canvas, GPU, hardware, network, timezone, langs, code, timing, global, stack, bugs
 */
export async function scrapeCreepjsWorkers(timeoutMs: number): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  
  try {
    await until(() => !!q('#fingerprint-data .hash'), timeoutMs, 400);
    await sleep(800);

    const root = q('#fingerprint-data');
    const mainHash = clean(q('#fingerprint-data > .visitor-info .hash')?.textContent);
    if (mainHash) out.workersHash = mainHash;

    const rawText = plain(root);
    if (rawText) out.workersRaw = rawText;
  } catch (e: any) {
    out.__error = String(e && e.message ? e.message : e);
  }
  
  return out;
}