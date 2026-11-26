/**
 * ------------------------------------------------------------------
 * Browser Update Service
 * ------------------------------------------------------------------
 * Kiểm tra bản mới, tải & cài browser fork (tar.xz → <dataDir>/binaries/<id>/).
 * Job cài đặt chạy nền; client poll `status()` để lấy tiến độ.
 * ------------------------------------------------------------------
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  EXE_NAME,
  ERROR_TTL_MS,
  FORK_DEFS,
  FORK_SOURCES,
  LATEST_TTL_MS,
  VERSION_RE,
} from '../../constants';
import { AppError } from '../../errors/app.error';
import type {
  ForkDef,
  ForkUpdateInfo,
  ForkVersion,
  InstallJob,
  LatestVersionEntry,
} from '../../types/browser.type';
import { errorMessage } from '../../utils/error.util';
import { createLogger } from '../../utils/logger.util';
import { downloadFile, fetchText } from '../../utils/network.util';
import { execFileAsync } from '../../utils/process.util';
import { compareVersions } from '../../utils/version.util';
import type { BrowserForkService } from './browser-fork.service';

const logger = createLogger('BrowserUpdate');

export class BrowserUpdateService {
  private readonly jobs = new Map<string, InstallJob>();
  private readonly latestCache = new Map<string, LatestVersionEntry>();

  constructor(private readonly forks: BrowserForkService) {}

  status(force = false): Promise<ForkUpdateInfo[]> {
    return Promise.all(FORK_DEFS.map((d) => this.buildInfo(d, force)));
  }

  async install(id: string, version?: string): Promise<ForkUpdateInfo> {
    const def = this.forks.getDef(id);
    if (!def) throw new AppError('fork not found', 404);
    if (!this.isSupported(id)) throw new AppError('this platform is not supported', 400);
    if (version !== undefined && !VERSION_RE.test(version)) {
      throw new AppError('invalid version', 400);
    }
    const running = this.jobs.get(id);
    if (running && running.phase !== 'error') return this.buildInfo(def);

    const job: InstallJob = { version: version ?? '', phase: 'checking', progress: 0, error: null };
    this.jobs.set(id, job);
    try {
      if (!version) {
        const latest = await this.getLatest(id, true);
        if (!latest.version) throw new Error(latest.error ?? 'Cannot determine the latest version');
        job.version = latest.version;
      }
      job.phase = 'downloading';
      void this.runInstall(def, job);
    } catch (err) {
      job.phase = 'error';
      job.error = errorMessage(err);
    }
    return this.buildInfo(def);
  }

  /** Chưa có build nào của fork (cả binaries dir lẫn system dirs) → cài bản mới nhất, không hỏi. */
  async autoInstallIfMissing(): Promise<void> {
    for (const def of FORK_DEFS) {
      if (!this.isSupported(def.id) || this.forks.listBuilds(def).length > 0) continue;
      await this.install(def.id);
    }
  }

  // ─── Internals ────────────────────────────────────────────────────────

  // ASSUMED: chỉ bản portable Linux x64 có nguồn tải — mở rộng: thêm Windows/macOS vào FORK_SOURCES + bước giải nén riêng
  private isSupported(id: string): boolean {
    return process.platform === 'linux' && process.arch === 'x64' && id in FORK_SOURCES;
  }

  private parseVersions(html: string): string[] {
    const found = new Set<string>();
    for (const m of html.matchAll(/href="[^"]*?(\d+\.\d+\.\d+\.\d+-\d+)\/?"/g)) found.add(m[1]);
    return [...found].sort((a, b) => compareVersions(b, a));
  }

  private async getLatest(id: string, force: boolean): Promise<LatestVersionEntry> {
    const hit = this.latestCache.get(id);
    if (hit && !force && Date.now() - hit.at < (hit.version ? LATEST_TTL_MS : ERROR_TTL_MS)) {
      return hit;
    }
    let entry: LatestVersionEntry;
    try {
      const versions = this.parseVersions(await fetchText(FORK_SOURCES[id].listUrl));
      entry = versions.length
        ? { at: Date.now(), version: versions[0], error: null }
        : { at: Date.now(), version: null, error: 'No version found on the release page' };
    } catch (err) {
      entry = { at: Date.now(), version: null, error: errorMessage(err) };
    }
    this.latestCache.set(id, entry);
    return entry;
  }

  private async buildInfo(def: ForkDef, force = false): Promise<ForkUpdateInfo> {
    const supported = this.isSupported(def.id);
    const versions = await Promise.all(
      this.forks.listBuilds(def).map(async (b, i): Promise<ForkVersion> => ({
        version: b.version ?? (await this.forks.readVersion(b.path)),
        path: b.path,
        current: i === 0,
      })),
    );
    const current = versions[0]?.version ?? null;
    const latest = supported ? await this.getLatest(def.id, force) : null;
    return {
      id: def.id,
      name: def.name,
      supported,
      versions,
      current,
      latest: latest?.version ?? null,
      hasUpdate: !!(latest?.version && (!current || compareVersions(latest.version, current) > 0)),
      checkError: latest?.error ?? null,
      job: this.jobs.get(def.id) ?? null,
    };
  }

  private async runInstall(def: ForkDef, job: InstallJob): Promise<void> {
    const root = this.forks.binariesDir(def.id);
    const finalDir = path.join(root, `${def.dirPrefix}-${job.version}`);
    const stagingDir = path.join(root, `.partial-${job.version}`);
    const tmpFile = path.join(os.tmpdir(), `${def.dirPrefix}-${job.version}.tar.xz`);
    let ok = false;
    try {
      if (!fs.existsSync(path.join(finalDir, EXE_NAME))) {
        await downloadFile(FORK_SOURCES[def.id].downloadUrl(job.version), tmpFile, (r) => {
          job.progress = r;
        });
        job.phase = 'extracting';
        fs.rmSync(stagingDir, { recursive: true, force: true });
        fs.mkdirSync(stagingDir, { recursive: true });
        await execFileAsync('tar', ['-xJf', tmpFile, '-C', stagingDir, '--strip-components=1']);
        if (!fs.existsSync(path.join(stagingDir, EXE_NAME))) {
          throw new Error('Archive has no chrome executable');
        }
        fs.rmSync(finalDir, { recursive: true, force: true });
        fs.renameSync(stagingDir, finalDir);
      }
      ok = true;
    } catch (err) {
      job.phase = 'error';
      job.error = errorMessage(err);
      logger.warn(`Install ${def.id} ${job.version} failed: ${job.error}`);
    } finally {
      fs.rmSync(tmpFile, { force: true });
      fs.rmSync(stagingDir, { recursive: true, force: true });
      if (ok) this.jobs.delete(def.id);
    }
  }
}
