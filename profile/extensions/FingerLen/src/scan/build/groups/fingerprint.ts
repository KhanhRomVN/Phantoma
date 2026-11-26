import { type G, type Pages, put, short, grab, toNum } from '../helpers';
import { glassbox } from '../glassbox';

export function buildFingerprint(p: Pages): G {
  const cp = p('creepjs'), cv = p('bl-canvas'), gl = p('bl-webgl'), fn = p('bl-fonts');
  const gb = glassbox(p);
  const f: G = {};

  put(f, 'fpId', cp.fpId);
  put(f, 'fuzzyFp', cp.fuzzyFp);
  put(f, 'canvasHash', cp.canvasHash || short(cv.canvasSignature));
  put(f, 'webglHash', cp.webglHash || short(gl.glReportHash));
  put(f, 'audioHash', cp.audioHash);
  put(f, 'fontsHash', cp.fontsHash || short(fn.fontsMetricsHash));
  put(f, 'timezoneHash', cp.timezoneHash);
  put(f, 'screenHash', cp.screenHash);

  /* Hash từ các trang test CreepJS (chi tiết hơn hash tổng ở trên) */
  const h = (page: string, key: string, re: RegExp) => grab(p(page)[key], re);
  put(f, 'fontsTestHash', p('creepjs-fonts').fontsHash);
  put(f, 'timezoneTestHash', h('creepjs-timezone', 'timezoneRaw', /Timezone\s+([0-9a-f]{8})/));
  put(f, 'screenTestHash', h('creepjs-screen', 'screenRaw', /Screen\s+([0-9a-f]{8})/));
  put(f, 'mathHash', h('creepjs-math', 'mathRaw', /Math\s+([0-9a-f]{8})/));
  put(f, 'emojisHash', h('creepjs-emojis', 'emojisRaw', /Emojis\s+([0-9a-f]{8})/));
  put(f, 'proxyHash', h('creepjs-proxy', 'proxyRaw', /Proxy\s+[\d.]+ms\s+([0-9a-f]{8})/));
  put(f, 'extensionsHash', p('creepjs-extensions').extensionsHash);
  put(f, 'workersHash', p('creepjs-workers').workersSubHashes?.Dedicated);

  /* GlassBox: hash phần cứng / engine / build + độ "độc nhất" */
  const id = gb.identity;
  put(f, 'hwHash', id.hwHash);
  put(f, 'engineHash', id.engineHash);
  put(f, 'buildHash', id.buildHash);
  put(f, 'sessionHash', id.sessionHash);
  put(f, 'identityBand', id.band);
  put(f, 'entropyBits', toNum(grab(id.caveat, /≈\s*([\d.]+)\s*bits/)));
  put(f, 'crowdSize', typeof id.identifiabilityLine === 'string' ? id.identifiabilityLine.split(' · ')[0] : undefined);
  put(f, 'canvasUniqueness', cv.canvasUniqueness);

  /* Extension: số đếm từ trang test + tên extension chống fingerprint (nếu có) */
  const ext = p('creepjs-extensions').extensionsRaw;
  const found = toNum(grab(ext, /(\d+)\s+of\s+\d+\s+detected/));
  const names: string[] = [];
  if (typeof cp.resistanceExtension === 'string' && !/^(unknown|undefined|none|)$/i.test(cp.resistanceExtension.trim()))
    names.push(cp.resistanceExtension.trim());
  if (found && found > 0 && !names.length) names.push(`${found} known extension(s) detected`);
  if (typeof cp.resistanceExtension === 'string' || found !== undefined) f.extensionsDetected = names;
  return f;
}
