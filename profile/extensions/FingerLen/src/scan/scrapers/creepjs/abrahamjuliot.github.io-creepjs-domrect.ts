import { clean, q, plain, until, sleep } from '../_helpers';

/**
 * Scraper cho CreepJS DOMRect test — https://abrahamjuliot.github.io/creepjs/tests/domrect.html
 * 20 fields: score, rect hash, lie pattern, x/y/top/left/right/bottom/width/height coordinates,
 * valid dimensions check, matrix coordinates, unshift validation
 */
export async function scrapeCreepjsDomrect(timeoutMs: number): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  
  try {
    await until(() => !!q('#fingerprint-data .hash'), timeoutMs, 400);
    await sleep(800);

    const root = q('#fingerprint-data');
    
    // Main hash
    const mainHash = clean(q('#fingerprint-data > .visitor-info .hash')?.textContent);
    if (mainHash) out.domrectHash = mainHash;

    // Extract all fields from plain text
    const rawText = plain(root);
    if (rawText) out.domrectRaw = rawText;
    
    // Parse score, rect, lie pattern từ text
    const lines = rawText.split('\n').map(s => clean(s)).filter(Boolean);
    for (const line of lines) {
      if (line.includes('score')) out.score = line;
      if (line.includes('rect')) out.rect = line;
      if (line.includes('lie pattern')) out.liePattern = line;
    }
  } catch (e: any) {
    out.__error = String(e && e.message ? e.message : e);
  }
  
  return out;
}