import { clean, q, plain, until, sleep } from '../_helpers';

/**
 * Scraper cho CreepJS Machine test — https://abrahamjuliot.github.io/creepjs/tests/machine.html
 * 12 fields: UA identifiers, core, system, device, platform, speechSynthesis, maxTouchPoints,
 * any-pointer, deviceMemory, hardwareConcurrency, GPU
 */
export async function scrapeCreepjsMachine(timeoutMs: number): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  
  try {
    await until(() => !!q('#fingerprint-data .hash'), timeoutMs, 400);
    await sleep(800);

    const root = q('#fingerprint-data');
    const mainHash = clean(q('#fingerprint-data > .visitor-info .hash')?.textContent);
    if (mainHash) out.machineHash = mainHash;

    const rawText = plain(root);
    if (rawText) out.machineRaw = rawText;
  } catch (e: any) {
    out.__error = String(e && e.message ? e.message : e);
  }
  
  return out;
}