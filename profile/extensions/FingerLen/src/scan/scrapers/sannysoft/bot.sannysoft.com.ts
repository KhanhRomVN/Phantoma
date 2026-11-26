import { clean, q, until, sleep } from '../_helpers';

/**
 * Scraper cho bot.sannysoft.com — Antibot.html
 * Chạy TRONG tab của website, phải tự chứa (serialize-safe).
 */
export async function scrapeSannysoftAntibot(timeoutMs: number): Promise<Record<string, any>> {
  const out: Record<string, any> = { site: '', antibot: {}, fpScanner: {}, details: {}, canvas: {}, fpCollect: null };
  
  const txt = (el: Element | null | undefined): string => {
    if (!el) return '';
    return clean(el.textContent);
  };
  
  const BAD = new Set(['', '—', '-', 'undefined', 'null', 'n/a', 'N/A', 'NaN']);
  const hasVal = (v: any): boolean => {
    return v !== undefined && v !== null && !BAD.has(String(v).trim());
  };
  
  try {
    // Chờ bảng antibot chính load
    await until(() => !!q('#user-agent-result'), timeoutMs);
    await sleep(2000); // chờ tất cả test chạy xong
    
    out.site = location.href;
    
    // 1. Bảng Antibot chính
    const antibotIds: Record<string, string> = {
      'User Agent': 'user-agent-result',
      'WebDriver': 'webdriver-result',
      'WebDriver Advanced': 'advanced-webdriver-result',
      'Chrome': 'chrome-result',
      'Permissions': 'permissions-result',
      'Plugins Length': 'plugins-length-result',
      'Plugins is of type PluginArray': 'plugins-type-result',
      'Languages': 'languages-result',
      'WebGL Vendor': 'webgl-vendor',
      'WebGL Renderer': 'webgl-renderer',
      'Broken Image Dimensions': 'broken-image-dimensions'
    };
    
    for (const [name, id] of Object.entries(antibotIds)) {
      const el = document.getElementById(id);
      const v = txt(el);
      if (hasVal(v)) out.antibot[name] = v;
    }
    
    // 2. Bảng Fingerprint Scanner #fp2
    const fp2Rows = document.querySelectorAll('#fp2 tr');
    for (const tr of Array.from(fp2Rows)) {
      const tds = tr.querySelectorAll('td');
      if (tds.length < 2) continue;
      const name = txt(tds[0]);
      if (!name) continue;
      const status = txt(tds[1]);
      const pre = tr.querySelector('pre');
      let data: any = null;
      if (pre) {
        try {
          data = JSON.parse(pre.textContent || '');
        } catch {
          data = (pre.textContent || '').trim();
        }
      }
      if (hasVal(status) || data) {
        out.fpScanner[name] = { status, data };
      }
    }
    
    // 3. Bảng "Some details"
    const tables = Array.from(document.querySelectorAll('table'));
    const detailsTable = tables.find(t => {
      const prev = t.previousElementSibling;
      return prev && (prev.textContent || '').includes('Some details');
    }) || tables[2];
    
    if (detailsTable) {
      const rows = detailsTable.querySelectorAll('tr');
      for (const tr of Array.from(rows)) {
        const cells = tr.querySelectorAll('td');
        if (cells.length < 2) continue;
        const k = txt(cells[0]);
        const v = txt(cells[1]);
        if (!k || !hasVal(v)) continue;
        let key = k;
        let n = 2;
        while (out.details[key] !== undefined) {
          key = `${k} #${n++}`;
        }
        out.details[key] = v;
      }
    }
    
    // 4. Canvas hash
    for (let i = 1; i <= 5; i++) {
      const el = document.getElementById('canvas' + i);
      const v = txt(el);
      if (hasVal(v)) out.canvas['canvas' + i] = v;
    }
    
    // 5. Fp-collect JSON
    const fp = document.getElementById('fp');
    if (fp) {
      try {
        out.fpCollect = JSON.parse(fp.textContent || '');
      } catch {
        const content = (fp.textContent || '').trim();
        if (hasVal(content)) out.fpCollect = content;
      }
    }
  } catch (e: any) {
    out.__error = String(e && e.message ? e.message : e);
  }
  
  return out;
}