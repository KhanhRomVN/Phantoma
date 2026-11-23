/**
 * ------------------------------------------------------------------
 * Browser Fork Service
 * ------------------------------------------------------------------
 * Tìm các bản build browser fork đã cài (trong <dataDir>/binaries/<id>/
 * và các thư mục hệ thống), đọc version và trả về bản mới nhất.
 * ------------------------------------------------------------------
 */

import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { EXE_NAME, FORK_DEFS } from '../../constants';
import type { BrowserFork, ForkDef, InstalledBuild } from '../../types/browser.type';
import { compareVersions } from '../../utils/version.util';

export class BrowserForkService {
  constructor(private readonly dataDir: string) {}

  /** Thư mục chứa các bản build tải về của 1 fork. */
  binariesDir(id: string): string {
    return path.join(this.dataDir, 'binaries', id);
  }

  getDef(id: string): ForkDef | undefined {
    return FORK_DEFS.find((f) => f.id === id);
  }

  /** Tất cả build tìm thấy, mới nhất đứng đầu. */
  listBuilds(def: ForkDef): InstalledBuild[] {
    return [this.binariesDir(def.id), ...def.systemDirs]
      .flatMap((root) => this.scanRoot(root, def.dirPrefix))
      .sort((a, b) => compareVersions(b.version ?? '0', a.version ?? '0'));
  }

  findPath(id: string): string | null {
    const def = this.getDef(id);
    return def ? this.locate(def) : null;
  }

  list(): Promise<BrowserFork[]> {
    return Promise.all(
      FORK_DEFS.map(async (def): Promise<BrowserFork> => {
        const exe = this.locate(def);
        const { dirPrefix: _p, systemDirs: _s, ...meta } = def;
        return {
          ...meta,
          path: exe,
          installed: exe !== null,
          version: exe ? await this.readVersion(exe) : null,
        };
      }),
    );
  }

  readVersion(exe: string): Promise<string | null> {
    return new Promise((resolve) => {
      execFile(exe, ['--version'], { timeout: 4000, windowsHide: true }, (err, stdout) => {
        if (err) return resolve(null);
        resolve(/(\d+\.\d+\.\d+\.\d+)/.exec(stdout)?.[1] ?? null);
      });
    });
  }

  // ─── Internals ────────────────────────────────────────────────────────

  private locate(def: ForkDef): string | null {
    return this.listBuilds(def)[0]?.path ?? null;
  }

  private dirVersion(name: string, prefix: string): string | null {
    return /^(\d+\.\d+\.\d+\.\d+(?:-\d+)?)/.exec(name.slice(prefix.length + 1))?.[1] ?? null;
  }

  private scanRoot(root: string, prefix: string): InstalledBuild[] {
    if (!fs.existsSync(root)) return [];
    const builds: InstalledBuild[] = [];
    const direct = path.join(root, EXE_NAME);
    if (fs.existsSync(direct)) builds.push({ version: null, path: direct });
    try {
      for (const name of fs.readdirSync(root)) {
        if (!name.startsWith(`${prefix}-`)) continue;
        const exe = path.join(root, name, EXE_NAME);
        if (fs.existsSync(exe)) builds.push({ version: this.dirVersion(name, prefix), path: exe });
      }
    } catch {
      // thư mục không đọc được → bỏ qua
    }
    return builds;
  }
}
