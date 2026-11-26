import { clean, q, plain, until, sleep } from '../_helpers';

/**
 * Scraper cho CreepJS Timezone test — https://abrahamjuliot.github.io/creepjs/tests/timezone.html
 * 16 fields: system health, date, time, zone, reported/computed offset, reported/computed location,
 * reduced timer precision, delays, precision level, microseconds, repeat value, epoch time, UTC ISO time
 */
export async function scrapeCreepjsTimezone(timeoutMs: number): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  
  try {
    await until(() => !!q('#fingerprint-data .hash'), timeoutMs, 400);
    await sleep(800);

    const root = q('#fingerprint-data');
    const mainHash = clean(q('#fingerprint-data > .visitor-info .hash')?.textContent);
    if (mainHash) out.timezoneHash = mainHash;

    const rawText = plain(root);
    if (rawText) out.timezoneRaw = rawText;
  } catch (e: any) {
    out.__error = String(e && e.message ? e.message : e);
  }
  
  return out;
}