import fs from 'fs';
import os from 'os';
import path from 'path';
import BetterSqlite3 from 'better-sqlite3';
import { getConfig } from '../config/server.config';
import { getDb } from '../database/connection';
import { AppError, newId } from './http';
import { createLogger } from './logger';

const log = createLogger('history');

export type BrowserKind = 'chrome' | 'chromium';
export const BROWSER_KINDS: BrowserKind[] = ['chrome', 'chromium'];

const CHROME_EPOCH_MS = 11644473600000;
const PASSWORDS_DB = 'passwords.db';
const FP_HISTORY_DB = 'fp-ip-history.db';

const SYSTEM_BROWSER_PATHS: Record<BrowserKind, string[]> = {
  chrome: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/snap/bin/google-chrome'],
  chromium: ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium'],
};

export function parseBrowserKind(value: unknown, fallback: BrowserKind = 'chrome'): BrowserKind {
  if (value === undefined || value === '') return fallback;
  if (value === 'chrome' || value === 'chromium') return value;
  throw new AppError('browser must be chrome or chromium', 400);
}

// ─── Paths ──────────────────────────────────────────────────────────────

function assertSafeId(profileId: string): void {
  if (
    !profileId ||
    profileId.includes('/') ||
    profileId.includes('\\') ||
    profileId.includes('..')
  ) {
    throw new AppError('invalid profile id', 400);
  }
}

// An email lives in its Chrome profile folder: <source path>/<folder>/. Its id is base64url("<sourceId>\n<folder>").
export function toEmailId(sourceId: string, folder: string): string {
  return Buffer.from(`${sourceId}\n${folder}`).toString('base64url');
}

export function fromEmailId(emailId: string): { sourceId: string; folder: string } | null {
  const [sourceId, folder, extra] = Buffer.from(emailId, 'base64url').toString('utf8').split('\n');
  return sourceId && folder && extra === undefined ? { sourceId, folder } : null;
}

export function getProfileDir(profileId: string): string {
  const ref = fromEmailId(profileId);
  if (!ref) throw new AppError('invalid profile id', 400);
  assertSafeId(ref.folder);
  const source = getDb().prepare('SELECT path FROM sources WHERE id = ?').get(ref.sourceId) as { path: string } | undefined;
  if (!source) throw new AppError('source not found', 404);
  return path.join(source.path, ref.folder);
}

export function getBrowserDir(profileId: string, kind: BrowserKind): string {
  return path.join(getProfileDir(profileId), kind);
}

// ASSUMED: a source whose path holds "Local State" is a real Chrome user-data-dir and the email folder is one of its profile directories (launch with --profile-directory); otherwise the folder is a standalone user-data-dir holding chrome/ and chromium/
export function getLaunchLayout(profileId: string): {
  root: string;
  folder: string;
  isReal: boolean;
} {
  const profileDir = getProfileDir(profileId);
  const root = path.dirname(profileDir);
  return {
    root,
    folder: path.basename(profileDir),
    isReal: fs.existsSync(path.join(root, 'Local State')),
  };
}

