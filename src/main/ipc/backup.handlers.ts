import { ipcMain } from 'electron';
import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import { dirname, join, relative, resolve, sep } from 'path';
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

type BackupEntry = { name: string; rel: string; type: 'file' | 'folder' };

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

const SEARCH_LIMIT = 200;
const SEARCH_MAX_DEPTH = 8;

export function setupBackupHandlers(): void {
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
    const entries = dirents
      .filter((d) => d.name !== '.git')
      .map((d) => ({
        name: d.name,
        rel: r ? r + '/' + d.name : d.name,
        type: d.isDirectory() ? ('folder' as const) : ('file' as const),
      }));
    return annotate(entries);
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

  ipcMain.handle('backup:push', async () => {
    if (!(await isRepo())) return { error: 'Backup is not enabled' };
    const res = await git(['push', '-u', 'origin', 'HEAD']);
    return res.error ? failure(res) : { ok: true, output: res.stderr || res.stdout };
  });
}