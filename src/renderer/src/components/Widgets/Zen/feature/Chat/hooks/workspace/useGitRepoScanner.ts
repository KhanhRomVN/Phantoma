/**
 * Hook quét danh sách git repo trong workspace (đệ quy 4 cấp) — dùng
 * chung cho cả HomePanel và ChatPanel để tái sử dụng flow Generate
 * Commit Message.
 *
 * Ported from Zen: temp/Zen/src/webview-ui/src/hooks/useGitRepoScanner.ts
 */

import { useCallback, useState } from 'react';
import { extensionService } from '@renderer/components/Widgets/Zen/services/ExtensionService';

export interface GitRepoInfo {
  relPath: string;
  absPath: string;
  branch: string;
  staged: number;
  unstaged: number;
  untracked: number;
  added: number;
  deleted: number;
  unpushed: number;
}

export interface GitCommitInfo {
  hash: string;
  subject: string;
  author: string;
  date: string;
}

export interface GitBranchInfo {
  name: string;
  isCurrent: boolean;
  unpushed: number;
  commits: GitCommitInfo[];
}

export interface GitFileInfo {
  path: string;
  status: string;
  staged: boolean;
}

export interface GitRepoDetail {
  branches: GitBranchInfo[];
  files: GitFileInfo[];
}

/**
 * Fetch chi tiết một git repo cụ thể (branches + files).
 * Phantoma backend cần implement handler `scanGitRepoDetail` tương ứng.
 */
export const fetchGitRepoDetail = (absPath: string): Promise<GitRepoDetail> =>
  new Promise((resolve, reject) => {
    const requestId = `scanGitRepoDetail-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // Phantoma ExtensionService pattern:
    // Đăng ký listener cho response message có cùng requestId.
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg?.command === 'scanGitRepoDetailResult' && msg?.requestId === requestId) {
        window.removeEventListener('message', handler);
        clearTimeout(timeoutId);
        if (msg.error || !msg.detail) {
          reject(new Error(msg.error || 'No detail returned'));
        } else {
          resolve(msg.detail);
        }
      }
    };

    window.addEventListener('message', handler);

    const timeoutId = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Load repo detail timeout'));
    }, 15000);

    extensionService.postMessage({
      command: 'scanGitRepoDetail',
      requestId,
      absPath,
    });
  });

export const useGitRepoScanner = (rootPath?: string) => {
  const [repos, setRepos] = useState<GitRepoInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async (): Promise<GitRepoInfo[]> => {
    setLoading(true);
    setError(null);
    // Debug log - có thể xóa sau khi fix
    console.log('[DEBUG][GitScan] start', {
      rootPath,
      hasApiInvoke: typeof (window as any).api?.invoke,
    });

    try {
      const api = (window as any).api;
      if (!api?.invoke) throw new Error('window.api.invoke is not available');

      const result = (await api.invoke('scanGitRepos', {
        command: 'scanGitRepos',
        rootPath,
      })) as { repos?: GitRepoInfo[]; error?: string } | undefined;

      // Debug log - có thể xóa sau khi fix
      console.log('[DEBUG][GitScan] result', {
        error: result?.error,
        count: result?.repos?.length ?? 0,
        repos: result?.repos,
      });

      if (result?.error) {
        setError(result.error);
        setRepos([]);
        return [];
      }

      const found = result?.repos ?? [];
      setRepos(found);
      return found;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scan failed';
      console.log('[DEBUG][GitScan] exception', message);
      setError(message);
      setRepos([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [rootPath]);

  return { repos, loading, error, scan };
};