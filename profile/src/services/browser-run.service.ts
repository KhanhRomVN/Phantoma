import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn, type ChildProcess } from 'child_process';
import type { Input } from '../database/sql';
import { emailRepository } from '../repositories/email.repository';
import { sessionRepository } from '../repositories/session.repository';
import {
  getBrowserDir,
  getFolderInfo,
  getLaunchLayout,
  readSessionSites,
  parseBrowserKind,
  resolveBrowserExecutable,
  type BrowserKind,
} from '../utils/browser-folder';
import { AppError } from '../utils/http';
import { browserForkService } from './browser-fork.service';
import { externalBrowserService } from './external-browser.service';
import { createLogger } from '../utils/logger';

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
}

const runs = new Map<string, Run>();
const pending = new Set<string>();

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
      ? path.join(run.tempDir, ...(layout.isReal ? [layout.folder, 'History'] : ['Default', 'History']))
      : layout.isReal
        ? path.join(layout.root, layout.folder, 'History')
        : path.join(getBrowserDir(run.emailId, 'chrome'), 'Default', 'History');
    const sites = readSessionSites(file, run.startedAt - 5000, Date.now());
    logger.info(`[sites] ${run.emailId}: ${sites.length} sites from ${file}`);
    return sites;
  } catch (err) {
    logger.warn(`Cannot read sites of ${run.emailId}: ${errMessage(err)}`);
    return [];
  }
}

function finish(run: Run): void {
  if (runs.get(run.emailId) !== run) return;
  runs.delete(run.emailId);
  try {
    if (run.sessionId) sessionRepository.end(run.emailId, run.sessionId, collectSites(run));
  } catch (err) {
    logger.warn(`Cannot close session of ${run.emailId}: ${errMessage(err)}`);
  }
  if (run.tempDir) removeDir(run.tempDir);
}

function requireEmail(emailId: string): void {
  if (!emailRepository.exists(emailId)) throw new AppError('email not found', 404);
}

export const browserRunService = {
  list: async () => {
    const external = (await externalBrowserService.scan()).filter((e) => !runs.has(e.emailId));
    return [...[...runs.values()].map(view), ...external];
  },

  launch: async (emailId: string, input: Input) => {
    requireEmail(emailId);
    if (runs.has(emailId) || pending.has(emailId)) {
      throw new AppError('browser is already running for this profile', 409);
    }
    const kind = parseBrowserKind(input.browser);
    if (kind === 'chrome' && (await externalBrowserService.scan()).some((e) => e.emailId === emailId)) {
      throw new AppError('browser is already running for this profile (opened outside Phantoma)', 409);
    }
    const forkExe =
      kind === 'chromium' && typeof input.forkId === 'string' ? browserForkService.findPath(input.forkId) : null;
    const exe = resolveBrowserExecutable(
      kind,
      forkExe ?? (typeof input.executablePath === 'string' ? input.executablePath : undefined),
    );
    if (!exe) throw new AppError(`${kind} executable not found`, 404);

    pending.add(emailId);
    let tempDir: string | null = null;
    try {
      const masterDir = getBrowserDir(emailId, 'chrome');
      const folderInfo = getFolderInfo(emailId);
      logger.info(`[launch] emailId=${emailId} kind=${kind} exe=${exe}`);
      logger.info(
        `[launch] profileDir=${folderInfo.path} exists=${folderInfo.exists} entries=${listDir(folderInfo.path)}`,
      );
      logger.info(
        `[launch] masterDir=${masterDir} exists=${fs.existsSync(masterDir)} Default=${fs.existsSync(path.join(masterDir, 'Default'))} LocalState=${fs.existsSync(path.join(masterDir, 'Local State'))} entries=${listDir(masterDir)}`,
      );
      const layout = getLaunchLayout(emailId);
      logger.info(
        `[launch] layout root=${layout.root} folder=${layout.folder} realUserDataDir=${layout.isReal}`,
      );
      let userDataDir = layout.isReal ? layout.root : masterDir;
      const profileArgs = layout.isReal ? [`--profile-directory=${layout.folder}`] : [];
      if (kind === 'chrome') {
        if (!layout.isReal) fs.mkdirSync(masterDir, { recursive: true });
      } else {
        tempDir = layout.isReal
          ? await cloneRealProfile(layout.root, layout.folder)
          : await cloneProfile(masterDir);
        userDataDir = tempDir;
        logger.info(
          `[launch] cloned ${masterDir} -> ${tempDir} entries=${listDir(tempDir)} Default=${fs.existsSync(path.join(tempDir, 'Default'))}`,
        );
      }

      const args = [
        `--user-data-dir=${userDataDir}`,
        ...profileArgs,
        '--no-first-run',
        '--no-default-browser-check',
      ];
      if (kind === 'chromium' && typeof input.proxyServer === 'string' && input.proxyServer) {
        args.push(`--proxy-server=${input.proxyServer}`);
      }
      args.push(typeof input.url === 'string' && input.url ? input.url : 'chrome://newtab');

      logger.info(`[launch] spawn: ${exe} ${args.join(' ')}`);
      const t0 = Date.now();
      const child = spawn(exe, args, { detached: true, stdio: ['ignore', 'ignore', 'pipe'] });
      child.stderr?.on('data', (d: Buffer) =>
        logger.info(`[${kind}:${emailId}] stderr: ${d.toString().trim().slice(0, 500)}`),
      );
      child.once('exit', (code, sig) =>
        logger.info(
          `[launch] ${kind} process exited code=${code} signal=${sig} after ${Date.now() - t0}ms`,
        ),
      );
      await new Promise<void>((resolve, reject) => {
        child.once('spawn', () => resolve());
        child.once('error', reject);
      });

      const session = sessionRepository.start(emailId, {
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
      };
      runs.set(emailId, run);
      child.once('exit', () => finish(run));
      logger.info(`Launched ${kind} for ${emailId} (pid ${run.pid})`);
      return view(run);
    } catch (err) {
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
      const external = (await externalBrowserService.scan()).find((e) => e.emailId === emailId);
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
