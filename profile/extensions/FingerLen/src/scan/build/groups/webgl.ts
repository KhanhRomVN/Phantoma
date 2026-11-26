import { type G, type Pages, put, toNum } from '../helpers';
import { glassbox, GB } from '../glassbox';

export function buildWebgl(p: Pages): G {
  const gl = p('bl-webgl'), cp = p('creepjs'), ss = p('sannysoft');
  const gb = glassbox(p);
  const w: G = {};

  const renderer: string = gl.glUnmaskedRenderer || gl.glRenderer || '';
  put(w, 'webglVendor', gl.glUnmaskedVendor || gl.glVendor);
  put(w, 'webglRenderer', renderer);
  put(w, 'webglVersion', gl.glVersion);
  put(w, 'shadingLanguageVersion', gl.glShadingLanguage);
  put(w, 'webglContext', gb.row(GB.gl, 'context'));

  const angle = renderer.match(/^ANGLE \((.*)\)$/);
  put(w, 'gpuModel', angle
    ? (angle[1].split(/,\s*/)[1] || '').replace(/\s+Direct3D.*$/i, '') || undefined
    : renderer || undefined);
  put(w, 'gpuVendor', gb.row(GB.gpu, 'vendor'));
  put(w, 'gpuArchitecture', gb.row(GB.gpu, 'architecture'));

  put(w, 'webglParamsHash', cp.webglParamsHash);
  put(w, 'webglExtensionsCount', cp.webglExtensionsCount);
  put(w, 'maxTextureSize', toNum(gb.row(GB.gl, 'max texture size')));
  put(w, 'webglImageHash', cp.webglImageHash);
  put(w, 'glImageHash', gl.glImageHash);
  put(w, 'webglPixelHash', cp.webglPixelHash);
  put(w, 'canvas2dHash', cp.canvas2dHash);
  put(w, 'canvasTextHash', cp.canvasTextHash);
  if (renderer) w.isSoftwareRenderer = /SwiftShader|llvmpipe|Software/i.test(renderer);

  // Canvas vẽ 5 lần (iframe/sandbox) mà hash khác nhau ⇒ trình duyệt đang chèn noise.
  const hashes = Object.values((ss.canvas || {}) as G).map(String);
  if (hashes.length) w.canvasStable = new Set(hashes).size === 1;

  const resistKnown = cp.resistancePrivacy !== undefined;
  if (resistKnown || w.canvasStable === false) {
    w.antiFingerprintNoise =
      (resistKnown && !/^(unknown|undefined|none)$/i.test(cp.resistancePrivacy)) || w.canvasStable === false;
  }
  return w;
}
