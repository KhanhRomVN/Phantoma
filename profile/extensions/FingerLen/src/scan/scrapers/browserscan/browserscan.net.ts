import { clean, q, txt, until, set, num, bool, sleep } from '../_helpers';

/**
 * Scraper cho BrowserScan home page — https://www.browserscan.net/
 * 67 fields: Overview, IP address, Location, Hardware, Browser, Software, Port Scan, Fonts
 */
export async function scrapeBsHome(timeoutMs: number): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  
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
  
  try {
    await until(() => /\d/.test(authenticity()) && !!h3Value('Proxy:'), timeoutMs);
    await sleep(1200); // chờ các ô còn lại hết skeleton
    
    // Tổng quan (đầu trang)
    set(out, 'overviewIp', h3Value('IP'));
    set(out, 'overviewLocationDisplay', h3Value('Location (hiển thị)'));
    set(out, 'overviewBrowser', h3Value('Browser'));
    set(out, 'overviewPlatform', h3Value('Platform'));
    set(out, 'overviewIpTimeZone', h3Value('IP Time Zone'));
    set(out, 'overviewLocation', h3Value('Location'));
    set(out, 'overviewLanguage', h3Value('language'));
    set(out, 'overviewPostalCode', h3Value('Postal Code'));
    set(out, 'overviewIsp', h3Value('ISP'));
    set(out, 'overviewProxy', h3Value('Proxy'));
    set(out, 'overviewAnonymous', h3Value('Anonymous'));
    set(out, 'overviewBlacklist', h3Value('Blacklist'));
    set(out, 'overviewDnsLeak', h3Value('DNS Leak'));
    set(out, 'overviewBotDetection', h3Value('Bot Detection'));
    set(out, 'browserFingerprintAuthenticity', num(authenticity()));
    
    // Cảnh báo (nếu có)
    const warningEl = q('.warning, .alert, [class*="warn"]');
    if (warningEl) set(out, 'warning', clean(warningEl.textContent));
    
    // IP address
    set(out, 'ipAddress', h3Value('IP'));
    set(out, 'webrtcIp', h3Value('WebRTC'));
    set(out, 'webrtcStun', h3Value('WebRTC STUN'));
    set(out, 'ipCount7Days', h3Value('IP Count (7 days)'));
    set(out, 'isp', h3Value('ISP'));
    
    // Location
    set(out, 'country', h3Value('Country'));
    set(out, 'region', h3Value('Region'));
    set(out, 'city', h3Value('City'));
    set(out, 'postalCode', h3Value('Postal Code'));
    set(out, 'latitude', h3Value('Latitude'));
    set(out, 'longitude', h3Value('Longitude'));
    
    // Hardware
    set(out, 'visitorId', h3Value('visitor ID'));
    set(out, 'canvasFingerprint', h3Value('Canvas'));
    set(out, 'webglFingerprint', h3Value('WebGL'));
    set(out, 'webglReport', h3Value('WebGL Report'));
    set(out, 'unmaskedVendor', h3Value('Unmasked Vendor'));
    set(out, 'unmaskedRenderer', h3Value('Unmasked Renderer'));
    set(out, 'audioFingerprint', h3Value('Audio'));
    set(out, 'clientRects', h3Value('Client Rects'));
    set(out, 'webgpuReport', h3Value('WebGPU Report'));
    set(out, 'screenResolution', h3Value('Screen Resolution'));
    set(out, 'availableScreenSize', h3Value('Available Screen Size'));
    set(out, 'colorDepth', num(h3Value('Color Depth')));
    set(out, 'touchSupport', num(h3Value('Touch Support')));
    set(out, 'deviceMemory', num(h3Value('Device Memory')));
    set(out, 'hardwareConcurrency', num(h3Value('Hardware Concurrency')));
    
    // Browser
    set(out, 'incognitoMode', h3Value('Incognito mode'));
    set(out, 'os', h3Value('OS'));
    set(out, 'browser', h3Value('Browser'));
    set(out, 'browserVersion', h3Value('Browser Version'));
    set(out, 'userAgentHeader', h3Value('User-Agent (Header)'));
    set(out, 'userAgentJavascript', h3Value('User-Agent (JavaScript)'));
    set(out, 'pdfViewerPlugins', h3Value('PDF Viewer plugins'));
    
    // Software
    set(out, 'timeZoneBasedOnIp', h3Value('Time Zone Based on IP'));
    set(out, 'timeZone', h3Value('Time Zone'));
    set(out, 'timeFromIp', h3Value('Time From IP'));
    set(out, 'timeFromJavascript', h3Value('Time From Javascript'));
    set(out, 'languages', h3Value('Languages'));
    set(out, 'acceptLanguageHeader', h3Value('Accept-Language header'));
    set(out, 'internationalizationApi', h3Value('Internationalization API'));
    set(out, 'botDetection', h3Value('Bot Detection'));
    set(out, 'doNotTrack', h3Value('Do Not Track'));
    set(out, 'javascript', h3Value('Javascript'));
    set(out, 'flash', h3Value('Flash'));
    set(out, 'activeX', h3Value('ActiveX'));
    set(out, 'java', h3Value('Java'));
    set(out, 'cookie', h3Value('Cookie'));
    
    // Port Scan
    set(out, 'portScan', h3Value('Port Scan'));
    
    // Fonts
    set(out, 'fontsFingerprint', h3Value('Fonts fingerprint'));
    set(out, 'fontsCount', num(h3Value('Số font')));
    const fontListEl = q('#font-list, .font-list');
    if (fontListEl) {
      const fonts = clean(fontListEl.textContent).split(/[,\n]+/).map(s => clean(s)).filter(Boolean);
      out.fontsList = fonts;
    }
  } catch (e: any) {
    out.__error = String(e && e.message ? e.message : e);
  }
  
  return out;
}