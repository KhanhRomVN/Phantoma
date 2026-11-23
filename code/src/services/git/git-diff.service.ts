import { promises as fs } from 'fs';
import path from 'path';
import { runGit, failure, lines, safeRef, type GitError } from '../../infra/git-runner';

export type FileKind = 'added' | 'modified' | 'deleted';
export interface ChangedFile {
  added: number;
  deleted: number;
  path: string;
  status: FileKind;
  staged?: boolean;
  unstaged?: boolean;
  untracked?: boolean;
}

const kindFromCode = (code: string): FileKind =>
  code === 'A' ? 'added' : code === 'D' ? 'deleted' : 'modified';

const parseNumstat = (out: string) =>
  lines(out).map((line) => {
    const p = line.split('\t');
    return {
      added: parseInt(p[0], 10) || 0,
      deleted: parseInt(p[1], 10) || 0,
      path: p.slice(2).join('\t'),
    };
  });

async function worktreeByBranch(root: string): Promise<Map<string, string>> {
  const byBranch = new Map<string, string>();
  const wtList = await runGit(['worktree', 'list', '--porcelain'], root);
  if (wtList.error) return byBranch;
  for (const block of wtList.stdout.split(/\n\s*\n/)) {
    const rows = block.split('\n');
    const wtPath = rows
      .find((l) => l.startsWith('worktree '))
      ?.slice(9)
      .trim();
    const ref = rows
      .find((l) => l.startsWith('branch '))
      ?.slice(7)
      .trim();
    if (wtPath && ref) byBranch.set(ref.replace(/^refs\/heads\//, ''), wtPath);
  }
  return byBranch;
}

async function comparableBranches(
  root: string,
  clones: Record<string, string>,
): Promise<GitError | { locals: string[]; current: string }> {
  const [refsRes, headRes] = await Promise.all([
    runGit(['for-each-ref', '--format=%(refname:short)', 'refs/heads', 'refs/remotes/origin'], root),
    runGit(['rev-parse', '--abbrev-ref', 'HEAD'], root),
  ]);
  if (refsRes.error) return failure(refsRes);

  const refs = new Set(lines(refsRes.stdout).map((l) => l.trim()));
  const locals = [
    ...new Set([
      ...[...refs].filter((r) => r !== 'origin' && !r.startsWith('origin/')),
      ...Object.keys(clones),
    ]),
  ].filter((r) => refs.has(`origin/${r}`));
  return { locals, current: headRes.stdout.trim() };
}

async function changedFilesVsOrigin(range: string[], diffRoot: string): Promise<ChangedFile[]> {
  const [diff, nameStatus] = await Promise.all([
    runGit(['diff', '--numstat', '--no-renames', ...range, '--'], diffRoot),
    runGit(['diff', '--name-status', '--no-renames', ...range, '--'], diffRoot),
  ]);
  const kindByPath = new Map<string, FileKind>();
  if (!nameStatus.error) {
    for (const l of lines(nameStatus.stdout)) {
      const p = l.split('\t');
      kindByPath.set(p.slice(1).join('\t'), kindFromCode(p[0].charAt(0)));
    }
  }
  return diff.error
    ? []
    : parseNumstat(diff.stdout).map((f) => ({
        ...f,
        status: kindByPath.get(f.path) ?? 'modified',
      }));
}

async function applyWorkingStatus(files: ChangedFile[], statusRoot: string): Promise<void> {
  const status = await runGit(['status', '--porcelain', '--untracked-files=all'], statusRoot);
  for (const l of status.stdout.split('\n').filter((row) => row.length > 3)) {
    const untracked = l[0] === '?';
    const staged = !untracked && l[0] !== ' ';
    const unstaged = untracked || l[1] !== ' ';
    const code = l.slice(0, 2);
    let filePath = l.slice(3).trim();
    if (filePath.includes(' -> ')) filePath = filePath.split(' -> ')[1];
    if (!filePath) continue;
    let file = files.find((f) => f.path === filePath);
    if (!file) {
      const kind: FileKind =
        untracked || code.includes('A') ? 'added' : code.includes('D') ? 'deleted' : 'modified';
      file = { added: 0, deleted: 0, path: filePath, status: kind };
      files.push(file);
    }
    Object.assign(file, { staged, unstaged, untracked });
  }
}

export const gitDiffService = {
  stagedDiff: async (root: string) => {
    const res = await runGit(['diff', '--cached', '--no-color', '--no-ext-diff'], root);
    if (res.error) return failure(res);
    const max = 60000;
    const diff = res.stdout.length > max ? `${res.stdout.slice(0, max)}\n... [truncated]` : res.stdout;
    return { diff };
  },

  commitDiff: async (root: string, hash: string) => {
    const res = await runGit(
      ['show', '--format=', '--no-color', '-M', '--patch', safeRef(hash, 'hash')],
      root,
    );
    if (res.error) return failure(res);
    return { diff: res.stdout };
  },

  localDiff: async (root: string, branch: string, branchRoot?: string) => {
    safeRef(branch, 'branch');
    const head = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], root);
    let workRoot = branchRoot ?? (head.stdout.trim() === branch ? root : undefined);
    if (!workRoot) {
      const wtList = await runGit(['worktree', 'list', '--porcelain'], root);
      for (const block of wtList.error ? [] : wtList.stdout.split(/\n\s*\n/)) {
        const rows = block.split('\n');
        const ref = rows
          .find((l) => l.startsWith('branch '))
          ?.slice(7)
          .trim();
        if (ref === `refs/heads/${branch}`) {
          workRoot = rows
            .find((l) => l.startsWith('worktree '))
            ?.slice(9)
            .trim();
          break;
        }
      }
    }
    if (!workRoot) {
      const committed = await runGit(
        ['diff', '--no-color', '-M', `origin/${branch}`, branch, '--'],
        root,
      );
      if (committed.error) return failure(committed);
      return { diff: committed.stdout };
    }
    const cwd = workRoot;
    const remote = await runGit(
      ['show-ref', '--verify', '--quiet', `refs/remotes/origin/${branch}`],
      cwd,
    );
    const base = remote.error ? 'HEAD' : `origin/${branch}`;
    const res = await runGit(['diff', '--no-color', '-M', base, '--'], cwd);
    if (res.error) return failure(res);
    const untracked = await runGit(['ls-files', '--others', '--exclude-standard'], cwd);
    const names = untracked.error
      ? []
      : untracked.stdout
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .slice(0, 100);
    const extra = await Promise.all(
      names.map((n) => runGit(['diff', '--no-color', '--no-index', '--', '/dev/null', n], cwd)),
    );
    return { diff: [res.stdout, ...extra.map((r) => r.stdout)].join('') };
  },

  localChanges: async (root: string, clones: Record<string, string> = {}) => {
    const info = await comparableBranches(root, clones);
    if ('error' in info) return info;
    const { locals, current } = info;
    const wtByBranch = await worktreeByBranch(root);

    const branches = await Promise.all(
      locals.map(async (name) => {
        const cloneRoot = clones[name];
        const range = [`origin/${name}`, ...(name === current || cloneRoot ? [] : [name])];
        const files = await changedFilesVsOrigin(range, cloneRoot ?? root);
        const statusRoot = cloneRoot ?? (name === current ? root : wtByBranch.get(name));
        if (statusRoot) await applyWorkingStatus(files, statusRoot);
        return { name, files };
      }),
    );

    return { branches: branches.filter((b) => b.files.length > 0) };
  },

  fileDiff: async (root: string, filePath: string) => {
    if (!filePath) return { error: 'file_path is required' };
    const base = path.resolve(root);
    const absFile = path.resolve(base, filePath);
    if (absFile !== base && !absFile.startsWith(base + path.sep))
      return { error: 'Path is outside project' };

    let cwd = base;
    let dir = path.dirname(absFile);
    while (dir.startsWith(base)) {
      const hasGit = await fs.access(path.join(dir, '.git')).then(
        () => true,
        () => false,
      );
      if (hasGit) {
        cwd = dir;
        break;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    const gitPath = absFile.startsWith(cwd) ? absFile.slice(cwd.length + 1) : absFile;

    const tracked = await runGit(['ls-files', '--', gitPath], cwd);
    if (!tracked.stdout.trim()) {
      try {
        const content = await fs.readFile(absFile, 'utf-8');
        const rows = content.split('\n');
        const body = rows.map((l) => '+' + l).join('\n');
        return {
          output: `--- /dev/null\n+++ b/${filePath}\n@@ -0,0 +1,${rows.length} @@\n${body}`,
        };
      } catch {
        return { output: '' };
      }
    }

    const [cached, unstaged] = await Promise.all([
      runGit(['diff', '--cached', '--', gitPath], cwd),
      runGit(['diff', '--', gitPath], cwd),
    ]);
    if (cached.error && unstaged.error) return failure(cached);
    return { output: cached.stdout.trim() ? cached.stdout : unstaged.stdout };
  },
};