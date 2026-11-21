import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { getConfig } from '../config/server.config';
import { compareVersions } from '../utils/version';

export interface ForkDef {
  id: string;
  name: string;
  desc: string;
  badge: string;
  tone: string;
  url: string;
  dirPrefix: string;
  systemDirs: string[];
}

export interface BrowserFork {
  id: string;
  name: string;
  desc: string;
  badge: string;
  tone: string;
  url: string;
  version: string | null;
  path: string | null;
  installed: boolean;
}

export interface InstalledBuild {
  version: string | null;
  path: string;
}

// Adding a fork = adding one entry here; binaries are looked up in <dataDir>/binaries/<id>/<dirPrefix>-<version>/ and systemDirs (newest version wins)
export const FORK_DEFS: ForkDef[] = [
  {
    id: 'ungoogled',
    name: 'Ungoogled Chromium',
    desc: 'Chromium without Google services, privacy first',
    badge: 'Privacy',
    tone: 'success',
    url: 'https://ungoogled-software.github.io/',
    dirPrefix: 'ungoogled-chromium',
    systemDirs: ['/opt/ungoogled-chromium'],
  },
];

export const EXE_NAME = process.platform === 'win32' ? 'chrome.exe' : 'chrome';

export function binariesDir(id: string): string {
  return path.join(getConfig().dataDir, 'binaries', id);
}

export const getForkDef = (id: string): ForkDef | undefined => FORK_DEFS.find((f) => f.id === id);

function dirVersion(name: string, prefix: string): string | null {
  return /^(\d+\.\d+\.\d+\.\d+(?:-\d+)?)/.exec(name.slice(prefix.length + 1))?.[1] ?? null;
}

function scanRoot(root: string, prefix: string): InstalledBuild[] {
  if (!fs.existsSync(root)) return [];
  const builds: InstalledBuild[] = [];
  const direct = path.join(root, EXE_NAME);
  if (fs.existsSync(direct)) builds.push({ version: null, path: direct });
  try {
    for (const name of fs.readdirSync(root)) {
      if (!name.startsWith(`${prefix}-`)) continue;
      const exe = path.join(root, name, EXE_NAME);
      if (fs.existsSync(exe)) builds.push({ version: dirVersion(name, prefix), path: exe });
    }
  } catch {}
  return builds;
}

export function listBuilds(def: ForkDef): InstalledBuild[] {
  return [binariesDir(def.id), ...def.systemDirs]
    .flatMap((root) => scanRoot(root, def.dirPrefix))
    .sort((a, b) => compareVersions(b.version ?? '0', a.version ?? '0'));
}

function locate(def: ForkDef): string | null {
  return listBuilds(def)[0]?.path ?? null;
}

export function readVersion(exe: string): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(exe, ['--version'], { timeout: 4000, windowsHide: true }, (err, stdout) => {
      if (err) return resolve(null);
      resolve(/(\d+\.\d+\.\d+\.\d+)/.exec(stdout)?.[1] ?? null);
    });
  });
}

export const browserForkService = {
  findPath: (id: string): string | null => {
    const def = getForkDef(id);
    return def ? locate(def) : null;
  },

  list: (): Promise<BrowserFork[]> =>
    Promise.all(
      FORK_DEFS.map(async (def): Promise<BrowserFork> => {
        const exe = locate(def);
        const { dirPrefix: _p, systemDirs: _s, ...meta } = def;
        return { ...meta, path: exe, installed: exe !== null, version: exe ? await readVersion(exe) : null };
      }),
    ),
};