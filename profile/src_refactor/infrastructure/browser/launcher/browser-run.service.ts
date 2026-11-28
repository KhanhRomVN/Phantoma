import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn, type ChildProcess } from 'child_process';
import type { Input } from '../../../database/sql';
import {
  getBrowserDir,
  getFolderInfo,
  getLaunchLayout,
  readSessionSites,
  parseBrowserKind,
  resolveBrowserExecutable,
  type BrowserKind,
} from '../../../utils/browser-folder';
import { AppError } from '../../../utils/http';
import { readVersion } from '../../../services/browser-fork.service';
import type { browserForkService } from '../../../services/browser-fork.service';
import type { externalBrowserService } from '../../../services/external-browser.service';
import type { SessionRepositoryPort } from '../../../application/ports/repositories/session.repository.port';
import { startProxyBridge, type ProxyBridge } from '../../../services/proxy-bridge.service';
import {
  alignFootprintVersion,
  attachFootprint,
  resolveTimezone,
  type CdpHandle,
  type Footprint,
} from '../../../services/browser-cdp.service';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('BrowserRun');

const TEMP_PREFIX = 'phantoma-chromium-';
const KILL_TIMEOUT_MS = 5000;

// Singleton* / lockfile would make Chromium think the Chrome profile is in use; cache folders are the bulk of the size and are rebuilt on demand.
// ASSUMED: the Chrome folder is only ever READ here (never rewritten), so Chrome's own Preferences / Login Data / Cookies stay byte-identical and Chrome Sync is not disturbed
const SKIP_NAMES = new Set([
  'SingletonLock',
  'SingletonCookie',
  'SingletonSocket',
  'lockfile',
  'Cache',
  'Code Cache',
  'GPUCache',
  'GrShaderCache',
  'ShaderCache',
  'DawnCache',
  'Crashpad',
  'BrowserMetrics',
  'CacheStorage',
]);

interface Run {
  emailId: string;
  browser: BrowserKind;
  child: ChildProcess;
  pid: number;
  startedAt: number;
  sessionId: string;
  tempDir: string | null;
  bridge: ProxyBridge | null;
  cdp: CdpHandle | null;
}

const view = (r: Run) => ({
  emailId: r.emailId,
  browser: r.browser,
  pid: r.pid,
  startedAt: new Date(r.startedAt).toISOString(),
  sessionId: r.sessionId,
});

const errMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

function listDir(dir: string): string {
  try {
    const names = fs.readdirSync(dir);
    return `[${names.length}] ${names.slice(0, 30).join(', ')}${names.length > 30 ? ', ...' : ''}`;
  } catch (err) {
    return `<cannot read: ${errMessage(err)}>`;
  }
}

function removeDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  } catch (err) {
    logger.warn(`Cannot remove temp folder ${dir}: ${errMessage(err)}`);
  }
}

async function cloneProfile(source: string): Promise<string> {
  const dest = await fs.promises.mkdtemp(path.join(os.tmpdir(), TEMP_PREFIX));
  if (!fs.existsSync(source)) return dest;
  try {
    await fs.promises.cp(source, dest, {
      recursive: true,
      preserveTimestamps: true,
      filter: (src) => !SKIP_NAMES.has(path.basename(src)),
    });
  } catch (err) {
    removeDir(dest);
    throw new AppError(`Cannot copy Chrome profile: ${errMessage(err)}`, 500);
  }
  return dest;
}

async function cloneRealProfile(root: string, folder: string): Promise<string> {
  const dest = await fs.promises.mkdtemp(path.join(os.tmpdir(), TEMP_PREFIX));
  const source = path.join(root, folder);
  const nested = path.join(source, 'chrome');
  try {
    const localState = path.join(root, 'Local State');
    if (fs.existsSync(localState)) {
      await fs.promises.copyFile(localState, path.join(dest, 'Local State'));
    }
    await fs.promises.cp(source, path.join(dest, folder), {
      recursive: true,
      preserveTimestamps: true,
      filter: (src) => src !== nested && !SKIP_NAMES.has(path.basename(src)),
    });
  } catch (err) {
    removeDir(dest);
    throw new AppError(`Cannot copy Chrome profile: ${errMessage(err)}`, 500);
  }
  return dest;
}

function signal(run: Run, sig: NodeJS.Signals): void {
  try {
    if (process.platform === 'win32') run.child.kill(sig);
    else process.kill(-run.pid, sig);
  } catch {
    try {
      run.child.kill(sig);
    } catch {}
  }
}

// ASSUMED: sites are read from the browser's own History DB when the run ends (before the Chromium temp folder is deleted); visits are matched to the session by time only
function collectSites(run: Run): ReturnType<typeof readSessionSites> {
  try {
    const layout = getLaunchLayout(run.emailId);
    const file = run.tempDir
      ? path.join(
          run.tempDir,
          ...(layout.isReal ? [layout.folder, 'History'] : ['Default', 'History']),
        )
      : layout.isReal
        ? path.join(layout.root, layout.folder, 'History')
        : path.join(getBrowserDir(run.emailId, 'chrome'), 'Default', 'History');
    const sites = readSessionSites(file, run.startedAt - 5000, Date.now());
    return sites;
  } catch (err) {
    logger.warn(`Cannot read sites of ${run.emailId}: ${errMessage(err)}`);
    return [];
  }
}

