import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { emailRepository } from '../repositories/email.repository';
import { getBrowserDir, getLaunchLayout, type BrowserKind } from '../utils/browser-folder';

const SEP = '\u0001';
const CACHE_MS = 1500;

export interface ExternalBrowser {
  emailId: string;
  browser: BrowserKind;
  pid: number;
  startedAt: string;
  sessionId: string;
  external: true;
}

interface Proc {
  pid: number;
  args: string;
}

interface Target {
  emailId: string;
  dir: string;
  profile: string | null;
}

const seenAt = new Map<number, number>();
let cache: { at: number; list: ExternalBrowser[] } | null = null;
let inflight: Promise<ExternalBrowser[]> | null = null;

const norm = (p: string): string => {
  const resolved = path.resolve(p);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
};

function execText(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve) => {
    execFile(cmd, args, { maxBuffer: 32 * 1024 * 1024, windowsHide: true }, (err, stdout) =>
      resolve(err ? '' : stdout),
    );
  });
}

function parseLines(text: string, pattern: RegExp): Proc[] {
  const out: Proc[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.trim().match(pattern);
    if (m && /chrom/i.test(m[2])) out.push({ pid: Number(m[1]), args: m[2] });
  }
  return out;
}

async function listProcesses(): Promise<Proc[]> {
  if (process.platform === 'linux') {
    let names: string[] = [];
    try {
      names = await fs.promises.readdir('/proc');
    } catch {
      return [];
    }
    const out: Proc[] = [];
    await Promise.all(
      names
        .filter((n) => /^\d+$/.test(n))
        .map(async (n) => {
          try {
            const raw = await fs.promises.readFile(`/proc/${n}/cmdline`, 'utf8');
            if (raw.includes('chrom')) out.push({ pid: Number(n), args: raw.split('\0').filter(Boolean).join(SEP) });
          } catch {
            return;
          }
        }),
    );
    return out;
  }
  if (process.platform === 'win32') {
    const text = await execText('powershell', [
      '-NoProfile',
      '-Command',
      "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | ForEach-Object { \"$($_.ProcessId)`t$($_.CommandLine)\" }",
    ]);
    return parseLines(text, /^(\d+)\t(.*)$/);
  }
  return parseLines(await execText('ps', ['-axo', 'pid=,args=']), /^(\d+)\s+(.*)$/);
}

function flag(args: string, name: string): string | null {
  if (args.includes(SEP)) {
    const hit = args.split(SEP).find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : null;
  }
  const m = args.match(new RegExp(`--${name}=(?:"([^"]*)"|(.*?))(?=\\s--[a-z]|$)`));
  return m ? (m[1] ?? m[2]).trim() : null;
}

function defaultUserDataDir(): string {
  const home = os.homedir();
  if (process.platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local'), 'Google', 'Chrome', 'User Data');
  }
  if (process.platform === 'darwin') return path.join(home, 'Library', 'Application Support', 'Google', 'Chrome');
  return path.join(home, '.config', 'google-chrome');
}

// ASSUMED: Chrome keeps the profiles that currently have a window in Local State > profile.last_active_profiles; one main process serves all of them
function lastActiveProfiles(dir: string): string[] {
  try {
    const state = JSON.parse(fs.readFileSync(path.join(dir, 'Local State'), 'utf8'));
    const list = state?.profile?.last_active_profiles;
    return Array.isArray(list) ? list.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function buildTargets(): Target[] {
  return emailRepository.listIdsBySource().map((emailId) => {
    const layout = getLaunchLayout(emailId);
    return layout.isReal
      ? { emailId, dir: norm(layout.root), profile: layout.folder }
      : { emailId, dir: norm(getBrowserDir(emailId, 'chrome')), profile: null };
  });
}

// ASSUMED: only the main browser process (no --type=) launched with --user-data-dir / --profile-directory is matched; a profile opened later from inside a running Chrome window is not seen — upgrade path: read the user-data-dir lock / Local State last_active_profiles
async function detect(): Promise<ExternalBrowser[]> {
  const targets = buildTargets();
  if (targets.length === 0) return [];
  const found = new Map<string, ExternalBrowser>();
  const now = Date.now();
  const alive = new Set<number>();
  for (const proc of await listProcesses()) {
    if (flag(proc.args, 'type') !== null) continue;
    const dir = norm(flag(proc.args, 'user-data-dir') ?? defaultUserDataDir());
    const flagged = flag(proc.args, 'profile-directory');
    const open = lastActiveProfiles(dir);
    for (const t of targets) {
      if (t.dir !== dir || found.has(t.emailId)) continue;
      const on =
        t.profile === null ||
        t.profile === flagged ||
        (flagged === null && open.includes(t.profile)) ||
        (!flagged && open.length === 0 && t.profile === 'Default');
      if (!on) continue;
      alive.add(proc.pid);
      if (!seenAt.has(proc.pid)) seenAt.set(proc.pid, now);
      found.set(t.emailId, {
        emailId: t.emailId,
        browser: 'chrome',
        pid: proc.pid,
        startedAt: new Date(seenAt.get(proc.pid) ?? now).toISOString(),
        sessionId: '',
        external: true,
      });
    }
  }
  for (const pid of [...seenAt.keys()]) if (!alive.has(pid)) seenAt.delete(pid);
  return [...found.values()];
}

export const externalBrowserService = {
  scan: (): Promise<ExternalBrowser[]> => {
    if (cache && Date.now() - cache.at < CACHE_MS) return Promise.resolve(cache.list);
    if (inflight) return inflight;
    inflight = detect()
      .then((list) => {
        cache = { at: Date.now(), list };
        return list;
      })
      .catch(() => [] as ExternalBrowser[])
      .finally(() => {
        inflight = null;
      });
    return inflight;
  },
};