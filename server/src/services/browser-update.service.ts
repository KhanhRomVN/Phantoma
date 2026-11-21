import fs from 'fs';
import os from 'os';
import path from 'path';
import https from 'https';
import type { IncomingMessage } from 'http';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { pipeline } from 'stream/promises';
import {
  EXE_NAME,
  FORK_DEFS,
  binariesDir,
  getForkDef,
  listBuilds,
  readVersion,
  type ForkDef,
} from './browser-fork.service';
import { AppError } from '../utils/api-error';
import { createLogger } from '../utils/logger';
import { compareVersions } from '../utils/version';

const logger = createLogger('BrowserUpdate');
const execFileAsync = promisify(execFile);

const LATEST_TTL_MS = 10 * 60 * 1000;
const ERROR_TTL_MS = 60 * 1000;
const VERSION_RE = /^\d+\.\d+\.\d+\.\d+-\d+$/;

interface ForkSource {
  listUrl: string;
  downloadUrl: (version: string) => string;
}

// Adding a downloadable fork = adding one entry here (same id as in FORK_DEFS)
const SOURCES: Record<string, ForkSource> = {
  ungoogled: {
    listUrl: 'https://ungoogled-software.github.io/ungoogled-chromium-binaries/releases/linux_portable/64bit/',
    downloadUrl: (v) =>
      `https://github.com/ungoogled-software/ungoogled-chromium-portablelinux/releases/download/${v}/ungoogled-chromium-${v}-x86_64_linux.tar.xz`,
  },
};

export type InstallPhase = 'checking' | 'downloading' | 'extracting' | 'error';

export interface InstallJob {
  version: string;
  phase: InstallPhase;
  progress: number;
  error: string | null;
}

export interface ForkVersion {
  version: string | null;
  path: string;
  current: boolean;
}

export interface ForkUpdateInfo {
  id: string;
  name: string;
  supported: boolean;
  versions: ForkVersion[];
  current: string | null;
  latest: string | null;
  hasUpdate: boolean;
  checkError: string | null;
  job: InstallJob | null;
}

interface LatestEntry {
  at: number;
  version: string | null;
  error: string | null;
}

const jobs = new Map<string, InstallJob>();
const latestCache = new Map<string, LatestEntry>();

const errMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

// ASSUMED: only the Linux x64 portable build has a known source — upgrade path: add Windows/macOS entries to SOURCES with their own extract step
const isSupported = (id: string): boolean =>
  process.platform === 'linux' && process.arch === 'x64' && id in SOURCES;

