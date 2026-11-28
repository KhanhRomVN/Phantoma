import fs from 'fs';
import path from 'path';
import WebSocket from 'ws';
import { createLogger } from '../utils/logger';

const logger = createLogger('BrowserCdp');

const PORT_FILE_TIMEOUT_MS = 20000;
const CALL_TIMEOUT_MS = 10000;
const POLL_MS = 200;

// ASSUMED: IP lookups report Asia/Bangkok for Vietnam while the IP databases used by checkers (browserscan) report Asia/Ho_Chi_Minh — upgrade path: normalise through an IANA alias table instead of per-country overrides
const CANONICAL_TZ_BY_COUNTRY: Record<string, string> = { VN: 'Asia/Ho_Chi_Minh' };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;

export type Footprint = Record<string, unknown>;

export interface CdpHandle {
  close: () => void;
}

const errMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);

function fieldOf(fp: Footprint, label: string): string {
  const sections = Array.isArray(fp.sections) ? fp.sections : [];
  for (const section of sections) {
    const fields = (section as { fields?: unknown }).fields;
    if (!Array.isArray(fields)) continue;
    for (const field of fields) {
      if (Array.isArray(field) && field[0] === label) return str(field[1]);
    }
  }
  return '';
}

export function resolveTimezone(fp: Footprint): string {
  return CANONICAL_TZ_BY_COUNTRY[str(fp.cc).toUpperCase()] ?? str(fp.tz);
}

// ASSUMED: Chromium's ICU reports Asia/Saigon for Asia/Ho_Chi_Minh, which checkers flag against the IP timezone — upgrade path: patch Intl through a full IANA alias table instead of this single entry
const ICU_TZ_NAMES: Record<string, string> = { 'Asia/Ho_Chi_Minh': 'Asia/Saigon' };

// ASSUMED: the generated footprint claims a newer Chrome than the installed binary, so the UA and client hints follow the real binary version — upgrade path: generate the footprint from the installed version
export function alignFootprintVersion(fp: Footprint, realVersion: string | null): Footprint {
  const major = /^(\d+)\.\d+\.\d+\.\d+$/.exec(realVersion ?? '')?.[1];
  const userAgent = str(fp.userAgent);
  if (!major || !/Chrome\/\d+\.\d+\.\d+\.\d+/.test(userAgent)) return fp;
  return {
    ...fp,
    userAgent: userAgent.replace(/Chrome\/\d+\.\d+\.\d+\.\d+/, `Chrome/${major}.0.0.0`),
    chromeVersion: realVersion,
  };
}

const SNAPSHOT = `(async () => {
  const intl = Intl.DateTimeFormat().resolvedOptions();
  const out = { url: location.href, ua: navigator.userAgent, platform: navigator.platform, language: navigator.language, languages: Array.from(navigator.languages), tz: intl.timeZone, locale: intl.locale, tzOffset: new Date().getTimezoneOffset(), cores: navigator.hardwareConcurrency, memory: navigator.deviceMemory, screen: screen.width + 'x' + screen.height, dpr: devicePixelRatio, webdriver: navigator.webdriver, glNative: Function.prototype.toString.call(WebGLRenderingContext.prototype.getParameter).includes('[native code]') };
  try {
    const u = navigator.userAgentData;
    if (u) {
      const h = await u.getHighEntropyValues(['platformVersion', 'fullVersionList', 'architecture', 'bitness']);
      out.uach = { brands: u.brands, mobile: u.mobile, platform: u.platform, platformVersion: h.platformVersion, fullVersionList: h.fullVersionList, architecture: h.architecture, bitness: h.bitness };
    }
  } catch (e) { out.uachError = String(e); }
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    out.webgl = ext ? { vendor: gl.getParameter(ext.UNMASKED_VENDOR_WEBGL), renderer: gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) } : null;
  } catch (e) { out.webglError = String(e); }
  try {
    const gl2 = document.createElement('canvas').getContext('webgl');
    out.glParams = { glVendor: gl2.getParameter(gl2.VENDOR), glRenderer: gl2.getParameter(gl2.RENDERER), maxTexture: gl2.getParameter(gl2.MAX_TEXTURE_SIZE), extensions: gl2.getSupportedExtensions().length };
  } catch (e) { out.glParamsError = String(e); }
  try {
    const src = 'self.onmessage=()=>{try{const g=new OffscreenCanvas(1,1).getContext("webgl");const e=g.getExtension("WEBGL_debug_renderer_info");self.postMessage(g.getParameter(e.UNMASKED_RENDERER_WEBGL))}catch(x){self.postMessage(String(x))}}';
    const w = new Worker(URL.createObjectURL(new Blob([src])));
    out.workerRenderer = await new Promise((res) => { w.onmessage = (m) => res(m.data); w.onerror = () => res('worker error'); setTimeout(() => res('timeout'), 1500); w.postMessage(0); });
    w.terminate();
  } catch (e) { out.workerError = String(e); }
  return JSON.stringify(out);
})()`;

