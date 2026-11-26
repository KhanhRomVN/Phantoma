import { type G, type Pages, put, flag, toNum } from '../helpers';
import { glassbox, GB } from '../glassbox';

export function buildNavigator(p: Pages): G {
  const js = p('bl-javascript'), cp = p('creepjs');
  const gb = glassbox(p);
  const n: G = {};

  put(n, 'userAgent', js.userAgent);
  put(n, 'browserBuild', gb.browser);
  put(n, 'uaReduction', cp.uaReduction);
  put(n, 'uaFullVersion', gb.row(GB.uaHints, 'uaFullVersion'));
  put(n, 'uaBrands', gb.row(GB.uaHints, 'brands'));
  put(n, 'uaArchitecture', gb.row(GB.uaHints, 'architecture'));
  put(n, 'uaBitness', gb.row(GB.uaHints, 'bitness'));
  put(n, 'uaMobile', flag(gb.row(GB.uaHints, 'mobile')));
  put(n, 'platform', js.platform);
  put(n, 'vendor', js.vendor);
  put(n, 'language', js.language);
  put(n, 'languages', js.languages);
  put(n, 'hardwareConcurrency', js.hardwareConcurrency);
  put(n, 'deviceMemory', js.deviceMemory);
  put(n, 'maxTouchPoints', js.maxTouchPoints);
  put(n, 'storageQuota', gb.row(GB.storage, 'quota estimate'));
  put(n, 'doNotTrack', js.doNotTrack);
  put(n, 'cookieEnabled', js.cookieEnabled);
  put(n, 'pdfViewerEnabled', js.pdfViewerEnabled);
  put(n, 'webdriver', js.webdriver ?? cp.flags?.webDriverIsOn);
  put(n, 'pluginsCount', js.pluginsCount);
  put(n, 'mimeTypesCount', js.mimeTypesCount);

  put(n, 'connectionType', gb.row(GB.netInfo, 'effectiveType'));
  put(n, 'downlink', toNum(gb.row(GB.netInfo, 'downlink (Mbps)')));
  put(n, 'rtt', toNum(gb.row(GB.netInfo, 'rtt (ms)')));
  put(n, 'saveData', flag(gb.row(GB.netInfo, 'saveData')));
  return n;
}
