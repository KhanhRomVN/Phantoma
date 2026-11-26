import { clean, q, plain, until, set, num, sleep } from '../_helpers';

/**
 * Scraper cho CreepJS trang chính — https://abrahamjuliot.github.io/creepjs/
 * 532 fields: FP ID, Fuzzy, WebRTC, Timezone, Intl, Headless, Resistance, Worker,
 * WebGL, Screen, Canvas 2d, Fonts, DOMRect, SVGRect, Audio, Media, CSS Media Queries,
 * Computed Style, Math, Error, Window, HTMLElement, Navigator, Status
 */
export async function scrapeCreepjs(timeoutMs: number): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  
  try {
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
  } catch (e: any) {
    out.__error = String(e && e.message ? e.message : e);
  }
  
  return out;
}