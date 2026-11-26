import type { RawPages, ScanData } from '../../types';
import { TITLES } from '../../fingerlen/data/constants';
import { pagesOf } from './helpers';
import { buildNetwork } from './groups/network';
import { buildNavigator } from './groups/navigator';
import { buildScreen } from './groups/screen';
import { buildWebgl } from './groups/webgl';
import { buildTimezone } from './groups/timezone';
import { buildDetection } from './groups/detection';
import { buildMedia } from './groups/media';
import { buildFingerprint } from './groups/fingerprint';
import { consistencyChecks } from './checks';
import { buildWarnings } from './warnings';
import { buildOverview } from './overview';

/**
 * RawPages (pageId → dữ liệu thô) → ScanData (group → field) cho UI.
 *
 * Thêm field mới: viết vào đúng file trong ./groups, rồi khai báo trong fingerlen/tabSpec.ts
 * (không khai báo cũng không mất: DetailTab tự đưa vào section "Other").
 */
export function buildScanData(raw: RawPages): ScanData {
  const p = pagesOf(raw);

  // __dateString / __tzOffset do scraper gắn vào MỌI trang (giá trị local, đáng tin).
  const anyPage = Object.values(raw)[0] || {};
  const dateStr: string = anyPage.__dateString || '';

  const network = buildNetwork(p);
  const navigator = buildNavigator(p);
  const screen = buildScreen(p);
  const webgl = buildWebgl(p);
  const timezone = buildTimezone(p, dateStr, anyPage.__tzOffset);
  const detection = buildDetection(p);
  const media = buildMedia(p);
  const fingerprint = buildFingerprint(p);

  const groups = { fingerprint, network, navigator, screen, webgl, timezone, detection, media };
  const consistency = consistencyChecks({ network, navigator, screen, webgl, timezone }, dateStr);
  const warnings = buildWarnings(groups);
  const overview = buildOverview({ groups, warnings, consistency, p });
  fingerprint.totalChecks = overview.checksTotal;

  return {
    titles: TITLES,
    inverseScores: ['uniquenessScore', 'headlessRisk', 'stealthRisk'],
    warnings,
    snapshot: raw, // raw data cho tab Raw Data
    overview,
    ...groups,
  };
}