function buildInjection(fp: Footprint, languages: string[]): string {
  const cfg = JSON.stringify({
    languages,
    cores: num(fp.cores),
    memory: num(fp.memory),
    gpuVendor: /linux/i.test(str(fp.os)) && process.platform === 'linux' ? '' : fieldOf(fp, 'Unmasked vendor'),
    gpuRenderer: /linux/i.test(str(fp.os)) && process.platform === 'linux' ? '' : fieldOf(fp, 'Unmasked renderer'),
    timezone: resolveTimezone(fp),
    icuTimezone: ICU_TZ_NAMES[resolveTimezone(fp)] ?? '',
  });
  return `(() => {
  const cfg = ${cfg};
  const def = (obj, key, value) => { try { Object.defineProperty(obj, key, { get: () => value, configurable: true }); } catch (e) {} };
  const nav = (self.Navigator || self.WorkerNavigator).prototype;
  if (cfg.languages.length) { def(nav, 'languages', Object.freeze(cfg.languages.slice())); def(nav, 'language', cfg.languages[0]); }
  if (cfg.cores) def(nav, 'hardwareConcurrency', cfg.cores);
  if (cfg.memory) def(nav, 'deviceMemory', cfg.memory);
  if (navigator.webdriver) def(nav, 'webdriver', false);
  if (cfg.timezone && cfg.icuTimezone) {
    const proto = Intl.DateTimeFormat.prototype;
    proto.resolvedOptions = new Proxy(proto.resolvedOptions, { apply: (target, self, args) => { const r = Reflect.apply(target, self, args); if (r && r.timeZone === cfg.icuTimezone) r.timeZone = cfg.timezone; return r; } });
  }
  if (cfg.gpuVendor && cfg.gpuRenderer) {
    for (const Ctx of [self.WebGLRenderingContext, self.WebGL2RenderingContext]) {
      if (!Ctx) continue;
      const orig = Ctx.prototype.getParameter;
      Ctx.prototype.getParameter = new Proxy(orig, { apply: (target, self, args) => (args[0] === 37445 ? cfg.gpuVendor : args[0] === 37446 ? cfg.gpuRenderer : Reflect.apply(target, self, args)) });
    }
  }
})();`;
}

function buildOverrides(fp: Footprint) {
  const userAgent = str(fp.userAgent);
  const lang = str(fp.lang);
  const listed = fieldOf(fp, 'Languages').split(',').map((s) => s.trim()).filter(Boolean);
  const languages = listed.length ? listed : lang ? [lang] : [];
  const uaVersion = /Chrome\/((\d+)\.[\d.]+)/.exec(userAgent);
  const version = uaVersion && [uaVersion[0], /^\d+(\.\d+){3}$/.test(str(fp.chromeVersion)) ? str(fp.chromeVersion) : uaVersion[1], uaVersion[2]];
  const os = str(fp.os);
  const platform = /windows/i.test(os) ? 'Windows' : /mac/i.test(os) ? 'macOS' : 'Linux';
  const userAgentMetadata = version
    ? {
        brands: [
          { brand: 'Chromium', version: version[2] },
          { brand: 'Google Chrome', version: version[2] },
          { brand: 'Not.A/Brand', version: '24' },
        ],
        fullVersionList: [
          { brand: 'Chromium', version: version[1] },
          { brand: 'Google Chrome', version: version[1] },
          { brand: 'Not.A/Brand', version: '24.0.0.0' },
        ],
        platform,
        platformVersion: fieldOf(fp, 'Platform version') || '15.0.0',
        architecture: 'x86',
        model: '',
        mobile: false,
        bitness: '64',
        wow64: false,
      }
    : undefined;
  const navPlatform = fieldOf(fp, 'Platform');
  const userAgentOverride: Json = {
    userAgent,
    acceptLanguage: languages.join(','),
    ...(navPlatform ? { platform: navPlatform } : {}),
    ...(userAgentMetadata ? { userAgentMetadata } : {}),
  };
  return {
    userAgentOverride,
    timezone: resolveTimezone(fp),
    locale: fieldOf(fp, 'Locale') || lang,
    injection: buildInjection(fp, languages),
  };
}

class Cdp {
  private nextId = 0;
  private readonly pending = new Map<
    number,
    { resolve: (v: Json) => void; reject: (e: Error) => void; timer: NodeJS.Timeout }
  >();

