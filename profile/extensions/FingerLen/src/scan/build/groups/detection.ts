import { type G, type Pages, put, flag, grab, toNum } from '../helpers';
import { glassbox, GB } from '../glassbox';

/** Flag CreepJS được đổi tên khi đưa lên UI; flag khác giữ nguyên. webDriverIsOn đã nằm ở navigator.webdriver. */
const FLAG_RENAME: Record<string, string> = { notificationIsDenied: 'notificationDenied' };
const FLAG_SKIP = new Set(['webDriverIsOn']);

export function buildDetection(p: Pages): G {
  const bs = p('bs-home'), cp = p('creepjs'), ss = p('sannysoft');
  const gb = glassbox(p);
  const d: G = {};

  put(d, 'chromiumDetected', cp.chromiumDetected);
  put(d, 'headlessScore', cp.headlessScore);
  put(d, 'likeHeadlessScore', cp.likeHeadlessScore);
  put(d, 'stealthScore', cp.stealthScore);
  const verdict = gb.row(GB.incognito, 'verdict');
  put(d, 'incognito', flag(bs.bsIncognito) ?? (verdict ? !/normal window/i.test(verdict) : undefined));

  // Data-driven: lấy MỌI flag CreepJS trả về, không cần liệt kê tay.
  for (const [k, v] of Object.entries((cp.flags || {}) as Record<string, boolean>)) {
    if (!FLAG_SKIP.has(k)) put(d, FLAG_RENAME[k] || k, v);
  }

  /* Kiểm tra toàn vẹn từ các trang test CreepJS */
  put(d, 'prototypeLies', toNum(grab(p('creepjs-prototype').prototypeRaw, /(\d+)\s+lies?\s+detected/)));
  put(d, 'domrectScore', toNum(grab(p('creepjs-domrect').domrectRaw, /score:\s*(\d+(?:\.\d+)?)%/)));
  const passed = (raw: unknown, re = /✔/) => (typeof raw === 'string' ? re.test(raw) && !/✖/.test(raw) : undefined);
  put(d, 'iframesPassed', passed(p('creepjs-iframes').iframesRaw, /✔\s*passed/));
  put(d, 'machinePassed', passed(p('creepjs-machine').machineRaw, /✔\s*passed/));
  put(d, 'timezonePassed', passed(p('creepjs-timezone').timezoneRaw));
  const ext = p('creepjs-extensions').extensionsRaw;
  put(d, 'extensionsFound', toNum(grab(ext, /(\d+)\s+of\s+\d+\s+detected/)));
  put(d, 'extensionsProbed', toNum(grab(ext, /\d+\s+of\s+(\d+)\s+detected/)));

  /* SannySoft */
  const antibot = Object.values((ss.antibot || {}) as Record<string, string>).map(String);
  if (antibot.length) {
    put(d, 'botTestsPassed', antibot.filter((v) => /\(passed\)|^passed$/i.test(v)).length);
    put(d, 'botTestsFailed', antibot.filter((v) => /fail/i.test(v)).length);
  }
  const scanner = Object.values((ss.fpScanner || {}) as Record<string, { status?: string }>);
  if (scanner.length) put(d, 'fpScannerFailed', scanner.filter((t) => t.status !== 'ok').length);
  return d;
}
