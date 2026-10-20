/**
 * Hook quét danh sách git repo trong workspace (đệ quy 4 cấp) — dùng
 * chung cho cả HomePanel và ChatPanel để tái sử dụng flow Generate
 * Commit Message.
 *
 * Ported from Zen: temp/Zen/src/webview-ui/src/hooks/useGitRepoScanner.ts
 */

import { useCallback, useState } from 'react';
import { extensionService } from '@renderer/components/RightPanel/Zen/services/ExtensionService';

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

export const useGitRepoScanner = () => {
  const [repos, setRepos] = useState<GitRepoInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async (): Promise<GitRepoInfo[]> => {
    setLoading(true);
    setError(null);
    const requestId = `scanGitRepos-${Date.now()}`;

    try {
      const result = await new Promise<{
        repos: GitRepoInfo[];
        error?: string;
      }>((resolve) => {
        // Phantoma ExtensionService pattern for scanGitRepos
        const handler = (event: MessageEvent) => {
          const msg = event.data;
          if (msg?.command === 'scanGitReposResult' && msg?.requestId === requestId) {
            window.removeEventListener('message', handler);
            clearTimeout(timeoutId);
            resolve({ repos: msg.repos || [], error: msg.error });
          }
        };

        window.addEventListener('message', handler);

        const timeoutId = setTimeout(() => {
          window.removeEventListener('message', handler);
          resolve({ repos: [], error: 'Scan git repos timeout' });
        }, 15000);

        extensionService.postMessage({ command: 'scanGitRepos', requestId });
      });

      if (result.error) {
        setError(result.error);
        setRepos([]);
        return [];
      }

      setRepos(result.repos);
      return result.repos;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scan failed';
      setError(message);
      setRepos([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { repos, loading, error, scan };
};
