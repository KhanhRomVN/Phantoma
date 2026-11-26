import { clean, q, until, sleep } from '../_helpers';

/**
 * Scraper cho glassbox.codecanary.org
 * Chạy TRONG tab của website, phải tự chứa (serialize-safe).
 */
export async function scrapeGlassbox(timeoutMs: number): Promise<Record<string, any>> {
  const out: Record<string, any> = { site: '', header: {}, identity: {}, panels: {} };
  
  const txt = (el: Element | null | undefined): string => {
    if (!el) return '';
    return clean(el.textContent);
  };
  
  const BAD = new Set(['', '—', '-', 'undefined', 'null', 'n/a', 'N/A', 'NaN']);
  const hasVal = (v: any): boolean => {
    return v !== undefined && v !== null && !BAD.has(String(v).trim());
  };
  
  try {
    // Chờ panels load xong (cDone >= cTotal)
    await until(() => {
      const done = Number(q('#cDone')?.textContent || 0);
      const total = Number(q('#cTotal')?.textContent || 0);
      return total > 0 && done >= total;
    }, timeoutMs, 500);
    
    await sleep(1000); // chờ thêm để đảm bảo tất cả panels render xong
    
    out.site = location.href;
    
    // 1. Header
    out.header.browser = txt(q('#browserBadge'));
    
    // 2. Identity section
    out.identity = {
      ip: txt(q('#ipHeroIP')),
      location: txt(q('#ipHeroLoc')),
      network: txt(q('#ipHeroNet')),
      vpn: txt(q('#ipHeroVpn')),
      identifiability: txt(q('#uniqPct')),
      identifiabilityLine: txt(q('#uniqLine')),
      band: txt(q('#uniqBand')),
      caveat: txt(q('#uniqCaveat')),
      entropy: txt(q('#entNum')),
      hwHash: txt(q('#hwHash')),
      engineHash: txt(q('#engineHash')),
      buildHash: txt(q('#buildHash')),
      sessionHash: txt(q('#sessHash'))
    };
    
    // Xóa các field empty
    for (const [k, v] of Object.entries(out.identity)) {
      if (!hasVal(v)) delete out.identity[k];
    }
    
    // 3. Panels
    const panels = document.querySelectorAll('#grid .panel');
    for (const panel of Array.from(panels)) {
      const title = txt(panel.querySelector('.p-title'));
      const num = txt(panel.querySelector('.p-num'));
      const signal = txt(panel.querySelector('.sig'));
      const note = txt(panel.querySelector('.note'));
      
      // Rows
      const rows: Record<string, string> = {};
      const rowEls = panel.querySelectorAll('.p-body .row');
      for (const row of Array.from(rowEls)) {
        const k = txt(row.querySelector('.k'));
        const v = txt(row.querySelector('.v'));
        if (k && hasVal(v)) rows[k] = v;
      }
      
      // Chips
      const chips: string[] = [];
      const chipEls = panel.querySelectorAll('.chip');
      for (const c of Array.from(chipEls)) {
        const val = txt(c);
        if (hasVal(val)) chips.push(val);
      }
      
      // Request previews
      const requests: string[] = [];
      const reqEls = panel.querySelectorAll('pre.req');
      for (const p of Array.from(reqEls)) {
        const val = (p.textContent || '').trim();
        if (hasVal(val)) requests.push(val);
      }
      
      // Thumbnail
      const thumbEl = panel.querySelector('img.thumb') as HTMLImageElement | null;
      const thumb = thumbEl?.src || null;
      
      // Build panel object
      const key = title || num || `panel-${Object.keys(out.panels).length + 1}`;
      const item: Record<string, any> = { num, signal, rows };
      if (note) item.note = note;
      if (chips.length) item.chips = chips;
      if (requests.length) item.requests = requests;
      if (thumb) item.thumb = thumb;
      
      out.panels[key] = item;
    }
  } catch (e: any) {
    out.__error = String(e && e.message ? e.message : e);
  }
  
  return out;
}