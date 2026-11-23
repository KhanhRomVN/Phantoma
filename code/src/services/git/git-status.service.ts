import path from 'path';
import { gitText, runGit } from '../../infra/git-runner';
import type { FileStatus } from '../../domain/api-types';

const lines = (s: string): string[] => s.split('\n').filter((l) => l.trim());

function parseGitStatus(output: string, gitRoot: string): Record<string, FileStatus> {
  const result: Record<string, FileStatus> = {};
  const base = gitRoot.replace(/\/+$/, '');

  for (const line of lines(output)) {
    if (line.length < 4) continue;
    const status = line.substring(0, 2);
    const fullPath = path.join(base, line.substring(3));

    if (status.includes('A') || status === '??') result[fullPath] = 'added';
    else if (status.includes('D')) result[fullPath] = 'deleted';
    else if (status.includes('M') || status.includes('R') || status.includes('C'))
      result[fullPath] = 'modified';
  }

  return result;
}

function parseNumstat(
  output: string,
  into: Record<string, { added: number; deleted: number }>,
): void {
  for (const line of lines(output)) {
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const fp = parts.slice(2).join('\t').trim();
    if (fp) into[fp] = { added: parseInt(parts[0], 10) || 0, deleted: parseInt(parts[1], 10) || 0 };
  }
}

import type { GitStatusPayload } from '../../domain/api-types';

export type { GitStatusPayload };

export const gitService = {
  status: async (gitRoot: string): Promise<GitStatusPayload> => {
    const [statusRes, diffRes, cachedRes, unpushedRes, branchRes, committedRes] = await Promise.all(
      [
        runGit(['status', '--porcelain', '--untracked-files=all'], gitRoot),
        runGit(['diff', '--numstat'], gitRoot),
        runGit(['diff', '--cached', '--numstat'], gitRoot),
        runGit(['log', 'origin/HEAD..HEAD', '--oneline'], gitRoot),
        runGit(['rev-parse', '--abbrev-ref', 'HEAD'], gitRoot),
        runGit(['diff', '--name-only', 'origin/HEAD..HEAD'], gitRoot),
      ],
    );

    if (statusRes.error) {
      if (statusRes.error.code === 'ENOENT')
        throw new Error('Git is not installed or not in PATH.');
      throw new Error(
        `Failed to get git status: ${statusRes.stderr.trim() || statusRes.error.message}`,
      );
    }

    const diffStats: Record<string, { added: number; deleted: number }> = {};
    parseNumstat(diffRes.stdout, diffStats);
    parseNumstat(cachedRes.stdout, diffStats);

    return {
      files: parseGitStatus(statusRes.stdout, gitRoot),
      output: statusRes.stdout,
      diffStats,
      unpushedCommits: lines(unpushedRes.stdout),
      committedFiles: committedRes.error ? [] : lines(committedRes.stdout),
      branch: branchRes.stdout.trim(),
    };
  },

  statusFiles: async (gitRoot: string): Promise<Record<string, FileStatus>> => {
    const res = await runGit(['status', '--porcelain', '--untracked-files=all'], gitRoot);
    if (res.error) {
      if (res.error.code === 'ENOENT') throw new Error('Git is not installed or not in PATH.');
      throw new Error(`Failed to get git status: ${res.stderr.trim() || res.error.message}`);
    }
    return parseGitStatus(res.stdout, gitRoot);
  },

  ignoredPaths: async (gitRoot: string): Promise<string[]> => {
    const res = await runGit(['ls-files', '--others', '--ignored', '--exclude-standard'], gitRoot);
    if (res.error) return [];
    const base = gitRoot.replace(/\/+$/, '');
    return lines(res.stdout).map((l) => path.join(base, l));
  },

  changedInOtherBranches: async (root: string): Promise<{ files: Record<string, string[]> }> => {
    try {
      const currentBranch = await gitText(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
      const branches = lines(await gitText(root, ['branch', '--format=%(refname:short)'])).filter(
        (b) => b !== currentBranch,
      );
      const base = root.replace(/\/+$/, '');

      const diffs = await Promise.all(
        branches.map(async (branch) => ({
          branch,
          res: await runGit(['diff', '--name-only', `${currentBranch}...${branch}`], root),
        })),
      );

      const files: Record<string, string[]> = {};
      for (const { branch, res } of diffs) {
        if (res.error) continue;
        for (const p of lines(res.stdout)) {
          const fullPath = path.join(base, p);
          (files[fullPath] ??= []).push(branch);
        }
      }
      return { files };
    } catch (err: any) {
      throw new Error(`Failed to get changed files in other branches: ${err.message}`);
    }
  },

  remoteDiff: async (root: string, remoteHash: string): Promise<{ files: Set<string> }> => {
    try {
      const output = await gitText(root, ['diff', '--name-only', remoteHash]);
      const base = root.replace(/\/+$/, '');
      return { files: new Set(lines(output).map((p) => path.join(base, p))) };
    } catch (err: any) {
      throw new Error(`Failed to get remote diff: ${err.message}`);
    }
  },
};
