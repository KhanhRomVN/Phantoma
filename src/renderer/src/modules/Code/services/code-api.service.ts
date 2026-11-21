import { resolveCodeBaseUrl } from './code-base-url';

export interface CodeWorkspacePanel {
  id: string;
  type: string;
  title?: string;
  content?: string | null;
  filePath?: string | null;
  cwd?: string | null;
  providerId?: string | null;
  zencliConversationId?: string | null;
  zencliLastActiveAt?: number | null;
  agentConversationId?: string | null;
  agentTitle?: string | null;
  workflowAgentId?: string | null;
  pinned?: boolean;
}

export interface CodeWorkspaceInput {
  panels?: CodeWorkspacePanel[];
  layout?: unknown;
  activePanelId?: string | null;
}

export interface CodeSession {
  id: string;
  worktreeId: string;
  title: string;
  layout: unknown;
  activePanelId: string | null;
  panels?: CodeWorkspacePanel[];
  createdAt: string;
  updatedAt: string;
}

export interface CodeSessionInput {
  id?: string;
  worktreeId?: string;
  projectId?: string;
  worktreePath?: string;
  title?: string;
}

export interface CodeWorktree {
  id: string;
  projectId: string;
  path: string;
  branch: string;
  visible: boolean;
  searchTerm: string;
  session?: CodeSession | null;
}

export interface CodeProject {
  id: string;
  logo: string | null;
  name: string;
  repositoryUrl?: string | null;
  groupId?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  worktrees: CodeWorktree[];
}

export type CodeWorktreeInput = Partial<
  Pick<CodeWorktree, 'path' | 'branch' | 'visible' | 'searchTerm'>
>;