function safeFolderName(name: string): string {
  const cleaned = name.trim().replace(/[\\/:*?"<>|]/g, '_');
  if (!cleaned || cleaned === '.' || cleaned === '..')
    throw new AppError('invalid profile folder name', 400);
  return cleaned;
}

// ASSUMED: a location containing "Local State" is a real Chrome user-data-dir, whose profile folders Chrome manages itself
export function provisionProfileFolder(
  location: string | null | undefined,
  email: string,
  existing?: string | null,
): string | null {
  if (existing || !location || !path.isAbsolute(location)) return null;
  if (fs.existsSync(path.join(location, 'Local State'))) return null;
  const name = safeFolderName(email);
  fs.mkdirSync(path.join(location, name), { recursive: true });
  return name;
}

export function removeProfileFolder(
  location: string | null | undefined,
  folder: string | null | undefined,
): void {
  if (!location || !folder) return;
  const root = path.resolve(location);
  const target = path.resolve(root, folder);
  if (path.dirname(target) !== root) return;
  try {
    fs.rmSync(target, { recursive: true, force: true });
  } catch (err) {
    throw new AppError(
      `Cannot delete folder ${target}: ${err instanceof Error ? err.message : String(err)}`,
      500,
    );
  }
}

export function isChromeRoot(location: string | null | undefined): boolean {
  return !!location && fs.existsSync(path.join(location, 'Local State'));
}

export function folderNameFor(email: string): string {
  return safeFolderName(email);
}

export function pickFreeFolder(location: string, wanted: string, reserved: Set<string>): string {
  let name = wanted;
  for (let i = 2; fs.existsSync(path.join(location, name)) || reserved.has(name.toLowerCase()); i++) {
    name = `${wanted} (${i})`;
  }
  return name;
}

const BROWSER_LOCK_FILES = new Set(['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile']);

export function copyProfileFolder(fromDir: string, toDir: string): void {
  fs.cpSync(fromDir, toDir, {
    recursive: true,
    force: false,
    errorOnExist: true,
    filter: (src) => !BROWSER_LOCK_FILES.has(path.basename(src)),
  });
}

export function moveProfileFolder(fromDir: string, toDir: string): void {
  try {
    fs.renameSync(fromDir, toDir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EXDEV') throw err;
    try {
      copyProfileFolder(fromDir, toDir);
    } catch (copyErr) {
      fs.rmSync(toDir, { recursive: true, force: true });
      throw copyErr;
    }
    fs.rmSync(fromDir, { recursive: true, force: true });
  }
}

const APP_FILES = ['email.json', 'service_email.sql', 'vault.sql', 'services.db', 'session.sql'];

const isAppFile = (name: string): boolean => APP_FILES.some((f) => name === f || name.startsWith(`${f}-`));

export function nextChromeProfileName(root: string, reserved: Set<string>): string {
  let max = 0;
  for (const e of fs.readdirSync(root, { withFileTypes: true })) {
    const m = /^Profile (\d+)$/.exec(e.name);
    if (e.isDirectory() && m) max = Math.max(max, Number(m[1]));
  }
  let n = max + 1;
  while (reserved.has(`profile ${n}`)) n++;
  return `Profile ${n}`;
}

export function isChromeBusy(root: string): boolean {
  try {
    const link = fs.readlinkSync(path.join(root, 'SingletonLock'));
    const pid = Number(link.split('-').pop());
    if (!Number.isInteger(pid) || pid <= 0) return true;
    try {
      process.kill(pid, 0);
      return true;
    } catch (err) {
      return (err as NodeJS.ErrnoException).code === 'EPERM';
    }
  } catch {
    return false;
  }
}

// ASSUMED: on Linux a profile folder is in use when a chrome process holds an open file inside it; null = cannot tell, so every folder counts as in use
export function activeChromeFolders(root: string): Set<string> | null {
  if (!isChromeBusy(root)) return new Set();
  if (process.platform !== 'linux') return null;
  const prefix = path.resolve(root) + path.sep;
  const active = new Set<string>();
  try {
    for (const pid of fs.readdirSync('/proc')) {
      if (!/^\d+$/.test(pid)) continue;
      let comm = '';
      try {
        comm = fs.readFileSync(`/proc/${pid}/comm`, 'utf8').trim();
      } catch {
        continue;
      }
      if (!/chrom/i.test(comm)) continue;
      let fds: string[] = [];
      try {
        fds = fs.readdirSync(`/proc/${pid}/fd`);
      } catch {
        continue;
      }
      for (const fd of fds) {
        try {
          const target = fs.readlinkSync(`/proc/${pid}/fd/${fd}`);
          if (!target.startsWith(prefix)) continue;
          const folder = target.slice(prefix.length).split(path.sep)[0];
          if (folder) active.add(folder);
        } catch {
          continue;
        }
      }
    }
  } catch {
    return null;
  }
  return active;
}

export interface TransferHooks {
  onBytes?: (n: number) => void;
  isCancelled?: () => boolean;
}

export class TransferCancelled extends Error {
  constructor() {
    super('Transfer cancelled');
  }
}

const COPY_CHUNK = 1024 * 1024;

// ASSUMED: cross-layout transfers copy only part of the folder, so the measured size is an upper bound and the caller tops progress up when an item finishes
export async function measureFolder(root: string, folder: string, isCancelled?: () => boolean): Promise<number> {
  const walk = async (dir: string): Promise<number> => {
    let total = 0;
    let entries: fs.Dirent[] = [];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return 0;
    }
    for (const entry of entries) {
      if (isCancelled?.()) throw new TransferCancelled();
      if (BROWSER_LOCK_FILES.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) total += await walk(full);
      else if (entry.isFile()) total += await fs.promises.stat(full).then((s) => s.size, () => 0);
    }
    return total;
  };
  return walk(path.join(root, folder));
}

async function copyFileProgress(from: string, to: string, hooks: TransferHooks): Promise<void> {
  const src = await fs.promises.open(from, 'r');
  try {
    const { mode } = await src.stat();
    const dst = await fs.promises.open(to, 'wx', mode);
    try {
      const buffer = Buffer.allocUnsafe(COPY_CHUNK);
      for (;;) {
        if (hooks.isCancelled?.()) throw new TransferCancelled();
        const { bytesRead } = await src.read(buffer, 0, COPY_CHUNK, null);
        if (bytesRead === 0) break;
        await dst.write(buffer, 0, bytesRead);
        hooks.onBytes?.(bytesRead);
      }
    } finally {
      await dst.close();
    }
  } finally {
    await src.close();
  }
}

async function copyTreeProgress(from: string, to: string, hooks: TransferHooks): Promise<void> {
  const info = await fs.promises.lstat(from);
  if (info.isSymbolicLink()) {
    await fs.promises.symlink(await fs.promises.readlink(from), to);
    return;
  }
  if (info.isDirectory()) {
    await fs.promises.mkdir(to, { recursive: true });
    for (const name of await fs.promises.readdir(from)) {
      if (BROWSER_LOCK_FILES.has(name)) continue;
      await copyTreeProgress(path.join(from, name), path.join(to, name), hooks);
    }
    return;
  }
  if (info.isFile()) await copyFileProgress(from, to, hooks);
}

// ASSUMED: a Chrome user-data-dir keeps browser files directly in <root>/<folder>/, while a standalone source keeps them in <folder>/chrome/Default/ next to the app files (email.json, *.sql)
export async function transferProfileFolder(
  mode: 'move' | 'duplicate',
  from: { root: string; folder: string },
  to: { root: string; folder: string },
  hooks: TransferHooks = {},
): Promise<void> {
  const src = path.join(from.root, from.folder);
  const dst = path.join(to.root, to.folder);
  if (fs.existsSync(dst)) throw new AppError(`Destination folder already exists: ${to.folder}`, 409);
  const fromReal = isChromeRoot(from.root);
  const toReal = isChromeRoot(to.root);
  const discard = (): void => fs.rmSync(dst, { recursive: true, force: true });
  if (fromReal === toReal) {
    if (mode === 'move') {
      try {
        fs.renameSync(src, dst);
        return;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'EXDEV') throw err;
      }
    }
    try {
      await copyTreeProgress(src, dst, hooks);
    } catch (err) {
      discard();
      throw err;
    }
    if (mode === 'move') fs.rmSync(src, { recursive: true, force: true });
    return;
  }
  try {
    await fs.promises.mkdir(dst, { recursive: true });
    if (fromReal) {
      const chromeDefault = path.join(dst, 'chrome', 'Default');
      await fs.promises.mkdir(chromeDefault, { recursive: true });
      for (const name of fs.readdirSync(src)) {
        await copyTreeProgress(path.join(src, name), path.join(isAppFile(name) ? dst : chromeDefault, name), hooks);
      }
    } else {
      const chromeDefault = path.join(src, 'chrome', 'Default');
      if (fs.existsSync(chromeDefault)) {
        for (const name of fs.readdirSync(chromeDefault)) {
          await copyTreeProgress(path.join(chromeDefault, name), path.join(dst, name), hooks);
        }
      }
      for (const name of fs.readdirSync(src)) {
        if (isAppFile(name)) await copyTreeProgress(path.join(src, name), path.join(dst, name), hooks);
      }
    }
  } catch (err) {
    discard();
    throw err;
  }
  if (mode === 'move') fs.rmSync(src, { recursive: true, force: true });
}

export function resolveSharedDataDir(anyProfilePath: string): string {
  const normalized = path.normalize(anyProfilePath);
  const last = path.basename(normalized).toLowerCase();
  return (BROWSER_KINDS as string[]).includes(last) ? path.dirname(normalized) : normalized;
}

// ─── Folder info (read-only) ────────────────────────────────────────────

export function getFolderInfo(profileId: string) {
  const base = getProfileDir(profileId);
  const exists = fs.existsSync(base);
  const browsers = {} as Record<BrowserKind, { path: string; exists: boolean; launched: boolean }>;
  for (const kind of BROWSER_KINDS) {
    const dir = path.join(base, kind);
    browsers[kind] = {
      path: dir,
      exists: fs.existsSync(dir),
      launched: fs.existsSync(path.join(dir, 'Default')),
    };
  }
  const layout = getLaunchLayout(profileId);
  const launch = layout.isReal
    ? { userDataDir: layout.root, profileDirectory: layout.folder }
    : { userDataDir: path.join(base, 'chrome'), profileDirectory: null as string | null };
  return { path: base, exists, browsers, launch };
}

export function resolveBrowserExecutable(kind: BrowserKind, customPath?: string): string | null {
  if (customPath && fs.existsSync(customPath)) return customPath;
  if (kind === 'chromium') {
    const opt = '/opt/ungoogled-chromium/chrome';
    if (fs.existsSync(opt)) return opt;
  }
  return SYSTEM_BROWSER_PATHS[kind].find((p) => fs.existsSync(p)) ?? null;
}

export interface SessionSite {
  url: string;
  host: string;
  title: string;
  visits: number;
  durationSec: number;
  firstAt: string;
  lastAt: string;
}

const MAX_SESSION_SITES = 500;

// One entry per URL visited inside [fromMs, toMs], with the first/last visit time and total time spent (Chrome's visit_duration, microseconds)
export function readSessionSites(historyFile: string, fromMs: number, toMs: number): SessionSite[] {
  if (!fs.existsSync(historyFile)) return [];
  const rows = withTempCopy(historyFile, (db) =>
    db
      .prepare(
        `SELECT urls.url AS url, urls.title AS title, COUNT(*) AS visits,
                SUM(visits.visit_duration) AS dur, MIN(visits.visit_time) AS first, MAX(visits.visit_time) AS last
         FROM visits JOIN urls ON visits.url = urls.id
         WHERE visits.visit_time >= ? AND visits.visit_time <= ?
         GROUP BY urls.id ORDER BY first ASC LIMIT ?`,
      )
      .all(msToChromeMicros(fromMs), msToChromeMicros(toMs), MAX_SESSION_SITES),
  ) as { url: string; title: string; visits: number; dur: number | null; first: number; last: number }[];
  return rows.map((r) => {
    let host = r.url;
    try {
      host = new URL(r.url).hostname.replace(/^www\./, '');
    } catch {}
    return {
      url: r.url,
      host,
      title: r.title || r.url,
      visits: r.visits,
      durationSec: Math.round((r.dur ?? 0) / 1_000_000),
      firstAt: chromeMicrosToIso(r.first),
      lastAt: chromeMicrosToIso(r.last),
    };
  });
}

export type SyncStatus = 'synced' | 'unsynced' | 'error';
const syncCache = new Map<string, { file: string; mtime: number; state: SyncStatus }>();

// ASSUMED: read from Chrome's own Preferences (works with Chrome closed): synced = signed in + consented_to_sync + sync.has_setup_completed; error = sync.cached_persistent_auth_error (needs sign-in again); anything else = unsynced — upgrade path: chrome://sync-internals over CDP for live state
export function readSyncState(profileId: string): SyncStatus {
  try {
    const layout = getLaunchLayout(profileId);
    const file = firstExisting([
      path.join(layout.root, layout.folder, 'Preferences'),
      path.join(getBrowserDir(profileId, 'chrome'), 'Default', 'Preferences'),
    ]);
    if (!file) return 'unsynced';
    const mtime = fs.statSync(file).mtimeMs;
    const hit = syncCache.get(profileId);
    if (hit && hit.file === file && hit.mtime === mtime) return hit.state;
    const prefs = JSON.parse(fs.readFileSync(file, 'utf8'));
    const services = prefs?.google?.services;
    const signedIn = Boolean(services?.last_signed_in_username || prefs?.sync?.gaia_id);
    const enabled = services?.consented_to_sync === true && prefs?.sync?.has_setup_completed === true;
    const state: SyncStatus =
      !signedIn || !enabled
        ? 'unsynced'
        : prefs?.sync?.cached_persistent_auth_error === true
          ? 'error'
          : 'synced';
    syncCache.set(profileId, { file, mtime, state });
    return state;
  } catch {
    return 'unsynced';
  }
}

export function listExecutables() {
  return BROWSER_KINDS.map((kind) => ({ kind, path: resolveBrowserExecutable(kind) }));
}

// ─── Chrome SQLite readers (copy-then-read, never lock the live file) ───

function withTempCopy<T>(src: string, fn: (db: BetterSqlite3.Database) => T): T {
  const tmp = path.join(os.tmpdir(), `phantoma-profile-${newId()}.db`);
  fs.copyFileSync(src, tmp);
  let db: BetterSqlite3.Database | null = null;
  try {
    db = new BetterSqlite3(tmp, { readonly: true });
    return fn(db);
  } finally {
    try {
      db?.close();
    } catch {}
    try {
      fs.unlinkSync(tmp);
    } catch {}
  }
}

function firstExisting(candidates: string[]): string | null {
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

function cookiesPath(userDataDir: string): string | null {
  return firstExisting([
    path.join(userDataDir, 'Default', 'Network', 'Cookies'),
    path.join(userDataDir, 'Default', 'Cookies'),
  ]);
}

const chromeMicrosToIso = (micros: number): string =>
  new Date(micros / 1000 - CHROME_EPOCH_MS).toISOString();
const msToChromeMicros = (ms: number): number => (ms + CHROME_EPOCH_MS) * 1000;

export function checkGoogleLogin(profileId: string, kind: BrowserKind) {
  const dir = getBrowserDir(profileId, kind);
  if (!fs.existsSync(path.join(dir, 'Default')))
    return { loggedIn: false, reason: 'empty-profile' };
  const file = cookiesPath(dir);
  if (!file) return { loggedIn: false, reason: 'no-cookies-file' };
  const count = withTempCopy(file, (db) => {
    const row = db
      .prepare(
        `SELECT COUNT(*) AS count FROM cookies WHERE host_key LIKE '%.google.com' AND name IN ('SID','HSID','SSID','APISID','SAPISID','__Secure-1PSID','__Secure-3PSID','__Secure-1PAPISID','__Secure-3PAPISID','LSID')`,
      )
      .get() as { count: number };
    return row.count;
  });
  return { loggedIn: count > 0, reason: count > 0 ? 'ok' : 'no-auth-cookie' };
}

export function checkDomainSession(profileId: string, kind: BrowserKind, domain: string) {
  const dir = getBrowserDir(profileId, kind);
  if (!fs.existsSync(path.join(dir, 'Default'))) {
    return { hasSession: false, cookieCount: 0, reason: 'empty-profile' };
  }
  const file = cookiesPath(dir);
  if (!file) return { hasSession: false, cookieCount: 0, reason: 'no-cookies-file' };

  const rows = withTempCopy(file, (db) =>
    db
      .prepare(
        'SELECT expires_utc, last_access_utc FROM cookies WHERE host_key LIKE ? OR host_key = ?',
      )
      .all(`%.${domain}`, domain),
  ) as { expires_utc: number; last_access_utc: number }[];

  const nowMicros = msToChromeMicros(Date.now());
  const valid = rows.filter((c) => c.expires_utc === 0 || c.expires_utc > nowMicros);
  const maxAccess = Math.max(0, ...valid.map((c) => c.last_access_utc || 0));
  const persistent = valid.filter((c) => c.expires_utc > 0).map((c) => c.expires_utc);
  return {
    hasSession: valid.length > 0,
    cookieCount: valid.length,
    lastActivity: maxAccess > 0 ? chromeMicrosToIso(maxAccess) : null,
    nearestExpiryUtc: persistent.length ? chromeMicrosToIso(Math.min(...persistent)) : null,
    reason: valid.length > 0 ? 'has-cookies' : 'no-valid-cookies',
  };
}

export function listSavedLogins(profileId: string, kind: BrowserKind) {
  const dir = getBrowserDir(profileId, kind);
  const file = firstExisting([
    path.join(dir, 'Default', 'Login Data For Account'),
    path.join(dir, 'Default', 'Login Data'),
  ]);
  if (!file) return [];
  const rows = withTempCopy(file, (db) =>
    db.prepare('SELECT origin_url, username_value FROM logins WHERE blacklisted_by_user = 0').all(),
  ) as { origin_url: string; username_value: string }[];

  const byUrl = new Map<string, { url: string; name: string; username: string }>();
  for (const r of rows) {
    let name = r.origin_url;
    try {
      name = new URL(r.origin_url).hostname.replace('www.', '');
    } catch {}
    byUrl.set(r.origin_url, { url: r.origin_url, name, username: r.username_value });
  }
  return [...byUrl.values()];
}

// Real Chrome user-data-dir keeps History at <root>/<folder>/History; standalone folders keep it at <profileDir>/<chrome|chromium>/Default/History
function historyFiles(profileId: string): string[] {
  const layout = getLaunchLayout(profileId);
  const files = layout.isReal ? [path.join(layout.root, layout.folder, 'History')] : [];
  for (const kind of BROWSER_KINDS) {
    files.push(path.join(getBrowserDir(profileId, kind), 'Default', 'History'));
  }
  return files.filter((f) => fs.existsSync(f));
}

export function readHistory(profileId: string, fromMs: number, toMs: number) {
  const from = msToChromeMicros(fromMs);
  const to = msToChromeMicros(toMs);
  const seen = new Set<string>();
  const out: { url: string; title: string; time: number; visits: number }[] = [];

  for (const file of historyFiles(profileId)) {
    const rows = withTempCopy(file, (db) =>
      db
        .prepare(
          `SELECT urls.url AS url, urls.title AS title, visits.visit_time AS visit_time
           FROM visits JOIN urls ON visits.url = urls.id
           WHERE visits.visit_time >= ? AND visits.visit_time < ?
           ORDER BY visits.visit_time DESC`,
        )
        .all(from, to),
    ) as { url: string; title: string; visit_time: number }[];
    for (const r of rows) {
      const key = `${r.url}|${r.visit_time}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        url: r.url,
        title: r.title,
        time: Math.floor(r.visit_time / 1000 - CHROME_EPOCH_MS),
        visits: 1,
      });
    }
  }
  return out.sort((a, b) => b.time - a.time);
}

export function readRecentHistory(
  profileId: string,
  source?: { location?: string | null; chromeProfile?: string | null },
  limit = 100,
) {
  const out: {
    id: string;
    url: string;
    title: string;
    at: string;
    visits: number;
    footprintId: string;
  }[] = [];
  const candidates: { kind: string; file: string }[] = historyFiles(profileId).map((file) => ({
    kind: path.basename(path.dirname(file)),
    file,
  }));
  if (
    source?.location &&
    source.chromeProfile &&
    !candidates.some((c) => c.file === path.join(source.location as string, source.chromeProfile as string, 'History'))
  ) {
    candidates.push({
      kind: 'source',
      file: path.join(source.location, source.chromeProfile, 'History'),
    });
  }
  for (const { kind, file } of candidates) {
    if (!fs.existsSync(file)) continue;
    let rows: {
      id: number;
      url: string;
      title: string;
      visit_count: number;
      last_visit_time: number;
    }[];
    try {
      rows = withTempCopy(file, (db) =>
        db
          .prepare(
            'SELECT id, url, title, visit_count, last_visit_time FROM urls WHERE hidden = 0 AND last_visit_time > 0 ORDER BY last_visit_time DESC LIMIT ?',
          )
          .all(limit),
      ) as typeof rows;
    } catch (err) {
      log.warn(`cannot read ${file}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    for (const r of rows) {
      out.push({
        id: `history:${kind}:${r.id}`,
        url: r.url,
        title: r.title || r.url,
        at: chromeMicrosToIso(r.last_visit_time),
        visits: r.visit_count,
        footprintId: '',
      });
    }
  }
  return out.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, limit);
}

export function readAvatar(profileId: string, kind: BrowserKind): string | null {
  const file = path.join(getBrowserDir(profileId, kind), 'Default', 'Google Profile Picture.png');
  if (!fs.existsSync(file)) return null;
  return `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
}

export function readExtensionState(profileId: string, kind: BrowserKind) {
  const file = path.join(getBrowserDir(profileId, kind), 'Default', 'Preferences');
  if (!fs.existsSync(file)) return { developerMode: false, unpackedExtensions: [] };
  const prefs = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const settings = (prefs?.extensions?.settings ?? {}) as Record<string, any>;
  return {
    developerMode: prefs?.extensions?.ui?.developer_mode === true,
    unpackedExtensions: Object.entries(settings)
      .filter(([, v]) => v?.location === 4 && typeof v?.path === 'string')
      .map(([id, v]) => ({
        id,
        path: v.path as string,
        fromWebstore: v.from_webstore === true,
        state: v.state as number,
      })),
  };
}

// ─── Shared per-profile DBs (passwords.db, fp-ip-history.db) ────────────

function openSharedDb(
  profileId: string,
  filename: string,
  createSql?: string,
): BetterSqlite3.Database {
  const sharedDir = getProfileDir(profileId);
  fs.mkdirSync(sharedDir, { recursive: true });

  const db = new BetterSqlite3(path.join(sharedDir, filename));
  if (createSql) db.exec(createSql);
  return db;
}

const PASSWORDS_SQL = `CREATE TABLE IF NOT EXISTS passwords (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  username TEXT,
  password TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`;

function withPasswordsDb<T>(profileId: string, fn: (db: BetterSqlite3.Database) => T): T {
  const db = openSharedDb(profileId, PASSWORDS_DB, PASSWORDS_SQL);
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

// Counts how many of the given profiles already have this password saved (read-only, never creates a passwords.db)
export function countPasswordReuse(profileIds: string[], password: string): number {
  let count = 0;
  for (const id of profileIds) {
    const file = path.join(getProfileDir(id), PASSWORDS_DB);
    if (!fs.existsSync(file)) continue;
    let db: BetterSqlite3.Database | null = null;
    try {
      db = new BetterSqlite3(file, { readonly: true, fileMustExist: true });
      if (db.prepare('SELECT 1 FROM passwords WHERE password = ? LIMIT 1').get(password)) count++;
    } catch {
      continue;
    } finally {
      db?.close();
    }
  }
  return count;
}

export const passwords = {
  list: (profileId: string) =>
    withPasswordsDb(profileId, (db) =>
      db.prepare('SELECT id, url, username, password FROM passwords ORDER BY created_at ASC').all(),
    ),
  add: (profileId: string, input: { url: string; username?: string; password: string }) =>
    withPasswordsDb(profileId, (db) => {
      const id = newId();
      db.prepare('INSERT INTO passwords (id, url, username, password) VALUES (?, ?, ?, ?)').run(
        id,
        input.url,
        input.username ?? '',
        input.password,
      );
      return { id, url: input.url, username: input.username ?? '', password: input.password };
    }),
  update: (
    profileId: string,
    id: string,
    input: { url: string; username?: string; password: string },
  ) =>
    withPasswordsDb(profileId, (db) => {
      const res = db
        .prepare(
          'UPDATE passwords SET url = ?, username = ?, password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        )
        .run(input.url, input.username ?? '', input.password, id);
      return res.changes > 0;
    }),
  remove: (profileId: string, id: string) =>
    withPasswordsDb(
      profileId,
      (db) => db.prepare('DELETE FROM passwords WHERE id = ?').run(id).changes > 0,
    ),
};

const FP_HISTORY_SQL = `CREATE TABLE IF NOT EXISTS site_fingerprint_history (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  fingerprint_hash TEXT NOT NULL,
  fingerprint_config_json TEXT,
  public_ip TEXT NOT NULL,
  ip_info_json TEXT,
  is_proxy INTEGER DEFAULT 0,
  started_at DATETIME NOT NULL,
  ended_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sfh_domain_active ON site_fingerprint_history(domain, ended_at);`;

function withFpHistoryDb<T>(profileId: string, fn: (db: BetterSqlite3.Database) => T): T {
  const db = openSharedDb(profileId, FP_HISTORY_DB, FP_HISTORY_SQL);
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

export const fingerprintHistory = {
  list: (profileId: string) =>
    withFpHistoryDb(profileId, (db) =>
      db.prepare('SELECT * FROM site_fingerprint_history ORDER BY started_at DESC').all(),
    ),
  remove: (profileId: string, id: string) =>
    withFpHistoryDb(
      profileId,
      (db) => db.prepare('DELETE FROM site_fingerprint_history WHERE id = ?').run(id).changes > 0,
    ),
};