function request(url: string, redirects = 5): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          if (redirects <= 0) return reject(new Error('Too many redirects'));
          return resolve(request(new URL(res.headers.location, url).href, redirects - 1));
        }
        if (status !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${status}`));
        }
        resolve(res);
      })
      .on('error', reject);
  });
}

async function fetchText(url: string): Promise<string> {
  const res = await request(url);
  res.setEncoding('utf8');
  let data = '';
  for await (const chunk of res) data += chunk;
  return data;
}

async function downloadFile(url: string, dest: string, onProgress: (ratio: number) => void): Promise<void> {
  const res = await request(url);
  const total = Number(res.headers['content-length']) || 0;
  let received = 0;
  res.on('data', (chunk: Buffer) => {
    received += chunk.length;
    if (total) onProgress(received / total);
  });
  await pipeline(res, fs.createWriteStream(dest));
}

function parseVersions(html: string): string[] {
  const found = new Set<string>();
  for (const m of html.matchAll(/href="[^"]*?(\d+\.\d+\.\d+\.\d+-\d+)\/?"/g)) found.add(m[1]);
  return [...found].sort((a, b) => compareVersions(b, a));
}

async function getLatest(id: string, force: boolean): Promise<LatestEntry> {
  const hit = latestCache.get(id);
  if (hit && !force && Date.now() - hit.at < (hit.version ? LATEST_TTL_MS : ERROR_TTL_MS)) return hit;
  let entry: LatestEntry;
  try {
    const versions = parseVersions(await fetchText(SOURCES[id].listUrl));
    entry = versions.length
      ? { at: Date.now(), version: versions[0], error: null }
      : { at: Date.now(), version: null, error: 'No version found on the release page' };
  } catch (err) {
    entry = { at: Date.now(), version: null, error: errMessage(err) };
  }
  latestCache.set(id, entry);
  return entry;
}

async function buildInfo(def: ForkDef, force = false): Promise<ForkUpdateInfo> {
  const supported = isSupported(def.id);
  const versions = await Promise.all(
    listBuilds(def).map(async (b, i): Promise<ForkVersion> => ({
      version: b.version ?? (await readVersion(b.path)),
      path: b.path,
      current: i === 0,
    })),
  );
  const current = versions[0]?.version ?? null;
  const latest = supported ? await getLatest(def.id, force) : null;
  return {
    id: def.id,
    name: def.name,
    supported,
    versions,
    current,
    latest: latest?.version ?? null,
    hasUpdate: !!(latest?.version && (!current || compareVersions(latest.version, current) > 0)),
    checkError: latest?.error ?? null,
    job: jobs.get(def.id) ?? null,
  };
}

async function runInstall(def: ForkDef, job: InstallJob): Promise<void> {
  const root = binariesDir(def.id);
  const finalDir = path.join(root, `${def.dirPrefix}-${job.version}`);
  const stagingDir = path.join(root, `.partial-${job.version}`);
  const tmpFile = path.join(os.tmpdir(), `${def.dirPrefix}-${job.version}.tar.xz`);
  let ok = false;
  try {
    if (!fs.existsSync(path.join(finalDir, EXE_NAME))) {
      logger.info(`Downloading ${def.id} ${job.version}`);
      await downloadFile(SOURCES[def.id].downloadUrl(job.version), tmpFile, (r) => (job.progress = r));
      job.phase = 'extracting';
      fs.rmSync(stagingDir, { recursive: true, force: true });
      fs.mkdirSync(stagingDir, { recursive: true });
      await execFileAsync('tar', ['-xJf', tmpFile, '-C', stagingDir, '--strip-components=1']);
      if (!fs.existsSync(path.join(stagingDir, EXE_NAME))) throw new Error('Archive has no chrome executable');
      fs.rmSync(finalDir, { recursive: true, force: true });
      fs.renameSync(stagingDir, finalDir);
    }
    ok = true;
    logger.info(`Installed ${def.id} ${job.version} -> ${finalDir}`);
  } catch (err) {
    job.phase = 'error';
    job.error = errMessage(err);
    logger.warn(`Install ${def.id} ${job.version} failed: ${job.error}`);
  } finally {
    fs.rmSync(tmpFile, { force: true });
    fs.rmSync(stagingDir, { recursive: true, force: true });
    if (ok) jobs.delete(def.id);
  }
}

export const browserUpdateService = {
  status: (force = false): Promise<ForkUpdateInfo[]> => Promise.all(FORK_DEFS.map((d) => buildInfo(d, force))),

  install: async (id: string, version?: string): Promise<ForkUpdateInfo> => {
    const def = getForkDef(id);
    if (!def) throw new AppError('fork not found', 404);
    if (!isSupported(id)) throw new AppError('this platform is not supported', 400);
    if (version !== undefined && !VERSION_RE.test(version)) throw new AppError('invalid version', 400);
    const running = jobs.get(id);
    if (running && running.phase !== 'error') return buildInfo(def);

    const job: InstallJob = { version: version ?? '', phase: 'checking', progress: 0, error: null };
    jobs.set(id, job);
    try {
      if (!version) {
        const latest = await getLatest(id, true);
        if (!latest.version) throw new Error(latest.error ?? 'Cannot determine the latest version');
        job.version = latest.version;
      }
      job.phase = 'downloading';
      void runInstall(def, job);
    } catch (err) {
      job.phase = 'error';
      job.error = errMessage(err);
    }
    return buildInfo(def);
  },

  // No build of a fork anywhere (binaries dir or system dirs) -> install the latest without asking
  autoInstallIfMissing: async (): Promise<void> => {
    for (const def of FORK_DEFS) {
      if (!isSupported(def.id) || listBuilds(def).length > 0) continue;
      logger.info(`No ${def.id} build found, installing the latest automatically`);
      await browserUpdateService.install(def.id);
    }
  },
};