// ASSUMED: only what Chromium accepts as launch flags/env is applied (UA string, language, timezone, window size); navigator.platform/userAgentData, GPU/WebGL, cores and memory need JS injection — upgrade path: CDP Emulation/Page.addScriptToEvaluateOnNewDocument
function footprintLaunch(fp: unknown): { args: string[]; env: Record<string, string> } {
  const args: string[] = [];
  const env: Record<string, string> = {};
  if (!fp || typeof fp !== 'object') return { args, env };
  const f = fp as Record<string, unknown>;
  const str = (v: unknown): string => (typeof v === 'string' ? v : '');
  const lang = str(f.lang);
  if (str(f.userAgent)) args.push(`--user-agent=${str(f.userAgent)}`);
  if (lang) args.push(`--lang=${lang}`, `--accept-lang=${lang},${lang.split('-')[0]}`);
  const screen = /^(\d+)\D+(\d+)$/.exec(str(f.screen));
  if (screen) args.push(`--window-size=${screen[1]},${screen[2]}`);
  const tz = resolveTimezone(f);
  if (tz) env.TZ = tz;
  args.push('--remote-debugging-port=0', '--disable-blink-features=AutomationControlled');
  return { args, env };
}

export interface BrowserRunDeps {
  profiles: { exists: (id: string) => boolean };
  sessions: Pick<SessionRepositoryPort, 'start' | 'end'>;
  externalBrowsers: typeof externalBrowserService;
  forks: typeof browserForkService;
}

