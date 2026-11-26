import { app, BrowserWindow, ipcMain } from 'electron';
import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import { dirname, join, relative, resolve, sep } from 'path';
import initSqlJs from 'sql.js';
import { logger } from '../utils/logger';

const ROOT = join(homedir(), '.phantoma');
const DEFAULT_IGNORE = ['*.log', 'node_modules/', 'tmp/'];
const GITHUB_URL = /^(?:https:\/\/github\.com\/|git@github\.com:)([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/;

type GitResult = { stdout: string; stderr: string; error?: any };

function git(args: string[], input?: string): Promise<GitResult> {
  return new Promise((done) => {
    const child = execFile(
      'git',
      args,
      {
        cwd: ROOT,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, GIT_CEILING_DIRECTORIES: dirname(ROOT), GIT_TERMINAL_PROMPT: '0' },
      },
      (err: any, stdout: string, stderr: string) => {
        if (err) done({ stdout: '', stderr, error: err });
        else done({ stdout, stderr });
      },
    );
    if (input !== undefined) child.stdin?.end(input);
  });
}

const failure = (r: GitResult) => ({
  error: r.stderr.trim() || r.error?.message || 'Git command failed',
});

const exists = (p: string) =>
  fs.stat(p).then(
    () => true,
    () => false,
  );

const isRepo = () => exists(join(ROOT, '.git'));

function toRel(rel: string): string | null {
  const r = relative(ROOT, resolve(ROOT, rel || '.')).split(sep).join('/');
  if (r.startsWith('..') || r === '.git' || r.startsWith('.git/')) return null;
  return r;
}

type BackupEntry = { name: string; rel: string; type: 'file' | 'folder'; size?: number };

async function annotate(entries: BackupEntry[]) {
  const ignoredSet = new Set<string>();
  if (entries.length && (await isRepo())) {
    const res = await git(
      ['check-ignore', '-z', '--stdin'],
      entries.map((e) => e.rel + '\0').join(''),
    );
    res.stdout
      .split('\0')
      .filter(Boolean)
      .forEach((p) => ignoredSet.add(p));
  }
  const raw = await fs.readFile(join(ROOT, '.gitignore'), 'utf8').catch(() => '');
  const explicit = new Set(raw.split('\n').map((l) => l.trim()));
  return entries
    .map((e) => ({ ...e, ignored: ignoredSet.has(e.rel), explicit: explicit.has('/' + e.rel) }))
    .sort((a, b) =>
      a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1,
    );
}

const AUTO_IGNORE_SUFFIXES = ['.sql-shm', '.sql-wal', '.db-shm', '.db-wal', '.sqlite-shm', '.sqlite-wal', '-journal'];
const AUTO_IGNORE_HEADER = '# auto-ignored runtime files';
const escapeIgnore = (p: string) => p.replace(/[*?[\]\\]/g, '\\$&').replace(/^([#!])/, '\\$1');

async function autoIgnoreScan(): Promise<number> {
  const file = join(ROOT, '.gitignore');
  const raw = await fs.readFile(file, 'utf8').catch(() => '');
  const lines = raw.split('\n');
  const known = new Set(lines.map((l) => l.trim()));
  const skipDirs = new Set(['.git', 'node_modules']);
  const found: string[] = [];
  const walk = async (rel: string): Promise<void> => {
    const dirents = await fs.readdir(join(ROOT, rel), { withFileTypes: true }).catch(() => []);
    for (const d of dirents) {
      const r = rel ? rel + '/' + d.name : d.name;
      if (d.isDirectory()) {
        if (skipDirs.has(d.name) || known.has('/' + r) || known.has('/' + r + '/')) continue;
        await walk(r);
      } else if (d.isFile() && AUTO_IGNORE_SUFFIXES.some((s) => d.name.endsWith(s))) {
        const entry = '/' + escapeIgnore(r);
        if (!known.has(entry)) found.push(entry);
      }
    }
  };
  await walk('');
  if (found.length === 0) return 0;
  const kept = lines.filter((l, i, all) => !(i === all.length - 1 && l === ''));
  if (!kept.includes(AUTO_IGNORE_HEADER)) kept.push(AUTO_IGNORE_HEADER);
  await fs.writeFile(file, [...kept, ...found].join('\n') + '\n', 'utf8');
  if (await isRepo()) {
    await git(['rm', '-r', '--cached', '--ignore-unmatch', '-q', '--', ...found.map((p) => p.slice(1))]);
  }
  return found.length;
}

const MEDIA_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  bmp: 'image/bmp',
  avif: 'image/avif',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  ogv: 'video/ogg',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  flac: 'audio/flac',
  pdf: 'application/pdf',
};
const MEDIA_MAX = 25 * 1024 * 1024;
const SQLITE_MAX = 50 * 1024 * 1024;
const SQLITE_MAGIC = 'SQLite format 3\0';
const PREVIEW_ROWS = 100;
const PREVIEW_TABLES = 50;
const quoteIdent = (name: string) => `"${name.replace(/"/g, '""')}"`;
const toCell = (v: unknown): unknown => (v instanceof Uint8Array ? `<blob ${v.length} bytes>` : v);
let sqlPromise: ReturnType<typeof initSqlJs> | null = null;
const getSql = () => (sqlPromise ??= initSqlJs());

const SEARCH_LIMIT = 200;
const SEARCH_MAX_DEPTH = 8;

type SyncStatus = 'idle' | 'loading' | 'success' | 'error';
type Schedule = { enabled: boolean; intervalMin: number };

const COMMIT_MESSAGE = 'Backup Phantoma configuration';
const INTERVALS = [15, 30, 60, 360, 720, 1440];
const settingsFile = () => join(app.getPath('userData'), 'backup-settings.json');

let schedule: Schedule = { enabled: false, intervalMin: 360 };
let lastSync: string | null = null;
let syncStatus: SyncStatus = 'idle';
let syncError: string | undefined;
let syncing = false;
let timer: NodeJS.Timeout | null = null;

const saveSettings = () =>
  fs
    .writeFile(settingsFile(), JSON.stringify({ schedule, lastSync }), 'utf8')
    .catch(() => undefined);

async function loadSettings(): Promise<void> {
  try {
    const raw = JSON.parse(await fs.readFile(settingsFile(), 'utf8'));
    if (raw.schedule) {
      const mins = Number(raw.schedule.intervalMin);
      schedule = {
        enabled: !!raw.schedule.enabled,
        intervalMin: INTERVALS.includes(mins) ? mins : 360,
      };
    }
    if (typeof raw.lastSync === 'string') lastSync = raw.lastSync;
  } catch {
    // defaults
  }
}

function broadcastSync(): void {
  BrowserWindow.getAllWindows().forEach((w) => {
    if (!w.isDestroyed()) {
      w.webContents.send('backup:state', { state: syncStatus, error: syncError, lastSync });
    }
  });
}

async function runSync(): Promise<{ ok?: boolean; skipped?: boolean; error?: string }> {
  if (syncing) return { error: 'Sync already running' };
  if (!(await isRepo())) return { error: 'Backup is not enabled' };
  syncing = true;
  syncStatus = 'idle';
  syncError = undefined;
  let notify = false;
  const fail = (error: string) => {
    notify = true;
    syncStatus = 'error';
    syncError = error;
    return { error };
  };
  try {
    await autoIgnoreScan();
    const add = await git(['add', '-A']);
    if (add.error) return fail(failure(add).error);
    const [status, ahead] = await Promise.all([
      git(['status', '--porcelain']),
      git(['rev-list', '--count', '@{u}..HEAD']),
    ]);
    const changes = status.error ? 0 : status.stdout.split('\n').filter((l) => l.trim()).length;
    const unpushed = ahead.error ? 0 : parseInt(ahead.stdout, 10) || 0;
    if (changes === 0 && unpushed === 0) return { ok: true, skipped: true };

    notify = true;
    syncStatus = 'loading';
    broadcastSync();
    if (changes > 0) {
      const c = await git(['commit', '-m', COMMIT_MESSAGE]);
      if (c.error) return fail(failure(c).error);
    }
    const p = await git(['push', '-u', 'origin', 'HEAD']);
    if (p.error) return fail(failure(p).error);
    lastSync = new Date().toISOString();
    syncStatus = 'success';
    await saveSettings();
    return { ok: true };
  } catch (e: any) {
    return fail(e.message || String(e));
  } finally {
    syncing = false;
    if (notify) broadcastSync();
  }
}

function applySchedule(): void {
  if (timer) clearInterval(timer);
  timer = schedule.enabled
    ? setInterval(() => void runSync(), schedule.intervalMin * 60_000)
    : null;
}

export function setupBackupHandlers(): void {
  void loadSettings().then(applySchedule);
  ipcMain.handle('backup:status', async () => {
    await fs.mkdir(ROOT, { recursive: true });
    if (!(await isRepo())) return { root: ROOT, enabled: false };
    const [remote, branch, status, unpushed] = await Promise.all([
      git(['remote', 'get-url', 'origin']),
      git(['rev-parse', '--abbrev-ref', 'HEAD']),
      git(['status', '--porcelain', '--untracked-files=all']),
      git(['rev-list', '--count', '@{u}..HEAD']),
    ]);
    return {
      root: ROOT,
      enabled: true,
      remoteUrl: remote.error ? '' : remote.stdout.trim(),
      branch: branch.error ? '' : branch.stdout.trim(),
      changes: status.error ? 0 : status.stdout.split('\n').filter((l) => l.trim()).length,
      unpushed: unpushed.error ? 0 : parseInt(unpushed.stdout, 10) || 0,
      lastSync,
      schedule: { ...schedule },
    };
  });

  ipcMain.handle('backup:enable', async (_event, url: string) => {
    const target = (url || '').trim();
    const m = GITHUB_URL.exec(target);
    if (!m) {
      return {
        error:
          'Enter a GitHub repository URL (https://github.com/owner/repo or git@github.com:owner/repo)',
      };
    }
    try {
      // ASSUMED: any non-200 answer (404 or rate limit) is treated as private; ls-remote below verifies access
      const isPublic = await fetch('https://api.github.com/repos/' + m[1] + '/' + m[2]).then(
        (r) => r.ok,
        () => false,
      );
      if (isPublic) return { error: 'This repository is public. Backup requires a private repository.' };

      await fs.mkdir(ROOT, { recursive: true });
      if (!(await isRepo())) {
        const init = await git(['init']);
        if (init.error) return failure(init);
      }
      const hasRemote = await git(['remote', 'get-url', 'origin']);
      const setRemote = await git(['remote', hasRemote.error ? 'add' : 'set-url', 'origin', target]);
      if (setRemote.error) return failure(setRemote);

      const heads = await git(['ls-remote', '--heads', 'origin']);
      if (heads.error) return failure(heads);
      const names = heads.stdout
        .split('\n')
        .map((l) => l.split('\trefs/heads/')[1])
        .filter(Boolean);
      const branch = names.includes('main') ? 'main' : names[0] || 'main';
      await git(['symbolic-ref', 'HEAD', 'refs/heads/' + branch]);
      if (names.length) {
        const fetched = await git(['fetch', 'origin', branch]);
        if (fetched.error) return failure(fetched);
        const reset = await git(['reset', '-q', 'origin/' + branch]);
        if (reset.error) return failure(reset);
        await git(['branch', '--set-upstream-to=origin/' + branch, branch]);
      }
      const ignoreFile = join(ROOT, '.gitignore');
      if (!(await exists(ignoreFile))) {
        await fs.writeFile(ignoreFile, DEFAULT_IGNORE.join('\n') + '\n', 'utf8');
      }
      await autoIgnoreScan();
      return { ok: true };
    } catch (e: any) {
      logger.error('[backup:enable] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  ipcMain.handle('backup:list-dir', async (_event, rel: string) => {
    const r = toRel(rel);
    if (r === null) return [];
    const dirents = await fs.readdir(join(ROOT, r), { withFileTypes: true }).catch(() => []);
    const entries: BackupEntry[] = await Promise.all(
      dirents
        .filter((d) => d.name !== '.git')
        .map(async (d) => {
          const isDir = d.isDirectory();
          const rel = r ? r + '/' + d.name : d.name;
          const size = isDir
            ? undefined
            : await fs.stat(join(ROOT, rel)).then(
                (s) => s.size,
                () => 0,
              );
          return { name: d.name, rel, type: isDir ? ('folder' as const) : ('file' as const), size };
        }),
    );
    return annotate(entries);
  });

  ipcMain.handle('backup:folder-size', async (_event, rel: string) => {
    const r = toRel(rel);
    if (r === null) return 0;
    let total = 0;
    const walk = async (dir: string): Promise<void> => {
      const dirents = await fs.readdir(join(ROOT, dir), { withFileTypes: true }).catch(() => []);
      for (const d of dirents) {
        if (d.name === '.git') continue;
        const p = dir ? dir + '/' + d.name : d.name;
        if (d.isDirectory()) await walk(p);
        else total += await fs.stat(join(ROOT, p)).then((s) => s.size, () => 0);
      }
    };
    await walk(r);
    return total;
  });

  ipcMain.handle('backup:set-ignore', async (_event, rel: string, ignored: boolean) => {
    const r = toRel(rel);
    if (!r) return { error: 'Invalid path' };
    const entry = '/' + r;
    const file = join(ROOT, '.gitignore');
    const raw = await fs.readFile(file, 'utf8').catch(() => '');
    const lines = raw.split('\n').filter((l, i, all) => !(i === all.length - 1 && l === ''));
    const kept = lines.filter((l) => l.trim() !== entry && l.trim() !== entry + '/');
    if (ignored) kept.push(entry);
    await fs.writeFile(file, kept.join('\n') + '\n', 'utf8');
    if (ignored && (await isRepo())) {
      await git(['rm', '-r', '--cached', '--ignore-unmatch', '-q', '--', r]);
    }
    return { ok: true };
  });

  ipcMain.handle('backup:ignored-paths', async () => {
    if (!(await isRepo())) return [] as string[];
    const res = await git([
      'ls-files',
      '--others',
      '--ignored',
      '--exclude-standard',
      '--directory',
      '-z',
    ]);
    if (res.error) return [] as string[];
    return res.stdout
      .split('\0')
      .filter(Boolean)
      .map((p) => p.replace(/\/$/, ''));
  });

  ipcMain.handle('backup:search', async (_event, query: string) => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];
    const found: BackupEntry[] = [];
    const walk = async (rel: string, depth: number): Promise<void> => {
      if (depth > SEARCH_MAX_DEPTH) return;
      const dirents = await fs.readdir(join(ROOT, rel), { withFileTypes: true }).catch(() => []);
      for (const d of dirents) {
        if (found.length >= SEARCH_LIMIT) return;
        if (d.name === '.git') continue;
        const r = rel ? rel + '/' + d.name : d.name;
        const isDir = d.isDirectory();
        if (d.name.toLowerCase().includes(q)) {
          found.push({ name: d.name, rel: r, type: isDir ? 'folder' : 'file' });
        }
        if (isDir && d.name !== 'node_modules') await walk(r, depth + 1);
      }
    };
    await walk('', 0);
    return annotate(found);
  });

  ipcMain.handle('backup:auto-ignore', async () => {
    try {
      return { ok: true, added: await autoIgnoreScan() };
    } catch (e: any) {
      logger.error('[backup:auto-ignore] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  ipcMain.handle('backup:size', async () => {
    if (!(await isRepo())) return 0;
    const res = await git(['ls-files', '--cached', '--others', '--exclude-standard', '-z']);
    if (res.error) return 0;
    const files = res.stdout.split('\0').filter(Boolean);
    let total = 0;
    for (let i = 0; i < files.length; i += 200) {
      const sizes = await Promise.all(
        files.slice(i, i + 200).map((f) =>
          fs.stat(join(ROOT, f)).then(
            (s) => s.size,
            () => 0,
          ),
        ),
      );
      total += sizes.reduce((a, b) => a + b, 0);
    }
    return total;
  });

  ipcMain.handle('backup:read-file', async (_event, rel: string) => {
    const r = toRel(rel);
    if (!r) return { error: 'Invalid path' };
    const max = 512 * 1024;
    try {
      const full = join(ROOT, r);
      const st = await fs.stat(full);
      if (!st.isFile()) return { error: 'Not a file' };
      const ext = r.includes('.') ? r.slice(r.lastIndexOf('.') + 1).toLowerCase() : '';
      const mime = MEDIA_MIME[ext];
      if (mime) {
        if (st.size > MEDIA_MAX) return { size: st.size, kind: 'toolarge' };
        const data = await fs.readFile(full);
        const group = mime.split('/')[0];
        return {
          size: st.size,
          kind: group === 'application' ? 'pdf' : group,
          dataUrl: `data:${mime};base64,${data.toString('base64')}`,
        };
      }
      const head = Buffer.alloc(16);
      const hfh = await fs.open(full, 'r');
      try {
        await hfh.read(head, 0, 16, 0);
      } finally {
        await hfh.close();
      }
      if (st.size >= 16 && head.toString('latin1') === SQLITE_MAGIC) {
        if (st.size > SQLITE_MAX) return { size: st.size, kind: 'toolarge' };
        const SQL = await getSql();
        const db = new SQL.Database(new Uint8Array(await fs.readFile(full)));
        try {
          const names = (
            db.exec(
              "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
            )[0]?.values ?? []
          ).map((x) => String(x[0]));
          const tables = names.slice(0, PREVIEW_TABLES).map((name) => {
            const q = quoteIdent(name);
            const total = Number(db.exec(`SELECT COUNT(*) FROM ${q}`)[0]?.values[0][0] ?? 0);
            const res = db.exec(`SELECT * FROM ${q} LIMIT ${PREVIEW_ROWS}`)[0];
            const columns =
              res?.columns ??
              (db.exec(`PRAGMA table_info(${q})`)[0]?.values ?? []).map((x) => String(x[1]));
            return { name, columns, rows: (res?.values ?? []).map((x) => x.map(toCell)), total };
          });
          return { size: st.size, kind: 'sqlite', tables };
        } finally {
          db.close();
        }
      }
      const fh = await fs.open(full, 'r');
      try {
        const buf = Buffer.alloc(Math.min(st.size, max));
        const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
        const slice = buf.subarray(0, bytesRead);
        const binary = slice.subarray(0, 8000).includes(0);
        return {
          size: st.size,
          binary,
          truncated: st.size > max,
          content: binary ? '' : slice.toString('utf8'),
        };
      } finally {
        await fh.close();
      }
    } catch (e: any) {
      return { error: e.message || String(e) };
    }
  });

  ipcMain.handle('backup:sync', () => runSync());

  ipcMain.handle('backup:schedule-set', async (_event, next: Partial<Schedule>) => {
    const mins = Number(next?.intervalMin);
    schedule = {
      enabled: next?.enabled ?? schedule.enabled,
      intervalMin: INTERVALS.includes(mins) ? mins : schedule.intervalMin,
    };
    await saveSettings();
    applySchedule();
    return { ...schedule };
  });

  ipcMain.handle('backup:push', async () => {
    if (!(await isRepo())) return { error: 'Backup is not enabled' };
    const res = await git(['push', '-u', 'origin', 'HEAD']);
    return res.error ? failure(res) : { ok: true, output: res.stderr || res.stdout };
  });
}