export interface CodeProjectInput {
  id?: string;
  name?: string;
  logo?: string | null;
  repositoryUrl?: string | null;
  groupId?: string | null;
  sortOrder?: number;
  worktrees?: CodeWorktreeInput[];
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${await resolveCodeBaseUrl()}/api/v1${path}`;
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.success) {
    throw new Error(payload?.error ?? `Code server error (HTTP ${res.status})`);
  }
  return payload.data as T;
}

export interface CodeTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'todo' | 'progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  sessionId: string | null;
  branchName: string | null;
  startDate: number | null;
  startTime: string | null;
  endDate: number | null;
  endTime: string | null;
  archived: boolean;
  workflowId: string | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  tags: Array<{ id: string; label: string; color: string }>;
  checklist: Array<{ id: string; text: string; done: boolean }>;
  attachments: Array<{ path: string; kind: 'file' | 'folder' }>;
  dependsOn: string[];
}

export interface CodeTaskInput {
  title: string;
  description?: string;
  status?: 'todo' | 'progress' | 'done';
  priority?: 'low' | 'medium' | 'high';
  sessionId?: string | null;
  branchName?: string | null;
  startDate?: number | null;
  startTime?: string | null;
  endDate?: number | null;
  endTime?: string | null;
  tags?: Array<{ id?: string; label: string; color: string }>;
  checklist?: Array<{ id?: string; text: string; done: boolean }>;
  attachments?: Array<{ path: string; kind: 'file' | 'folder' }>;
  dependsOn?: string[];
}

export interface CodeTaskUpdateInput extends Partial<CodeTaskInput> {
  archived?: boolean;
  workflowId?: string | null;
  sortOrder?: number;
}

export interface CodeWorkflow {
  id: string;
  taskId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  mtime: number;
}

export interface GitStatusResult {
  files: Record<string, 'added' | 'modified' | 'deleted'>;
  output: string;
  diffStats: Record<string, { added: number; deleted: number }>;
  unpushedCommits: string[];
  committedFiles: string[];
  branch: string;
}

export interface GitErr {
  error?: string;
}

export interface GitLogCommit {
  hash: string;
  parents: string[];
  author: string;
  email: string;
  date: number;
  refs: string[];
  subject: string;
}

export type GitLogResult = { commits: GitLogCommit[] } & GitErr;

export interface FileStat {
  size: number;
  isDirectory: boolean;
  isFile: boolean;
  mtime: number;
  ctime: number;
}

export interface TreeNode {
  name: string;
  type: 'file' | 'folder';
  size?: number;
  children?: TreeNode[];
}

export interface SquareImage {
  path: string;
  name: string;
  width: number;
  height: number;
  size: number;
}

export interface ReadDirEntry {
  name: string;
  type: 'file' | 'folder';
  size?: number;
}

export interface GitChangedInOtherBranchesResult {
  files: Record<string, string[]>;
}

export interface GitRemoteDiffResult {
  files: Set<string>;
}

export const codeApi = {
  health: async (): Promise<boolean> => {
    try {
      const res = await fetch(`${await resolveCodeBaseUrl()}/health`);
      return res.ok;
    } catch {
      return false;
    }
  },

  projects: {
    list: () => request<CodeProject[]>('GET', '/projects'),
    get: (id: string) => request<CodeProject>('GET', `/projects/${id}`),
    create: (input: CodeProjectInput & { name: string }) =>
      request<CodeProject>('POST', '/projects', input),
    update: (id: string, input: CodeProjectInput) =>
      request<CodeProject>('PUT', `/projects/${id}`, input),
    saveAll: (projects: CodeProjectInput[]) =>
      request<CodeProject[]>('PUT', '/projects', { projects }),
    remove: (id: string) => request<{ deleted: boolean }>('DELETE', `/projects/${id}`),
  },

  sessions: {
    create: (input: CodeSessionInput) => request<CodeSession>('POST', '/sessions', input),
    update: (id: string, input: CodeSessionInput) =>
      request<CodeSession>('PUT', `/sessions/${id}`, input),
    saveWorkspace: (id: string, input: CodeWorkspaceInput) =>
      request<CodeSession>('PUT', `/sessions/${id}/workspace`, input),
    remove: (id: string) => request<{ deleted: boolean }>('DELETE', `/sessions/${id}`),
  },
  worktrees: {
    list: (projectId: string) => request<CodeWorktree[]>('GET', `/projects/${projectId}/worktrees`),
    create: (projectId: string, input: CodeWorktreeInput & { path: string }) =>
      request<CodeWorktree>('POST', `/projects/${projectId}/worktrees`, input),
    update: (projectId: string, id: string, input: CodeWorktreeInput) =>
      request<CodeWorktree>('PUT', `/projects/${projectId}/worktrees/${id}`, input),
    remove: (projectId: string, id: string) =>
      request<{ deleted: boolean }>('DELETE', `/projects/${projectId}/worktrees/${id}`),
  },

  tasks: {
    list: (projectId: string) => request<CodeTask[]>('GET', `/projects/${projectId}/tasks`),
    get: (projectId: string, taskId: string) =>
      request<CodeTask>('GET', `/projects/${projectId}/tasks/${taskId}`),
    create: (projectId: string, input: CodeTaskInput) =>
      request<CodeTask>('POST', `/projects/${projectId}/tasks`, input),
    update: (projectId: string, taskId: string, input: CodeTaskUpdateInput) =>
      request<CodeTask>('PUT', `/projects/${projectId}/tasks/${taskId}`, input),
    remove: (projectId: string, taskId: string) =>
      request<{ deleted: boolean }>('DELETE', `/projects/${projectId}/tasks/${taskId}`),
  },

  workflows: {
    get: (taskId: string) => request<CodeWorkflow>('GET', `/tasks/${taskId}/workflow`),
    create: (taskId: string, content: string) =>
      request<CodeWorkflow>('POST', `/tasks/${taskId}/workflow`, { content }),
    update: (taskId: string, oldContent: string, newContent: string) =>
      request<CodeWorkflow>('PUT', `/tasks/${taskId}/workflow`, { oldContent, newContent }),
  },

  fs: {
    listDir: (path: string) =>
      request<DirEntry[]>('GET', `/fs/list-dir?path=${encodeURIComponent(path)}`),
    readDir: async (path: string): Promise<ReadDirEntry[]> => {
      const entries = await request<DirEntry[]>('GET', `/fs/list-dir?path=${encodeURIComponent(path)}`);
      return entries.map((e) => ({ name: e.name, type: e.isDirectory ? 'folder' : 'file', size: e.size }));
    },
    writeFile: (path: string, content: string, allowSensitive = false) =>
      request<{ success: boolean }>('POST', '/fs/write-file', { path, content, allowSensitive }),
    readFile: (path: string, trusted = false, range?: { start: number; end?: number }) => {
      const q = new URLSearchParams({ path });
      if (trusted) q.set('trusted', 'true');
      if (range) {
        q.set('start', String(range.start));
        if (range.end !== undefined) q.set('end', String(range.end));
      }
      return request<string>('GET', `/fs/read-file?${q.toString()}`);
    },
    grep: (
      searchTerm: string,
      target: { filePath?: string; folderPath?: string },
      options: { maxFiles?: number; maxFileSize?: number; exclude?: string[] } = {},
    ) =>
      request<{
        searchTerm: string;
        pattern: string;
        results: Record<string, { matches: Array<{ lineNumber: number; lineContent: string }> }>;
        totalFilesSearched: number;
        totalMatches: number;
        filesSkippedSize?: number;
      }>('POST', '/fs/grep', { searchTerm, ...target, ...options }),
    stat: (path: string, trusted = false) =>
      request<FileStat>('GET', `/fs/stat?path=${encodeURIComponent(path)}${trusted ? '&trusted=true' : ''}`),
    tree: (path: string, depth = 1, options: { exclude?: string[]; hidden?: boolean } = {}) => {
      const q = new URLSearchParams({ path, depth: String(depth) });
      if (options.exclude?.length) q.set('exclude', options.exclude.join(','));
      if (options.hidden === false) q.set('hidden', 'false');
      return request<TreeNode[]>('GET', `/fs/tree?${q.toString()}`);
    },
    findFiles: (root: string, pattern: string, options: { max?: number; exclude?: string[] } = {}) => {
      const q = new URLSearchParams({ root, pattern });
      if (options.max) q.set('max', String(options.max));
      if (options.exclude?.length) q.set('exclude', options.exclude.join(','));
      return request<Array<{ path: string }>>('GET', `/fs/find-files?${q.toString()}`);
    },
    listProjectFiles: (root: string) =>
      request<{ files: string[] }>('GET', `/fs/list-project-files?root=${encodeURIComponent(root)}`),
    scanSquareImages: (root: string) =>
      request<SquareImage[]>('GET', `/fs/scan-square-images?root=${encodeURIComponent(root)}`),
    image: (path: string, side?: number) =>
      request<string | null>(
        'GET',
        `/fs/image?path=${encodeURIComponent(path)}${side ? `&side=${side}` : ''}`,
      ),
    downloadLogo: (url: string) =>
      request<{ success: boolean; path?: string; error?: string }>('POST', '/projects/logo/download', { url }),
    mkdir: (path: string) => request<{ success: boolean }>('POST', '/fs/mkdir', { path }),
    rename: (oldPath: string, newPath: string) =>
      request<{ success: boolean }>('POST', '/fs/rename', { oldPath, newPath }),
    copy: (src: string, dest: string) =>
      request<{ success: boolean }>('POST', '/fs/copy', { src, dest }),
    deleteFile: (path: string) =>
      request<{ success: boolean }>('DELETE', `/fs/delete-file?path=${encodeURIComponent(path)}`),
    removeDir: (path: string) =>
      request<{ success: boolean }>('DELETE', `/fs/remove-dir?path=${encodeURIComponent(path)}`),
  },

  git: {
    status: (gitRoot: string) =>
      request<GitStatusResult>('GET', `/git/status?gitRoot=${encodeURIComponent(gitRoot)}`),
    ignoredPaths: (gitRoot: string) =>
      request<string[]>('GET', `/git/ignored-paths?gitRoot=${encodeURIComponent(gitRoot)}`),
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
    checkout: (root: string, branch: string) =>
      request<{ ok?: boolean; error?: string }>('POST', '/git/checkout', { root, branch }),
    commit: (root: string, message: string) =>
      request<{ success?: boolean; output?: string; error?: string }>('POST', '/git/commit', { root, message }),
    stage: (root: string, files: string[]) =>
      request<{ success?: boolean; error?: string }>('POST', '/git/stage', { root, files }),
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
    localDiff: (root: string, branch: string) =>
      request<{ diff: string } & GitErr>(
        'GET',
        `/git/local-diff?root=${encodeURIComponent(root)}&branch=${encodeURIComponent(branch)}`,
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
    localChanges: (root: string) =>
      request<{ branches: Array<{ name: string; files: any[] }> } & GitErr>(
        'GET',
        `/git/local-changes?root=${encodeURIComponent(root)}`,
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
  },

  pr: {
    status: (root: string) =>
      request<Record<string, any>>('GET', `/pr/status?root=${encodeURIComponent(root)}`),
    loginToken: (root: string, token: string) =>
      request<{ ok?: boolean; error?: string }>('POST', '/pr/login-token', { root, token }),
    loginWeb: (root: string) =>
      request<{ code?: string; url?: string; error?: string }>('POST', '/pr/login-web', { root }),
    cancelLoginWeb: () => request<{ ok: boolean }>('POST', '/pr/login-web/cancel', {}),
    list: (root: string, state: string, limit: number) =>
      request<{ prs?: any[]; error?: string }>(
        'GET',
        `/pr/list?root=${encodeURIComponent(root)}&state=${encodeURIComponent(state)}&limit=${limit}`,
      ),
    view: (root: string, number: number) =>
      request<{ pr?: any; error?: string }>('GET', `/pr/${number}?root=${encodeURIComponent(root)}`),
    diff: (root: string, number: number) =>
      request<{ diff?: string; error?: string }>('GET', `/pr/${number}/diff?root=${encodeURIComponent(root)}`),
    create: (
      root: string,
      input: { title: string; body?: string; base?: string; head?: string; draft?: boolean; push?: boolean },
    ) => request<{ ok?: boolean; url?: string; error?: string }>('POST', '/pr', { root, ...input }),
    action: (root: string, number: number, verb: string, args: unknown[]) => {
      const bodies: Record<string, (a: unknown[]) => object> = {
        merge: ([method, deleteBranch]) => ({ method, deleteBranch }),
        close: ([comment]) => ({ comment }),
        comment: ([body]) => ({ body }),
        review: ([action, body]) => ({ action, body }),
      };
      return request<{ ok?: boolean; output?: string; error?: string }>('POST', `/pr/${number}/${verb}`, {
        root,
        ...(bodies[verb]?.(args) ?? {}),
      });
    },
  },

  scopes: {
    list: (worktreeId: string) =>
      request<Array<{ id: string; worktreeId: string; path: string; createdAt: string }>>(
        'GET',
        `/worktrees/${worktreeId}/scopes`,
      ),
    set: (worktreeId: string, paths: string[]) =>
      request<Array<{ id: string; worktreeId: string; path: string; createdAt: string }>>(
        'PUT',
        `/worktrees/${worktreeId}/scopes`,
        { paths },
      ),
    get: (worktreeId: string, scopeId: string) =>
      request<{ id: string; worktreeId: string; path: string; createdAt: string }>(
        'GET',
        `/worktrees/${worktreeId}/scopes/${scopeId}`,
      ),
    remove: (worktreeId: string, scopeId: string) =>
      request<{ deleted: boolean }>('DELETE', `/worktrees/${worktreeId}/scopes/${scopeId}`),
  },

  search: {
    stream: async (
      searchId: string,
      projectPath: string,
      query: string,
      options: {
        caseSensitive?: boolean;
        wholeWord?: boolean;
        isRegex?: boolean;
        includePattern?: string;
        excludePattern?: string;
      },
      onChunk: (
        results: Array<{
          file: string;
          matches: Array<{ lineNumber: number; lineContent: string; column: number }>;
        }>,
      ) => void,
      onDone: (result: {
        totalMatches: number;
        totalFiles: number;
        truncated: boolean;
        error?: string;
      }) => void,
    ): Promise<void> => {
      const params = new URLSearchParams({
        searchId,
        projectPath,
        query,
        caseSensitive: String(options.caseSensitive ?? false),
        wholeWord: String(options.wholeWord ?? false),
        isRegex: String(options.isRegex ?? false),
      });
      if (options.includePattern) params.set('includePattern', options.includePattern);
      if (options.excludePattern) params.set('excludePattern', options.excludePattern);

      const url = `${await resolveCodeBaseUrl()}/api/v1/search/stream?${params.toString()}`;
      const eventSource = new EventSource(url);

      eventSource.addEventListener('chunk', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.searchId === searchId && data.results) {
            onChunk(data.results);
          }
        } catch (err) {
          console.error('[codeApi.search.stream] Failed to parse chunk:', err);
        }
      });

      eventSource.addEventListener('done', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.searchId === searchId) {
            onDone({
              totalMatches: data.totalMatches ?? 0,
              totalFiles: data.totalFiles ?? 0,
              truncated: data.truncated ?? false,
              error: data.error,
            });
          }
        } catch (err) {
          console.error('[codeApi.search.stream] Failed to parse done:', err);
        }
        eventSource.close();
      });

      eventSource.onerror = () => {
        eventSource.close();
        onDone({ totalMatches: 0, totalFiles: 0, truncated: false, error: 'Connection lost' });
      };
    },

    cancel: (searchId: string) =>
      request<{ cancelled: boolean }>('POST', '/search/cancel', { searchId }),
  },
};