export function createBrowserRunService(deps: BrowserRunDeps) {
  const runs = new Map<string, Run>();
  const pending = new Set<string>();

function finish(run: Run): void {
  if (runs.get(run.emailId) !== run) return;
  runs.delete(run.emailId);
  try {
    if (run.sessionId) deps.sessions.end(run.emailId, run.sessionId, collectSites(run));
  } catch (err) {
    logger.warn(`Cannot close session of ${run.emailId}: ${errMessage(err)}`);
  }
  run.cdp?.close();
  run.bridge?.close();
  if (run.tempDir) removeDir(run.tempDir);
}

function requireEmail(emailId: string): void {
  if (!deps.profiles.exists(emailId)) throw new AppError('email not found', 404);
}

  return {
  list: async () => {
    const external = (await deps.externalBrowsers.scan()).filter((e) => !runs.has(e.emailId));
    return [...[...runs.values()].map(view), ...external];
  },

  launch: async (emailId: string, input: Input) => {
    requireEmail(emailId);
    if (runs.has(emailId) || pending.has(emailId)) {
      throw new AppError('browser is already running for this profile', 409);
    }
    const kind = parseBrowserKind(input.browser);
    if (
      kind === 'chrome' &&
      (await deps.externalBrowsers.scan()).some((e) => e.emailId === emailId)
    ) {
      throw new AppError(
        'browser is already running for this profile (opened outside Phantoma)',
        409,
      );
    }
    const forkExe =
      kind === 'chromium' && typeof input.forkId === 'string'
        ? deps.forks.findPath(input.forkId)
        : null;
    const exe = resolveBrowserExecutable(
      kind,
      forkExe ?? (typeof input.executablePath === 'string' ? input.executablePath : undefined),
    );
    if (!exe) throw new AppError(`${kind} executable not found`, 404);

    pending.add(emailId);
    let tempDir: string | null = null;
    let bridge: ProxyBridge | null = null;
    try {
      const masterDir = getBrowserDir(emailId, 'chrome');
      const folderInfo = getFolderInfo(emailId);
      const layout = getLaunchLayout(emailId);
      let userDataDir = layout.isReal ? layout.root : masterDir;
      const profileArgs = layout.isReal ? [`--profile-directory=${layout.folder}`] : [];
      if (kind === 'chrome') {
        if (!layout.isReal) fs.mkdirSync(masterDir, { recursive: true });
      } else {
        tempDir = layout.isReal
          ? await cloneRealProfile(layout.root, layout.folder)
          : await cloneProfile(masterDir);
        userDataDir = tempDir;
      }

      const args = [
        `--user-data-dir=${userDataDir}`,
        ...profileArgs,
        '--no-first-run',
        '--no-default-browser-check',
      ];

      if (kind === 'chromium' && typeof input.proxyServer === 'string' && input.proxyServer) {
        const up = new URL(input.proxyServer);
        const protocol = up.protocol.replace(':', '');
        if (up.username && (protocol === 'socks5' || protocol === 'http' || protocol === 'https')) {
          bridge = await startProxyBridge({
            protocol,
            host: up.hostname,
            port: Number(up.port),
            user: decodeURIComponent(up.username),
            pass: decodeURIComponent(up.password),
          });
          args.push(`--proxy-server=socks5://127.0.0.1:${bridge.port}`);
        } else {
          args.push(`--proxy-server=${input.proxyServer}`);
        }
      }
      const appliedFootprint =
        kind === 'chromium' && input.footprint && typeof input.footprint === 'object'
          ? alignFootprintVersion(input.footprint as unknown as Footprint, await readVersion(exe))
          : input.footprint;
      const fpLaunch = footprintLaunch(kind === 'chromium' ? appliedFootprint : null);
      args.push(...fpLaunch.args);
      if (kind === 'chromium' && input.forkId === 'ungoogled') {
        const extDir = path.resolve(__dirname, '../../../../extensions/FingerLen/dist');
        if (fs.existsSync(extDir)) args.push(`--load-extension=${extDir}`);
      }
      args.push(typeof input.url === 'string' && input.url ? input.url : 'chrome://newtab');
      logger.info(
        `[DEBUG] footprint applied: args=${JSON.stringify(fpLaunch.args)} env=${JSON.stringify(fpLaunch.env)}`,
      );
      const ipRecord = (input.ip && typeof input.ip === 'object' ? input.ip : {}) as Record<
        string,
        unknown
      >;
      const fpRecord = (
        input.footprint && typeof input.footprint === 'object' ? input.footprint : {}
      ) as Record<string, unknown>;
      const ipGeo = Object.fromEntries(
        Object.entries(ipRecord).filter(([k]) => /time|tz|lang|country|city|region|^ip$/i.test(k)),
      );
      logger.info(`[DEBUG] ip full=${JSON.stringify(input.ip ?? null)}`);
      logger.info(`[DEBUG] footprint full=${JSON.stringify(input.footprint ?? null)}`);
      logger.info(
        `[DEBUG] compare ip-vs-footprint: ipGeo=${JSON.stringify(ipGeo)} fp={tz:${String(fpRecord.tz)},lang:${String(fpRecord.lang)},cc:${String(fpRecord.cc)},os:${String(fpRecord.os)},ua:${String(fpRecord.userAgent)}}`,
      );
      logger.info(
        `[DEBUG] browser real: exe=${exe} kind=${kind} hostPlatform=${process.platform} hostTZ=${Intl.DateTimeFormat().resolvedOptions().timeZone} hostLang=${process.env.LANG ?? ''} spawnEnvTZ=${fpLaunch.env.TZ ?? '<unset>'} args=${JSON.stringify(args.map((a) => a.replace(/^(--proxy-server=.*:\/\/)[^@/]*@/, '$1***@')))}`,
      );

      const child = spawn(exe, args, {
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, ...fpLaunch.env },
      });
      await new Promise<void>((resolve, reject) => {
        child.once('spawn', () => resolve());
        child.once('error', reject);
      });

      const cdp =
        kind === 'chromium' && input.footprint && typeof input.footprint === 'object'
          ? attachFootprint(userDataDir, appliedFootprint as unknown as Footprint)
          : null;

      const session = deps.sessions.start(emailId, {
        browser: kind,
        ip: input.ip ?? undefined,
        footprint: input.footprint ?? undefined,
      });
      const run: Run = {
        emailId,
        browser: kind,
        child,
        pid: child.pid ?? 0,
        startedAt: Date.now(),
        sessionId: session?.id ?? '',
        tempDir,
        bridge,
        cdp,
      };
      runs.set(emailId, run);
      child.once('exit', () => finish(run));
      return view(run);
    } catch (err) {
      bridge?.close();
      if (tempDir) removeDir(tempDir);
      if (err instanceof AppError) throw err;
      throw new AppError(`Cannot launch ${kind}: ${errMessage(err)}`, 500);
    } finally {
      pending.delete(emailId);
    }
  },

  stop: async (emailId: string) => {
    const run = runs.get(emailId);
    if (!run) {
      const external = (await deps.externalBrowsers.scan()).find((e) => e.emailId === emailId);
      if (!external) throw new AppError('browser is not running', 404);
      process.kill(external.pid, 'SIGTERM');
      return external;
    }
    signal(run, 'SIGTERM');
    setTimeout(() => {
      if (runs.get(emailId) === run) signal(run, 'SIGKILL');
    }, KILL_TIMEOUT_MS).unref();
    return view(run);
  },

  // Temp folders left by a previous crash: nothing can be running yet at startup, so every match is stale
  sweepTempDirs: (): void => {
    for (const name of fs.readdirSync(os.tmpdir())) {
      if (name.startsWith(TEMP_PREFIX)) removeDir(path.join(os.tmpdir(), name));
    }
  },

  // ASSUMED: only Chromium (temp folder) is closed with the server; a running Chrome is left alone and its session is closed on its next launch — upgrade path: persist pid to re-attach
  shutdown: (): void => {
    for (const run of [...runs.values()]) {
      if (run.browser !== 'chromium') continue;
      signal(run, 'SIGTERM');
      finish(run);
    }
  },
  };
}

export type BrowserRunService = ReturnType<typeof createBrowserRunService>;
