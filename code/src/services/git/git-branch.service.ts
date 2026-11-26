import path from 'path';
import { runGit, failure, lines, type GitResult } from '../../infra/git-runner';
import { resolveDefaultBranch } from './default-branch';

const message = (res: GitResult): string => res.stderr || res.error?.message || 'git command failed';

export const gitBranchService = {
  listBranches: async (root: string) => {
    const res = await runGit(['branch', '-a', '--format=%(refname:short)'], root);
    if (res.error) return failure(res);

    const branches = lines(res.stdout)
      .map((l) => l.trim())
      .filter((l) => !l.startsWith('remotes/origin/HEAD'));

    const worktreePaths: Record<string, string> = {};
    const wtList = await runGit(['worktree', 'list', '--porcelain'], root);
    if (!wtList.error) {
      const mainRoot = path.resolve(root);
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
        if (!wtPath || !ref || path.resolve(wtPath) === mainRoot) continue;
        worktreePaths[ref.replace(/^refs\/heads\//, '')] = wtPath;
      }
    }
    const goneBranches: string[] = [];
    const tracked = await runGit(['for-each-ref', '--format=%(refname:short)%09%(upstream:track)', 'refs/heads'], root);
    if (!tracked.error) {
      for (const row of lines(tracked.stdout)) {
        const [name, track] = row.split('\t');
        if (name && track?.trim() === '[gone]') goneBranches.push(name.trim());
      }
    }
    return { branches, worktreePaths, goneBranches };
  },

  publishBranch: async (root: string): Promise<{ ok?: boolean; error?: string }> => {
    const dirty = await runGit(['status', '--porcelain'], root);
    if (dirty.error) return { error: message(dirty) };
    if (dirty.stdout.trim()) return { error: 'Worktree has uncommitted changes' };
    const current = await runGit(['branch', '--show-current'], root);
    const name = current.stdout.trim();
    if (!name) return { error: 'No local branch checked out' };
    const push = await runGit(['push', '-u', 'origin', name], root);
    if (push.error) return { error: message(push) };
    return { ok: true };
  },

  pruneOrphanBranches: async (root: string): Promise<{ pruned?: string[]; skipped?: string; error?: string }> => {
    await runGit(['worktree', 'prune'], root);

    const { name: defaultBranch } = await resolveDefaultBranch(root);
    if (!defaultBranch) return { pruned: [], skipped: 'no default branch' };

    const merged = await runGit(['branch', '--merged', defaultBranch, '--format=%(refname:short)'], root);
    if (merged.error) return { error: message(merged) };

    const protectedNames = new Set<string>([defaultBranch]);
    const current = await runGit(['branch', '--show-current'], root);
    if (current.stdout.trim()) protectedNames.add(current.stdout.trim());
    const wtList = await runGit(['worktree', 'list', '--porcelain'], root);
    for (const line of wtList.stdout.split('\n')) {
      if (line.startsWith('branch ')) protectedNames.add(line.slice(7).trim().replace(/^refs\/heads\//, ''));
    }

    const pruned: string[] = [];
    for (const name of merged.stdout.split('\n').map((l) => l.trim()).filter(Boolean)) {
      if (protectedNames.has(name)) continue;
      const del = await runGit(['branch', '-d', name], root);
      if (!del.error) pruned.push(name);
    }
    return { pruned };
  },
};