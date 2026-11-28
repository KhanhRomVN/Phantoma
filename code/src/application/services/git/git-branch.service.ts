import path from 'path';
import { failure, lines, type GitResult, type GitDeps } from './git-helpers';

export const createGitBranchService = ({ git, branches }: Pick<GitDeps, 'git' | 'branches'>) => {
  const message = (res: GitResult): string => res.stderr || res.error?.message || 'git command failed';

  return {
    listBranches: async (root: string) => {
      const res = await git.run(['branch', '-a', '--format=%(refname:short)'], root);
      if (res.error) return failure(res);

      const branches = lines(res.stdout)
        .map((l) => l.trim())
        .filter((l) => !l.startsWith('remotes/origin/HEAD'));

      const worktreePaths: Record<string, string> = {};
      const wtList = await git.run(['worktree', 'list', '--porcelain'], root);
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
      const tracked = await git.run(['for-each-ref', '--format=%(refname:short)%09%(upstream:track)', 'refs/heads'], root);
      if (!tracked.error) {
        for (const row of lines(tracked.stdout)) {
          const [name, track] = row.split('\t');
          if (name && track?.trim() === '[gone]') goneBranches.push(name.trim());
        }
      }
      return { branches, worktreePaths, goneBranches };
    },

    publishBranch: async (root: string): Promise<{ ok?: boolean; error?: string }> => {
      const dirty = await git.run(['status', '--porcelain'], root);
      if (dirty.error) return { error: message(dirty) };
      if (dirty.stdout.trim()) return { error: 'Worktree has uncommitted changes' };
      const current = await git.run(['branch', '--show-current'], root);
      const name = current.stdout.trim();
      if (!name) return { error: 'No local branch checked out' };
      const push = await git.run(['push', '-u', 'origin', name], root);
      if (push.error) return { error: message(push) };
      return { ok: true };
    },

    pruneOrphanBranches: async (root: string): Promise<{ pruned?: string[]; skipped?: string; error?: string }> => {
      await git.run(['worktree', 'prune'], root);

      const { name: defaultBranch } = await branches.resolveDefaultBranch(root);
      if (!defaultBranch) return { pruned: [], skipped: 'no default branch' };

      const merged = await git.run(['branch', '--merged', defaultBranch, '--format=%(refname:short)'], root);
      if (merged.error) return { error: message(merged) };

      const protectedNames = new Set<string>([defaultBranch]);
      const current = await git.run(['branch', '--show-current'], root);
      if (current.stdout.trim()) protectedNames.add(current.stdout.trim());
      const wtList = await git.run(['worktree', 'list', '--porcelain'], root);
      for (const line of wtList.stdout.split('\n')) {
        if (line.startsWith('branch ')) protectedNames.add(line.slice(7).trim().replace(/^refs\/heads\//, ''));
      }

      const pruned: string[] = [];
      for (const name of merged.stdout.split('\n').map((l) => l.trim()).filter(Boolean)) {
        if (protectedNames.has(name)) continue;
        const del = await git.run(['branch', '-d', name], root);
        if (!del.error) pruned.push(name);
      }
      return { pruned };
    },
  };
};
