import { request } from '../client';
import type { GitStatusResult, GitErr, GitLogResult, GitChangedInOtherBranchesResult, GitRemoteDiffResult } from '../types/git.types';

export const gitApi = {
  status: (gitRoot: string) =>
    request<GitStatusResult>('GET', `/git/status?gitRoot=${encodeURIComponent(gitRoot)}`),
  ignoredPaths: (gitRoot: string) =>
    request<string[]>('GET', `/git/ignored-paths?gitRoot=${encodeURIComponent(gitRoot)}`),
  explorerState: (root: string, scope: string[], active: boolean) =>
    request<{
      files: Record<string, 'added' | 'modified' | 'deleted'>;
      visible: Record<string, 'added' | 'modified' | 'deleted'>;
      ignoredPaths: string[];
      ghosts: Record<string, Array<[string, 'file' | 'folder']>>;
      otherFiles: Record<string, string[]>;
      stats: {
        primary: string[];
        warn: string[];
        diff: string[];
        error: string[];
        deletedPaths: string[];
        otherBranches: string[];
      };
    }>(
      'GET',
      `/git/explorer-state?root=${encodeURIComponent(root)}&scope=${encodeURIComponent(JSON.stringify(scope))}&active=${active ? 1 : 0}`,
    ),
  changedInOtherBranches: (root: string) =>
    request<GitChangedInOtherBranchesResult>(
      'GET',
      `/git/changed-in-other-branches?root=${encodeURIComponent(root)}`,
    ),
  remoteDiff: (root: string, remoteHash: string) =>
    request<GitRemoteDiffResult>(
      'GET',
      `/git/remote-diff?root=${encodeURIComponent(root)}&remoteHash=${encodeURIComponent(remoteHash)}`,
    ),
  diffVsDefault: (root: string) =>
    request<{ files: string[] | null }>(
      'GET',
      `/git/diff-vs-default?root=${encodeURIComponent(root)}`,
    ),
  defaultBranch: (root: string) =>
    request<{ name: string }>('GET', `/git/default-branch?root=${encodeURIComponent(root)}`),
  fetch: (root: string) =>
    request<{ ok?: boolean; output?: string; error?: string }>('POST', '/git/fetch', { root }),
  fileDiffVsRemote: (root: string, filePath: string) =>
    request<{ diff?: string; remoteRef?: string; error?: string }>(
      'GET',
      `/git/file-diff-vs-remote?root=${encodeURIComponent(root)}&filePath=${encodeURIComponent(filePath)}`,
    ),
  commitPushFiles: (root: string, files: string[], message: string) =>
    request<{ ok?: boolean; committed?: boolean; error?: string }>('POST', '/git/commit-push-files', {
      root,
      files,
      message,
    }),
  push: (root: string) => request<{ ok?: boolean; error?: string }>('POST', '/git/push', { root }),
  stagedDiff: (root: string) =>
    request<{ diff?: string; error?: string }>('GET', `/git/staged-diff?root=${encodeURIComponent(root)}`),
  unpushed: (root: string) =>
    request<{ hashes?: string[]; error?: string }>('GET', `/git/unpushed?root=${encodeURIComponent(root)}`),
  checkout: (root: string, branch: string) =>
    request<{ ok?: boolean; error?: string }>('POST', '/git/checkout', { root, branch }),
  commit: (root: string, message: string) =>
    request<{ success?: boolean; output?: string; error?: string }>('POST', '/git/commit', { root, message }),
  stage: (root: string, files: string[]) =>
    request<{ success?: boolean; error?: string }>('POST', '/git/stage', { root, files }),
  scopeTransfer: (root: string, targetRoot: string, files: string[]) =>
    request<{ transferred?: number; conflicts?: string[]; error?: string }>('POST', '/git/scope-transfer', {
      root,
      targetRoot,
      files,
    }),
  stageAll: (root: string) =>
    request<{ success?: boolean; error?: string }>('POST', '/git/stage-all', { root }),
  unstage: (root: string, files: string[]) =>
    request<{ success?: boolean; error?: string }>('POST', '/git/unstage', { root, files }),
  unstageAll: (root: string) =>
    request<{ success?: boolean; error?: string }>('POST', '/git/unstage-all', { root }),
  pruneOrphanBranches: (root: string) =>
    request<{ pruned?: string[]; skipped?: string; error?: string }>('POST', '/git/prune-orphan-branches', { root }),
  clone: (url: string, dest: string, branch?: string) =>
    request<{ ok: boolean }>('POST', '/git/clone', { url, dest, branch }),
  protectStatus: (root: string) =>
    request<{ protected?: boolean; conflict?: boolean; error?: string }>(
      'GET',
      `/git/protect-status?root=${encodeURIComponent(root)}`,
    ),
  protectEnable: (root: string) =>
    request<{ ok?: boolean; error?: string }>('POST', '/git/protect-enable', { root }),
  protectDisable: (root: string) =>
    request<{ ok?: boolean; error?: string }>('POST', '/git/protect-disable', { root }),
  checkReady: (root: string) =>
    request<{ hasGit: boolean; hasStaged: boolean; reason?: string }>(
      'GET',
      `/git/check-ready?root=${encodeURIComponent(root)}`,
    ),
  log: (root: string, limit?: number, ref?: string) => {
    const q = new URLSearchParams({ root });
    if (limit) q.set('limit', String(limit));
    if (ref) q.set('ref', ref);
    return request<GitLogResult>('GET', `/git/log?${q.toString()}`);
  },
  branches: (root: string) =>
    request<{ branches: string[]; worktreePaths: Record<string, string> } & GitErr>(
      'GET',
      `/git/branches?root=${encodeURIComponent(root)}`,
    ),
  tags: (root: string) =>
    request<{ tags: string[] } & GitErr>('GET', `/git/tags?root=${encodeURIComponent(root)}`),
  resolveRef: (root: string, ref: string) =>
    request<{ hash: string } & GitErr>(
      'GET',
      `/git/resolve-ref?root=${encodeURIComponent(root)}&ref=${encodeURIComponent(ref)}`,
    ),
  isRepo: (root: string) =>
    request<boolean>('GET', `/git/is-repo?root=${encodeURIComponent(root)}`),
  repoIdentity: (root: string) =>
    request<{ commonDir: string; remoteUrl: string; branch: string } | null>(
      'GET',
      `/git/repo-identity?root=${encodeURIComponent(root)}`,
    ),
  commitDiff: (root: string, hash: string) =>
    request<{ diff: string } & GitErr>(
      'GET',
      `/git/commit-diff?root=${encodeURIComponent(root)}&hash=${encodeURIComponent(hash)}`,
    ),
  localDiff: (root: string, branch: string, branchRoot?: string) =>
    request<{ diff: string } & GitErr>(
      'GET',
      `/git/local-diff?root=${encodeURIComponent(root)}&branch=${encodeURIComponent(branch)}${
        branchRoot ? `&branchRoot=${encodeURIComponent(branchRoot)}` : ''
      }`,
    ),
  commitBody: (root: string, hash: string) =>
    request<{ message: string } & GitErr>(
      'GET',
      `/git/commit-body?root=${encodeURIComponent(root)}&hash=${encodeURIComponent(hash)}`,
    ),
  commitFiles: (root: string, hash: string) =>
    request<
      | { files: Array<{ added: number; deleted: number; path: string; status: 'added' | 'modified' | 'deleted' }> }
      & GitErr
    >('GET', `/git/commit-files?root=${encodeURIComponent(root)}&hash=${encodeURIComponent(hash)}`),
  remoteUrl: (root: string) =>
    request<{ url: string } & GitErr>('GET', `/git/remote-url?root=${encodeURIComponent(root)}`),
  localChanges: (root: string, clones?: Record<string, string>) =>
    request<{ branches: Array<{ name: string; files: any[] }> } & GitErr>(
      'GET',
      `/git/local-changes?root=${encodeURIComponent(root)}${
        clones && Object.keys(clones).length ? `&clones=${encodeURIComponent(JSON.stringify(clones))}` : ''
      }`,
    ),
  fileDiff: (root: string, filePath: string) =>
    request<{ output: string } & GitErr>(
      'GET',
      `/git/file-diff?root=${encodeURIComponent(root)}&filePath=${encodeURIComponent(filePath)}`,
    ),
  languageStats: (root: string) =>
    request<Array<{ id: string; name: string; percentage: number }>>(
      'GET',
      `/git/language-stats?root=${encodeURIComponent(root)}`,
    ),
  repoInfo: (root: string) =>
    request<{
      repoUrl: string;
      author: string;
      contributors: Array<{ username: string }>;
      branches: Array<{ name: string; lastCommitDate: number; commitCount: number; isCurrent: boolean }>;
    } | null>('GET', `/git/repo-info?root=${encodeURIComponent(root)}`),
};