  constructor(
    private readonly ws: WebSocket,
    onEvent: (method: string, params: Json, sessionId?: string) => void,
  ) {
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString()) as Json;
      if (typeof msg.id === 'number') {
        const call = this.pending.get(msg.id);
        if (!call) return;
        this.pending.delete(msg.id);
        clearTimeout(call.timer);
        if (msg.error) call.reject(new Error(String(msg.error.message)));
        else call.resolve((msg.result ?? {}) as Json);
        return;
      }
      onEvent(String(msg.method), (msg.params ?? {}) as Json, msg.sessionId as string | undefined);
    });
    ws.on('close', () => {
      for (const call of this.pending.values()) {
        clearTimeout(call.timer);
        call.reject(new Error('CDP socket closed'));
      }
      this.pending.clear();
    });
  }

  send(method: string, params: Json = {}, sessionId?: string): Promise<Json> {
    return new Promise((resolve, reject) => {
      const id = ++this.nextId;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, CALL_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
}

async function waitForBrowserWs(dir: string, cancelled: () => boolean): Promise<string | null> {
  const file = path.join(dir, 'DevToolsActivePort');
  const deadline = Date.now() + PORT_FILE_TIMEOUT_MS;
  while (Date.now() < deadline && !cancelled()) {
    try {
      const [port, wsPath] = fs.readFileSync(file, 'utf8').split('\n');
      if (port && wsPath) return `ws://127.0.0.1:${port.trim()}${wsPath.trim()}`;
    } catch {}
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  return null;
}

export function attachFootprint(userDataDir: string, fp: Footprint): CdpHandle {
  let socket: WebSocket | null = null;
  let closed = false;

  const run = async (): Promise<void> => {
    const url = await waitForBrowserWs(userDataDir, () => closed);
    if (!url) {
      logger.warn(`DevToolsActivePort not found in ${userDataDir}`);
      return;
    }
    const ws = new WebSocket(url);
    socket = ws;
    await new Promise<void>((resolve, reject) => {
      ws.once('open', resolve);
      ws.once('error', reject);
    });

    const o = buildOverrides(fp);
    logger.info(
      `[DEBUG] expected overrides: ${JSON.stringify({ ...o.userAgentOverride, timezone: o.timezone, locale: o.locale })}`,
    );
    const configured = new Set<string>();

    const safe = (method: string, params: Json, sessionId: string): Promise<Json | null> =>
      cdp.send(method, params, sessionId).catch((err) => {
        logger.warn(`${method} failed: ${errMessage(err)}`);
        return null;
      });

    const configure = async (sessionId: string, waiting: boolean): Promise<void> => {
      if (configured.has(sessionId)) return;
      configured.add(sessionId);
      if (o.userAgentOverride.userAgent) await safe('Emulation.setUserAgentOverride', o.userAgentOverride, sessionId);
      if (o.timezone) await safe('Emulation.setTimezoneOverride', { timezoneId: o.timezone }, sessionId);
      if (o.locale) await safe('Emulation.setLocaleOverride', { locale: o.locale }, sessionId);
      await safe('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true }, sessionId);
      await safe('Page.enable', {}, sessionId);
      await safe('Page.addScriptToEvaluateOnNewDocument', { source: o.injection, runImmediately: true }, sessionId);
      if (waiting) await safe('Runtime.runIfWaitingForDebugger', {}, sessionId);
    };

    const injectWorker = async (sessionId: string, waiting: boolean): Promise<void> => {
      await safe('Runtime.evaluate', { expression: o.injection }, sessionId);
      if (waiting) await safe('Runtime.runIfWaitingForDebugger', {}, sessionId);
    };

    const snapshot = async (sessionId: string): Promise<void> => {
      const res = await safe('Runtime.evaluate', { expression: SNAPSHOT, awaitPromise: true, returnByValue: true }, sessionId);
      const value = res?.result?.value;
      if (typeof value !== 'string') return;
      const parsed = JSON.parse(value) as { url?: string };
      if (!/^https?:/.test(parsed.url ?? '')) return;
      logger.info(`[DEBUG] real browser values: ${value}`);
    };

    const cdp = new Cdp(ws, (method, params, sessionId) => {
      if (method === 'Target.attachedToTarget') {
        const id = String(params.sessionId);
        if (params.targetInfo?.type === 'page') void configure(id, Boolean(params.waitingForDebugger));
        else if (/worker/.test(String(params.targetInfo?.type))) void injectWorker(id, Boolean(params.waitingForDebugger));
        else if (params.waitingForDebugger) void safe('Runtime.runIfWaitingForDebugger', {}, id);
      } else if (method === 'Page.loadEventFired' && sessionId) {
        void snapshot(sessionId);
      }
    });

    await cdp.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
    const targets = await cdp.send('Target.getTargets');
    for (const info of (targets.targetInfos ?? []) as Json[]) {
      if (info.type !== 'page') continue;
      const attached = await cdp.send('Target.attachToTarget', { targetId: info.targetId, flatten: true });
      if (attached.sessionId) void configure(String(attached.sessionId), false);
    }
  };

  run().catch((err) => logger.warn(`CDP attach failed: ${errMessage(err)}`));

  return {
    close: () => {
      closed = true;
      socket?.close();
    },
  };
}