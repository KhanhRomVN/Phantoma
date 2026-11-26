/**
 * Dispatcher function: gọi đúng scraper tương ứng với pageId.
 * Hàm này được chrome.scripting.executeScript SERIALIZE rồi chạy TRONG tab của website.
 * => Phải TỰ CHỨA: không import, không dùng biến/hàm ngoài hàm.
 *
 * NOTE: Do serialize constraint, các scraper riêng lẻ trong folder scrapers/ KHÔNG thể
 * được import trực tiếp. Thay vào đó, code của chúng được inline vào đây.
 */
export async function scrapePage(pageId: string, timeoutMs: number): Promise<Record<string, any>> {
  const clean = (s?: string | null): string => (s || '').replace(/\s+/g, ' ').trim();
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  const q = (sel: string): Element | null => document.querySelector(sel);
  /** Text hiển thị của phần tử, đã bỏ <style>/<script>/<svg> (CreepJS nhúng CSS ngay trong từng khối). */
  const plain = (el: Element | null | undefined): string => {
    if (!el) return '';
    const c = el.cloneNode(true) as Element;
    c.querySelectorAll('style, script, svg, noscript').forEach((n) => n.remove());
    return clean(c.textContent);
  };
  const txt = (sel: string | Element | null): string => {
    if (typeof sel === 'string') return clean(q(sel)?.textContent);
    return clean(sel?.textContent);
  };
  const until = async (fn: () => boolean, ms: number, step = 250): Promise<boolean> => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      try { if (fn()) return true; } catch { /* DOM chưa sẵn sàng */ }
      await sleep(step);
    }
    return false;
  };
  const num = (s: string): number | undefined => {
    const m = (s || '').replace(/,/g, '').match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : undefined;
  };
  const bool = (s: string): boolean | undefined => {
    const v = clean(s);
    if (!v) return undefined;
    if (/^(✔|true|yes|enabled|supported)/i.test(v) || /✔/.test(v)) return true;
    if (/^(✖|false|no\b|disabled|unsupported|not supported)/i.test(v) || /✖/.test(v)) return false;
    return undefined;
  };
  const set = (o: Record<string, any>, k: string, v: any) => {
    if (v === undefined || v === null || v === '' || (typeof v === 'number' && Number.isNaN(v))) return;
    o[k] = v;
  };
  /** Ô <td> kế bên td có nhãn khớp (bảng của BrowserLeaks). */
  const rowVal = (label: string): string => {
    for (const td of Array.from(document.querySelectorAll('td'))) {
      if (clean(td.textContent) === label) return clean(td.nextElementSibling?.textContent);
    }
    return '';
  };

  const out: Record<string, any> = {};

  try {
    /* ─────────────────────────── BrowserLeaks: /ip ─────────────────────────── */
    if (pageId === 'bl-ip') {
      await until(() => !!q('#client-ipv4') && !!rowVal('Country'), timeoutMs);
      const ipEl = q('#client-ipv4') as HTMLElement | null;
      set(out, 'ip', ipEl?.dataset.ip || txt('#client-ipv4 .flag-text'));
      set(out, 'countryCode', ipEl?.dataset.iso_code);
      set(out, 'country', clean(q('#lookup-flag .flag-text')?.firstChild?.textContent));
      set(out, 'region', rowVal('State/Region'));
      set(out, 'city', rowVal('City'));
      set(out, 'isp', rowVal('ISP'));
      set(out, 'org', rowVal('Organization'));
      set(out, 'asn', clean(q('a[href*="bgp.tools/as/"]')?.textContent));
      set(out, 'usageType', rowVal('Usage Type'));
      set(out, 'ipTimezone', rowVal('Timezone').split(' ')[0]);
      const coords = q('#coords-data') as HTMLElement | null;
      set(out, 'lat', num(coords?.dataset.lat || ''));
      set(out, 'lon', num(coords?.dataset.lon || ''));
      const v6 = txt('#client-ipv6');
      if (/[0-9a-f:]{6,}/i.test(v6)) out.ipv6 = v6;
    }

    /* ───────────────────────── BrowserLeaks: /javascript ───────────────────── */
    else if (pageId === 'bl-javascript') {
      await until(() => !!txt('#js-userAgent') && !!txt('#js-timeZone') && !!txt('#js-width'), timeoutMs);
      const g = (id: string) => txt('#js-' + id);
      set(out, 'userAgent', g('userAgent'));
      set(out, 'platform', g('platform'));
      set(out, 'vendor', g('vendor'));
      set(out, 'language', g('language'));
      const langs = g('languages');
      if (langs) out.languages = langs.split(/[,\s]+/).filter(Boolean);
      set(out, 'hardwareConcurrency', num(g('hardwareConcurrency')));
      set(out, 'deviceMemory', num(g('deviceMemory')));
      set(out, 'maxTouchPoints', num(g('maxTouchPoints')));
      set(out, 'doNotTrack', g('doNotTrack'));
      set(out, 'cookieEnabled', bool(g('cookieEnabled')));
      set(out, 'pdfViewerEnabled', bool(g('pdfViewerEnabled')));
      set(out, 'webdriver', bool(g('webdriver')));
      const plugins = g('plugins'), mimes = g('mimeTypes');
      set(out, 'pluginsCount', /^\d+$/.test(plugins) ? +plugins : (q('#js-plugins') ? q('#js-plugins')!.querySelectorAll('li, br').length || undefined : undefined));
      set(out, 'mimeTypesCount', /^\d+$/.test(mimes) ? +mimes : (q('#js-mimeTypes') ? q('#js-mimeTypes')!.querySelectorAll('li, br').length || undefined : undefined));
      // screen
      for (const k of ['width', 'height', 'availWidth', 'availHeight', 'colorDepth', 'pixelDepth', 'innerWidth', 'innerHeight', 'outerWidth', 'outerHeight']) {
        set(out, 'screen_' + k, num(g(k)));
      }
      set(out, 'screen_devicePixelRatio', num(g('devicePixelRatio')));
      set(out, 'screen_orientation', g('orientation-type'));
      // intl / date
      set(out, 'timeZone', g('timeZone'));
      set(out, 'locale', g('locale'));
      set(out, 'hourCycle', g('hourCycle'));
      set(out, 'dateTimeFormat', g('DateTimeFormat'));
      set(out, 'systemTime', g('date'));
      // battery + speech
      set(out, 'batteryLevel', (() => { const n = num(g('level')); return n === undefined ? undefined : (/%/.test(g('level')) ? n / 100 : n); })());
      set(out, 'batteryCharging', bool(g('charging')));
      set(out, 'speechVoicesCount', num(g('voices')));
      set(out, 'bluetoothAvailable', bool(g('isBluetoothAvailable')));
    }

    /* ─────────────────────────── BrowserLeaks: /webrtc ─────────────────────── */
    else if (pageId === 'bl-webrtc') {
      await until(() => !!txt('#rtc-leak') || !!txt('#rtc-public'), timeoutMs);
      await sleep(800); // cho ICE gathering kết thúc
      set(out, 'remoteIp', txt('#client-ipv4'));
      set(out, 'rtcLocal', txt('#rtc-local'));
      set(out, 'rtcPublic', txt('#rtc-public'));
      set(out, 'rtcLeak', txt('#rtc-leak'));
      set(out, 'peerConnection', bool(txt('#rtc-peerconnection')));
      set(out, 'mediaDevicesRaw', txt('#rtc-device-ids'));
    }

    /* ─────────────────────────── BrowserLeaks: /canvas ─────────────────────── */
    else if (pageId === 'bl-canvas') {
      await until(() => /[0-9a-f]{16,}/i.test(txt('#canvas-hash')), timeoutMs);
      set(out, 'canvasSignature', txt('#canvas-hash'));
      set(out, 'canvasUniqueness', txt('#canvas-ratio'));
    }

    /* ─────────────────────────── BrowserLeaks: /webgl ──────────────────────── */
    else if (pageId === 'bl-webgl') {
      await until(() => !!txt('#UNMASKED_RENDERER_WEBGL') || !!txt('#RENDERER'), timeoutMs);
      set(out, 'glVersion', txt('#VERSION'));
      set(out, 'glShadingLanguage', txt('#SHADING_LANGUAGE_VERSION'));
      set(out, 'glVendor', txt('#VENDOR'));
      set(out, 'glRenderer', txt('#RENDERER'));
      set(out, 'glUnmaskedVendor', txt('#UNMASKED_VENDOR_WEBGL'));
      set(out, 'glUnmaskedRenderer', txt('#UNMASKED_RENDERER_WEBGL'));
      set(out, 'glReportHash', txt('#gl-report-hash'));
      set(out, 'glImageHash', txt('#gl-image-hash'));
    }

    /* ─────────────────────────── BrowserLeaks: /fonts ──────────────────────── */
    else if (pageId === 'bl-fonts') {
      await until(() => /[0-9a-f]{16,}/i.test(txt('#fonts-metrics-hash')), timeoutMs, 1000); // check mỗi 1s thay vì 250ms
      await sleep(1000); // chờ thêm để đảm bảo tất cả fonts được render
      set(out, 'fontsMetricsHash', txt('#fonts-metrics-hash'));
      set(out, 'fontsGlyphsHash', txt('#fonts-glyphs-hash'));
    }

    /* ─────────────────────────────── BrowserScan ───────────────────────────── */
    else if (pageId === 'bs-home') {
      /** Giá trị đứng cạnh <h3> nhãn: leo tối đa 4 cấp, bỏ qua sibling rỗng / đang skeleton. */
      const h3Value = (label: string): string => {
        const h = Array.from(document.querySelectorAll('h3')).find((x) => clean(x.textContent).toLowerCase() === label.toLowerCase());
        if (!h) return '';
        const ok = (e: Element | null | undefined): e is Element =>
          !!e && e.tagName !== 'H3' && !e.querySelector('h3, .skeleton') && !!clean(e.textContent);
        const direct = h.nextElementSibling;
        if (ok(direct)) return clean(direct.textContent);
        if (/:$/.test(clean(h.textContent))) return ''; // nhãn dạng "Proxy:" — chỉ có sibling trực tiếp
        let n: Element | null = h;
        for (let i = 0; i < 4 && n; i++) {
          n = n.parentElement;
          const sib = n?.nextElementSibling;
          if (ok(sib)) return clean(sib.textContent);
        }
        return '';
      };
      const authenticity = (): string => {
        for (const span of Array.from(document.querySelectorAll('div > span'))) {
          if (!clean(span.textContent).includes('Browser fingerprint authenticity')) continue;
          return clean(span.nextElementSibling?.textContent);
        }
        return '';
      };
      await until(() => /\d/.test(authenticity()) && !!h3Value('Proxy:'), timeoutMs);
      await sleep(1200); // chờ các ô còn lại hết skeleton
      set(out, 'authenticity', num(authenticity()));
      set(out, 'bsBrowser', h3Value('Browser:'));
      set(out, 'bsPlatform', h3Value('Platform:'));
      set(out, 'bsIpTimeZone', h3Value('IP Time Zone:'));
      set(out, 'bsLocation', h3Value('Location:'));
      set(out, 'bsLanguage', h3Value('language:'));
      set(out, 'bsIsp', h3Value('ISP:'));
      set(out, 'bsProxy', h3Value('Proxy:'));
      set(out, 'bsAnonymous', h3Value('Anonymous:'));
      set(out, 'bsBlacklist', h3Value('Blacklist:'));
      set(out, 'bsDnsLeak', h3Value('DNS Leak:'));
      set(out, 'bsBot', h3Value('Bot Detection:'));
      set(out, 'bsVisitorId', h3Value('visitor ID'));
      set(out, 'bsIncognito', h3Value('Incognito mode'));
    }

    /* ──────────────────────── BrowserScan: IP Check ────────────────────────── */
    else if (pageId === 'bs-ipcheck') {
      // Trang IP check của BrowserScan - chờ bất kỳ h3 nào xuất hiện
      await until(() => document.querySelectorAll('h3').length > 0 && !document.querySelector('.skeleton'), timeoutMs);
      await sleep(1500);
      const h3Value = (label: string): string => {
        const h = Array.from(document.querySelectorAll('h3')).find((x) => clean(x.textContent).toLowerCase() === label.toLowerCase());
        if (!h) return '';
        const ok = (e: Element | null | undefined): e is Element =>
          !!e && e.tagName !== 'H3' && !e.querySelector('.skeleton') && !!clean(e.textContent);
        const direct = h.nextElementSibling;
        if (ok(direct)) return clean(direct.textContent);
        let n: Element | null = h;
        for (let i = 0; i < 4 && n; i++) {
          n = n.parentElement;
          const sib = n?.nextElementSibling;
          if (ok(sib)) return clean(sib.textContent);
        }
        return '';
      };
      // Lấy tất cả field có thể
      set(out, 'ipAddress', h3Value('IP Address:'));
      set(out, 'ipVersion', h3Value('IP Version:'));
      set(out, 'location', h3Value('Location:'));
      set(out, 'timezone', h3Value('Time Zone:'));
      set(out, 'isp', h3Value('ISP:'));
      set(out, 'asn', h3Value('ASN:'));
      set(out, 'country', h3Value('Country:'));
      set(out, 'city', h3Value('City:'));
    }

    /* ──────────────────────── BrowserScan: TLS/HTTP2 ───────────────────────── */
    else if (pageId === 'bs-tls') {
      await until(() => document.querySelectorAll('h3').length > 0 && !document.querySelector('.skeleton'), timeoutMs);
      await sleep(1500);
      const h3Value = (label: string): string => {
        const h = Array.from(document.querySelectorAll('h3')).find((x) => clean(x.textContent).toLowerCase() === label.toLowerCase());
        if (!h) return '';
        const ok = (e: Element | null | undefined): e is Element =>
          !!e && e.tagName !== 'H3' && !e.querySelector('.skeleton') && !!clean(e.textContent);
        const direct = h.nextElementSibling;
        if (ok(direct)) return clean(direct.textContent);
        let n: Element | null = h;
        for (let i = 0; i < 4 && n; i++) {
          n = n.parentElement;
          const sib = n?.nextElementSibling;
          if (ok(sib)) return clean(sib.textContent);
        }
        return '';
      };
      set(out, 'ja3', h3Value('JA3:'));
      set(out, 'ja4', h3Value('JA4:'));
      set(out, 'tlsVersion', h3Value('TLS Version:'));
      set(out, 'cipherSuite', h3Value('Cipher Suite:'));
      set(out, 'http2Fingerprint', h3Value('HTTP/2 Fingerprint:'));
      set(out, 'akamaiFingerprint', h3Value('Akamai Fingerprint:'));
    }

    /* ─────────────────────── BrowserScan: User Agent ───────────────────────── */
    else if (pageId === 'bs-useragent') {
      await until(() => document.querySelectorAll('h3').length > 0 && !document.querySelector('.skeleton'), timeoutMs);
      await sleep(1500);
      const h3Value = (label: string): string => {
        const h = Array.from(document.querySelectorAll('h3')).find((x) => clean(x.textContent).toLowerCase() === label.toLowerCase());
        if (!h) return '';
        const ok = (e: Element | null | undefined): e is Element =>
          !!e && e.tagName !== 'H3' && !e.querySelector('.skeleton') && !!clean(e.textContent);
        const direct = h.nextElementSibling;
        if (ok(direct)) return clean(direct.textContent);
        let n: Element | null = h;
        for (let i = 0; i < 4 && n; i++) {
          n = n.parentElement;
          const sib = n?.nextElementSibling;
          if (ok(sib)) return clean(sib.textContent);
        }
        return '';
      };
      set(out, 'userAgent', h3Value('User Agent:'));
      set(out, 'browser', h3Value('Browser:'));
      set(out, 'browserVersion', h3Value('Browser Version:'));
      set(out, 'os', h3Value('Operating System:'));
      set(out, 'device', h3Value('Device:'));
    }

    /* ───────────────────────────────── CreepJS ─────────────────────────────── */
    else if (pageId === 'creepjs') {
      // Trang chính CreepJS - có đầy đủ fingerprint ID và detection results
      const hexRe = /[0-9a-f]{64}/i;
      const fpText = () => (q('#fingerprint-data .fingerprint-header .ellipsis-all')?.textContent || '').replace(/FP ID:/i, '').replace(/\s/g, '');
      await until(() => hexRe.test(fpText()) && !!q('#headless-resistance-detection-results .stealth-rating'), timeoutMs, 400);
      await sleep(1500); // worker / webrtc / media render muộn hơn

      const root = q('#fingerprint-data');
      const fp = fpText().match(hexRe);
      set(out, 'fpId', fp ? fp[0] : '');
      set(out, 'fuzzyFp', clean(q('#fuzzy-fingerprint')?.textContent).replace(/^Fuzzy:\s*/i, ''));

      /** Khối (relative col-*) chứa <strong> có tiêu đề khớp. */
      const section = (title: string): Element | null => {
        for (const s of Array.from(root?.querySelectorAll('strong') || [])) {
          if (clean(s.textContent) === title) return s.closest('div');
        }
        return null;
      };
      const sText = (title: string) => plain(section(title));
      const sHash = (title: string): string => {
        const s = Array.from(root?.querySelectorAll('strong') || []).find((x) => clean(x.textContent) === title);
        const h = s?.nextElementSibling;
        return h && h.classList.contains('hash') ? clean(h.textContent) : '';
      };

      set(out, 'canvasHash', sHash('Canvas 2d'));
      set(out, 'webglHash', sHash('WebGL'));
      set(out, 'audioHash', sHash('Audio'));
      set(out, 'fontsHash', sHash('Fonts'));
      set(out, 'timezoneHash', sHash('Timezone'));
      set(out, 'screenHash', sHash('Screen'));

      const canvas = sText('Canvas 2d');
      set(out, 'canvas2dHash', (canvas.match(/data:\s*([0-9a-f]{8})/i) || [])[1]);
      set(out, 'canvasTextHash', (canvas.match(/text:\s*([0-9a-f]{8})/i) || [])[1]);

      const gl = sText('WebGL');
      set(out, 'webglImageHash', (gl.match(/images:\s*([0-9a-f]{8})/i) || [])[1]);
      set(out, 'webglPixelHash', (gl.match(/pixels:\s*([0-9a-f]{8})/i) || [])[1]);
      set(out, 'webglParamsHash', (gl.match(/params \(\d+\):\s*([0-9a-f]{8})/i) || [])[1]);
      set(out, 'webglExtensionsCount', num((gl.match(/exts \((\d+)\)/i) || [])[1] || ''));

      // Headless / stealth
      const hl = plain(q('#headless-resistance-detection-results'));
      const pct = (sel: string) => num((clean(q('#headless-resistance-detection-results ' + sel)?.textContent).match(/(\d+)%/) || [])[1] || '');
      set(out, 'likeHeadlessScore', pct('.like-headless-rating'));
      set(out, 'headlessScore', pct('.headless-rating'));
      set(out, 'stealthScore', pct('.stealth-rating'));
      const chromium = hl.match(/chromium:\s*(true|false)/i);
      if (chromium) out.chromiumDetected = chromium[1].toLowerCase() === 'true';
      const flags = ['noChrome', 'hasPermissionsBug', 'noPlugins', 'noMimeTypes', 'notificationIsDenied', 'hasKnownBgColor', 'prefersLightColor',
        'uaDataIsBlank', 'pdfIsDisabled', 'noTaskbar', 'hasVvpScreenRes', 'hasSwiftShader', 'noWebShare', 'noContentIndex', 'noContactsManager',
        'noDownlinkMax', 'webDriverIsOn', 'hasHeadlessUA', 'hasHeadlessWorkerUA', 'hasIframeProxy', 'hasHighChromeIndex', 'hasBadChromeRuntime',
        'hasToStringProxy', 'hasBadWebGL'];
      const f: Record<string, boolean> = {};
      for (const k of flags) {
        const m = hl.match(new RegExp(k + ':\\s*(true|false)', 'i'));
        if (m) f[k] = m[1].toLowerCase() === 'true';
      }
      out.flags = f;

      // Resistance (privacy tool / extension)
      const res = sText('Resistance');
      set(out, 'resistancePrivacy', (res.match(/privacy:\s*(.+?)\s+security:/i) || [])[1]);
      set(out, 'resistanceExtension', (res.match(/extension:\s*(.+)$/i) || [])[1]);

      // UA reduction: CreepJS ghi "ua reduction" cạnh dòng userAgent (Worker / Navigator)
      out.uaReduction = /ua reduction/i.test(plain(root));

      // WebRTC candidates + devices
      const rtc = plain(q('#fingerprint-data .visitor-info'));
      const host = rtc.match(/udp \d+ (\S+) \d+ typ host/i);
      const stun = rtc.match(/udp \d+ (\S+) \d+ typ srflx/i);
      if (host) out.hostCandidate = host[1];
      if (stun) out.stunCandidate = stun[1];
      const dev = rtc.match(/devices \((\d+)\):\s*([a-z,\s]+?)(?:\s{2,}|$|\d)/i);
      if (dev) out.devicesRaw = clean(dev[2]);

      // Speech / status
      const speech = sText('Speech');
      set(out, 'speechVoicesCount', num((speech.match(/local \((\d+)\)/i) || [])[1] || ''));
      const status = plain(root);
      const lvl = status.match(/battery:\s*level:\s*(\d+)%\s*charging:\s*(true|false)/i);
      if (lvl) { out.batteryLevel = +lvl[1] / 100; out.batteryCharging = lvl[2].toLowerCase() === 'true'; }
    }

    /* ──────────────────────────── CreepJS Tests ────────────────────────────── */
    else if (pageId.startsWith('creepjs-')) {
      // Trang test riêng lẻ của CreepJS - chỉ có hash và dữ liệu cụ thể
      await until(() => !!q('#fingerprint-data .hash'), timeoutMs, 400);
      await sleep(800);

      const root = q('#fingerprint-data');
      const testName = pageId.replace('creepjs-', '');
      
      // Lấy hash chính từ <strong>TestName</strong><span class="hash">...</span>
      const mainHash = clean(q('#fingerprint-data > .visitor-info .hash')?.textContent);
      if (mainHash) out[testName + 'Hash'] = mainHash;

      // Lấy tất cả hash con (ví dụ: workers có Window/Dedicated/Shared/Service hash)
      const subHashes: Record<string, string> = {};
      for (const strong of Array.from(root?.querySelectorAll('strong') || [])) {
        const title = clean(strong.textContent);
        const hashEl = strong.nextElementSibling;
        if (hashEl && hashEl.classList.contains('hash')) {
          const hashVal = clean(hashEl.textContent);
          if (hashVal) subHashes[title] = hashVal;
        }
      }
      if (Object.keys(subHashes).length) out[testName + 'SubHashes'] = subHashes;

      // Lấy toàn bộ text content làm raw data
      const rawText = plain(root);
      if (rawText) out[testName + 'Raw'] = rawText;
    }

    /* ───────────────────────────── SannySoft ──────────────────────────────── */
    else if (pageId === 'sannysoft') {
      // Chờ bảng antibot chính load
      await until(() => !!q('#user-agent-result'), timeoutMs);
      await sleep(2000); // chờ tất cả test chạy xong
      
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
      
      const antibot: Record<string, string> = {};
      for (const name in antibotIds) {
        const el = document.getElementById(antibotIds[name]);
        const v = txt(el);
        if (v) antibot[name] = v;
      }
      out.antibot = antibot;
      
      // Fingerprint Scanner #fp2
      const fpScanner: Record<string, any> = {};
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
          try { data = JSON.parse(pre.textContent || ''); }
          catch { data = (pre.textContent || '').trim(); }
        }
        if (status || data) fpScanner[name] = { status, data };
      }
      out.fpScanner = fpScanner;
      
      // Bảng "Some details"
      const tables = Array.from(document.querySelectorAll('table'));
      const detailsTable = tables.find(t => {
        const prev = t.previousElementSibling;
        return prev && (prev.textContent || '').includes('Some details');
      }) || tables[2];
      
      const details: Record<string, string> = {};
      if (detailsTable) {
        const rows = detailsTable.querySelectorAll('tr');
        for (const tr of Array.from(rows)) {
          const cells = tr.querySelectorAll('td');
          if (cells.length < 2) continue;
          const k = txt(cells[0]);
          const v = txt(cells[1]);
          if (!k || !v) continue;
          let key = k, n = 2;
          while (details[key] !== undefined) key = `${k} #${n++}`;
          details[key] = v;
        }
      }
      out.details = details;
      
      // Canvas hash
      const canvas: Record<string, string> = {};
      for (let i = 1; i <= 5; i++) {
        const el = document.getElementById('canvas' + i);
        const v = txt(el);
        if (v) canvas['canvas' + i] = v;
      }
      out.canvas = canvas;
      
      // Fp-collect JSON
      const fp = document.getElementById('fp');
      if (fp) {
        try { out.fpCollect = JSON.parse(fp.textContent || ''); }
        catch { out.fpCollect = (fp.textContent || '').trim(); }
      }
    }

    /* ────────────────────────────── GlassBox ───────────────────────────────── */
    else if (pageId === 'glassbox') {
      // Chờ panels load xong (cDone >= cTotal)
      await until(() => {
        const done = Number(q('#cDone')?.textContent || 0);
        const total = Number(q('#cTotal')?.textContent || 0);
        return total > 0 && done >= total;
      }, timeoutMs, 500);
      await sleep(1000);
      
      out.browser = txt(q('#browserBadge'));
      
      const identity: Record<string, string> = {
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
      for (const k in identity) if (!identity[k]) delete identity[k];
      out.identity = identity;
      
      const panels: Record<string, any> = {};
      const panelEls = document.querySelectorAll('#grid .panel');
      for (const panel of Array.from(panelEls)) {
        const title = txt(panel.querySelector('.p-title'));
        const num = txt(panel.querySelector('.p-num'));
        const signal = txt(panel.querySelector('.sig'));
        const note = txt(panel.querySelector('.note'));
        
        const rows: Record<string, string> = {};
        const rowEls = panel.querySelectorAll('.p-body .row');
        for (const row of Array.from(rowEls)) {
          const k = txt(row.querySelector('.k'));
          const v = txt(row.querySelector('.v'));
          if (k && v) rows[k] = v;
        }
        
        const chips: string[] = [];
        const chipEls = panel.querySelectorAll('.chip');
        for (const c of Array.from(chipEls)) {
          const val = txt(c);
          if (val) chips.push(val);
        }
        
        const requests: string[] = [];
        const reqEls = panel.querySelectorAll('pre.req');
        for (const p of Array.from(reqEls)) {
          const val = (p.textContent || '').trim();
          if (val) requests.push(val);
        }
        
        const thumbEl = panel.querySelector('img.thumb') as HTMLImageElement | null;
        const thumb = thumbEl?.src || null;
        
        const key = title || num || `panel-${Object.keys(panels).length + 1}`;
        const item: Record<string, any> = { num, signal, rows };
        if (note) item.note = note;
        if (chips.length) item.chips = chips;
        if (requests.length) item.requests = requests;
        if (thumb) item.thumb = thumb;
        
        panels[key] = item;
      }
      out.panels = panels;
    }

    else {
      out.__error = 'Unknown page id: ' + pageId;
    }
  } catch (e: any) {
    out.__error = String(e && e.message ? e.message : e);
  }

  // Cung cấp 2 giá trị local, tin cậy tuyệt đối vì chạy ngay trong trình duyệt đang kiểm tra
  out.__tzOffset = new Date().getTimezoneOffset();
  out.__dateString = new Date().toString();
  return out;
}

/**
 * MIGRATION NOTE:
 * Code logic đã được tách thành 24 file riêng trong folder scrapers/.
 * Tuy nhiên, do chrome.scripting.executeScript yêu cầu hàm phải tự chứa (serialize),
 * nên scrape.ts này vẫn giữ nguyên cấu trúc if-else cũ.
 * 
 * Các file trong scrapers/ phục vụ mục đích:
 * 1. Dễ đọc/maintain logic từng trang riêng biệt
 * 2. Có thể test unit từng scraper độc lập
 * 3. Chuẩn bị cho tương lai nếu tìm được cách bundle/inline code tự động
 * 
 * Hiện tại: scrape.ts (file này) vẫn là source of truth được inject vào tab.
 */
