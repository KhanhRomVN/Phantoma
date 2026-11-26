import { clean, q, plain, until, sleep } from '../_helpers';

/**
 * Scraper cho CreepJS Proxy test — https://abrahamjuliot.github.io/creepjs/tests/proxy.html
 * 25 fields: Function.toString proxy detection, error signatures, lag percentage
 */
export async function scrapeCreepjsProxy(timeoutMs: number): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  
  try {
    await until(() => !!q('#fingerprint-data .hash'), timeoutMs, 400);
    await sleep(800);

    const root = q('#fingerprint-data');
    const mainHash = clean(q('#fingerprint-data > .visitor-info .hash')?.textContent);
    if (mainHash) out.proxyHash = mainHash;

    const rawText = plain(root);
    if (rawText) out.proxyRaw = rawText;
  } catch (e: any) {
    out.__error = String(e && e.message ? e.message : e);
  }
  
  return out;
}