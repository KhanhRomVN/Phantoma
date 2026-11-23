import { promises as fs } from 'fs';
import path from 'path';
import { runGit, type GitResult } from '../../infra/git-runner';

const message = (res: GitResult): string => res.stderr || res.error?.message || 'git command failed';


export const gitWriteService = {
  checkout: async (root: string, branch: string): Promise<{ ok?: boolean; error?: string }> => {
    if (branch.startsWith('-')) return { error: 'Invalid branch name' };
    let args = ['checkout', branch];
    if (branch.startsWith('origin/')) {
      const localName = branch.slice('origin/'.length);
      const exists = await runGit(['show-ref', '--verify', '--quiet', `refs/heads/${localName}`], root);
      args = exists.error ? ['checkout', '--track', branch] : ['checkout', localName];
    }
    const res = await runGit(args, root);
    return res.error ? { error: message(res) } : { ok: true };
  },

  commit: async (root: string, msg: string): Promise<{ success?: boolean; output?: string; error?: string }> => {
    const res = await runGit(['commit', '-m', msg], root);
    return res.error ? { error: message(res) } : { success: true, output: res.stdout };
  },

  stage: async (root: string, files: string[]): Promise<{ success?: boolean; error?: string }> => {
    if (files.length === 0) return { success: true };
    const res = await runGit(['add', '--', ...files], root);
    return res.error ? { error: message(res) } : { success: true };
  },

  stageAll: async (root: string): Promise<{ success?: boolean; error?: string }> => {
    const res = await runGit(['add', '-A'], root);
    return res.error ? { error: message(res) } : { success: true };
  },

  unstage: async (root: string, files: string[]): Promise<{ success?: boolean; error?: string }> => {
    if (files.length === 0) return { success: true };
    const res = await runGit(['restore', '--staged', '--', ...files], root);
    return res.error ? { error: message(res) } : { success: true };
  },

  unstageAll: async (root: string): Promise<{ success?: boolean; error?: string }> => {
    const res = await runGit(['restore', '--staged', '--', '.'], root);
    return res.error ? { error: message(res) } : { success: true };
  },

  scopeTransfer: async (
    root: string,
    targetRoot: string,
    files: string[],
  ): Promise<{ transferred?: number; conflicts?: string[]; error?: string }> => {
    const src = path.resolve(root);
    const dst = path.resolve(targetRoot);
    if (src === dst) return { error: 'Source and target must be different branches' };
    const rels = [...new Set(files)];
    for (const rel of rels) {
      const a = path.resolve(src, rel);
      const b = path.resolve(dst, rel);
      if (path.isAbsolute(rel) || !a.startsWith(`${src}${path.sep}`) || !b.startsWith(`${dst}${path.sep}`)) {
        return { error: `Invalid path: ${rel}` };
      }
    }
    for (const rel of rels) {
      const isDir = await fs
        .stat(path.resolve(src, rel))
        .then((s) => s.isDirectory())
        .catch(() => false);
      if (isDir) return { error: `Not a file: ${rel}` };
    }
    if (rels.length === 0) return { transferred: 0 };
    const literal = (list: string[]) => list.map((p) => `:(literal)${p}`);

    const dirty = await runGit(['status', '--porcelain', '--', ...literal(rels)], dst);
    if (dirty.error) return { error: message(dirty) };
    const dirtyPaths = dirty.stdout
      .split('\n')
      .filter(Boolean)
      .map((l) => l.slice(3).trim().replace(/^"|"$/g, ''));
    const sameContent = async (rel: string): Promise<boolean> => {
      const [a, b] = await Promise.all(
        [src, dst].map((r) => fs.readFile(path.resolve(r, rel), 'utf-8').catch(() => null)),
      );
      if (a === null || b === null) return a === b;
      const squash = (s: string) =>
        s
          .split(/\r?\n/)
          .map((l) => l.trimEnd())
          .filter((l) => l.trim() !== '')
          .join('\n');
      return squash(a) === squash(b);
    };
    const conflicts: string[] = [];
    for (const rel of dirtyPaths) if (!(await sameContent(rel))) conflicts.push(rel);
    if (conflicts.length > 0) {
      return { conflicts, error: 'Target branch already has uncommitted changes in these files' };
    }

    for (const rel of rels) {
      const a = path.resolve(src, rel);
      const b = path.resolve(dst, rel);
      const exists = await fs
        .stat(a)
        .then((s) => s.isFile())
        .catch(() => false);
      if (exists) {
        await fs.mkdir(path.dirname(b), { recursive: true });
        await fs.copyFile(a, b);
      } else {
        await fs.rm(b, { force: true });
      }
    }

    const inHead: string[] = [];
    const fresh: string[] = [];
    for (const rel of rels) {
      const res = await runGit(['cat-file', '-e', `HEAD:${rel}`], src);
      (res.error ? fresh : inHead).push(rel);
    }
    for (let i = 0; i < inHead.length; i += 200) {
      const res = await runGit(
        ['restore', '--source=HEAD', '--staged', '--worktree', '--', ...literal(inHead.slice(i, i + 200))],
        src,
      );
      if (res.error) return { error: message(res) };
    }
    if (fresh.length > 0) {
      await runGit(['rm', '-r', '--cached', '--ignore-unmatch', '-q', '--', ...literal(fresh)], src);
      for (const rel of fresh) await fs.rm(path.resolve(src, rel), { force: true });
    }
    return { transferred: rels.length };
  },

  clone: async (url: string, dest: string, branch?: string): Promise<{ ok: boolean }> => {
    const args = ['clone', ...(branch ? ['--branch', branch] : []), '--', url, dest];
    const res = await runGit(args, process.cwd());
    if (res.error) throw new Error(message(res));
    return { ok: true };
  },

  checkReady: async (root: string): Promise<{ hasGit: boolean; hasStaged: boolean; reason?: string }> => {
    const inside = await runGit(['rev-parse', '--is-inside-work-tree'], root);
    if (inside.error || inside.stdout.trim() !== 'true') {
      return { hasGit: false, hasStaged: false, reason: 'Workspace is not a git repository' };
    }
    const staged = await runGit(['diff', '--cached', '--name-only'], root);
    const hasStaged = !staged.error && staged.stdout.trim().length > 0;
    return { hasGit: true, hasStaged, reason: hasStaged ? undefined : 'No staged changes. Run git add first.' };
  },
};