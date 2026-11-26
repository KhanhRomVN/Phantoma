import { RISKY } from '../../fingerlen/data/constants';
import { type G, type Pages, clamp, flag } from './helpers';

interface Input {
  groups: Record<string, G>;
  warnings: Record<string, string[]>;
  consistency: { pass: number; total: number };
  p: Pages;
}

/** Điểm tổng quan (security / privacy / consistency / uniqueness / trust). Không đủ dữ liệu ⇒ bỏ điểm đó. */
export function buildOverview({ groups, warnings, consistency, p }: Input): G {
  const { network, navigator } = groups;
  const bs = p('bs-home'), cv = p('bl-canvas'), cp = p('creepjs');

  let rTotal = 0, rPass = 0;
  for (const g of Object.values(groups))
    for (const [k, v] of Object.entries(g))
      if (RISKY.has(k) && typeof v === 'boolean') { rTotal++; if (!v) rPass++; }

  const o: G = {};
  const headlessRisk = cp.headlessScore, stealthRisk = cp.stealthScore;
  if (headlessRisk !== undefined) o.headlessRisk = headlessRisk;
  if (stealthRisk !== undefined) o.stealthRisk = stealthRisk;
  if (consistency.total) o.consistencyScore = clamp((consistency.pass / consistency.total) * 100);

  // privacy: trừ điểm khi có rò rỉ thật sự đo được
  if (network.dnsLeak !== undefined || network.webrtcLeak !== undefined) {
    o.privacyScore = clamp(100 - (network.dnsLeak ? 35 : 0) - (network.webrtcLeak ? 35 : 0)
      - (warnings.navigator ? 5 : 0) - (warnings.fingerprint ? 10 : 0));
  }

  // security: dấu hiệu bot / headless / webdriver
  const bot = flag(bs.bsBot);
  if (headlessRisk !== undefined || bot !== undefined || navigator.webdriver !== undefined) {
    o.securityScore = clamp(100 - (headlessRisk ?? 0) * 0.5 - (stealthRisk ?? 0) * 0.5
      - (bot ? 30 : 0) - (navigator.webdriver ? 30 : 0));
  }

  // uniqueness (càng thấp càng tốt): % trình duyệt KHÔNG trùng canvas signature với bạn.
  const share = parseFloat(String(cv.canvasUniqueness || '').replace(',', '.').match(/(\d+(?:\.\d+)?)\s*%/)?.[1] ?? '');
  if (!Number.isNaN(share)) o.uniquenessScore = clamp(100 - share);

  // trust: ưu tiên điểm "authenticity" của BrowserScan; không có thì lấy trung bình các điểm đo được
  if (typeof bs.authenticity === 'number') o.overallTrustScore = clamp(bs.authenticity);
  else {
    const base = [o.securityScore, o.privacyScore, o.consistencyScore].filter((x) => typeof x === 'number') as number[];
    if (base.length) o.overallTrustScore = clamp(base.reduce((a, b) => a + b, 0) / base.length);
  }
  const t = o.overallTrustScore;
  if (typeof t === 'number') o.verdictLabel = t >= 80 ? 'Low exposure' : t >= 60 ? 'Moderate exposure' : 'High exposure';

  o.lastCheckAt = new Date().toISOString();
  o.checksTotal = rTotal + consistency.total;
  o.checksPassed = rPass + consistency.pass;
  return o;
}
