import { useCallback, useEffect, useState } from 'react';
import { codeApi } from '../../../shared/api/code.api';
import type { Commit } from '../utils/graph.util';
import type { LocalChange } from '../types/git-view.types';

interface ProjectBranch {
  name: string;
  path?: string;
}

interface UseGitDataProps {
  projectPath: string;
  projectBranches?: ProjectBranch[];
}

interface UseGitDataReturn {
  commits: Commit[];
  branches: string[];
  tags: string[];
  worktreePaths: Record<string, string>;
  localChanges: LocalChange[];
  loading: boolean;
  error: string | null;
  defaultBranch: string;
  unpushedHashes: Set<string>;
  cloneUnpushed: Record<string, Commit[]>;
  refresh: () => Promise<void>;
}

export function useGitData({
  projectPath,
  projectBranches,
}: UseGitDataProps): UseGitDataReturn {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [worktreePaths, setWorktreePaths] = useState<Record<string, string>>({});
  const [localChanges, setLocalChanges] = useState<LocalChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultBranch, setDefaultBranch] = useState('');
  const [unpushedHashes, setUnpushedHashes] = useState<Set<string>>(new Set());
  const [cloneUnpushed, setCloneUnpushed] = useState<Record<string, Commit[]>>({});

  useEffect(() => {
    if (!projectPath) return;
    codeApi.git
      .defaultBranch(projectPath)
      .then((def: { name?: string }) => {
        setDefaultBranch(def?.name ?? '');
      })
      .catch(() => undefined);
  }, [projectPath]);

  const refresh = useCallback(async () => {
    if (!projectPath) return;
    setLoading(true);
    setError(null);
    try {
      codeApi.git
        .unpushed(projectPath)
        .then((r: { hashes?: string[] }) => {
          setUnpushedHashes(new Set(r?.hashes ?? []));
        })
        .catch(() => {
          setUnpushedHashes(new Set());
        });
      Promise.all(
        (projectBranches ?? [])
          .filter((b) => b.path && b.path !== projectPath)
          .map(async (b) => {
            const u: { hashes?: string[] } = await codeApi.git.unpushed(b.path as string);
            const hashes = new Set(u?.hashes ?? []);
            if (hashes.size === 0) return [b.name, [] as Commit[]] as const;
            const l: { commits?: Commit[] } = await codeApi.git.log(b.path as string, 300);
            return [b.name, (l?.commits ?? []).filter((c) => hashes.has(c.hash))] as const;
          }),
      )
        .then((entries) => {
          setCloneUnpushed(Object.fromEntries(entries));
        })
        .catch(() => setCloneUnpushed({}));
      const [logRes, branchRes, changeRes, tagRes] = await Promise.all([
        codeApi.git.log(projectPath, 300),
        codeApi.git.branches(projectPath),
        codeApi.git.localChanges(
          projectPath,
          Object.fromEntries(
            (projectBranches ?? []).filter((b) => b.path).map((b) => [b.name, b.path as string]),
          ),
        ),
        codeApi.git.tags(projectPath),
      ]);
      setLocalChanges(changeRes?.branches ?? []);
      setTags(tagRes?.tags ?? []);
      if (logRes?.error) {
        setError(logRes.error);
        setCommits([]);
      } else {
        const list: Commit[] = logRes?.commits ?? [];
        setCommits(list);
      }
      setBranches(branchRes?.branches ?? []);
      setWorktreePaths(branchRes?.worktreePaths ?? {});
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [projectPath, projectBranches]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onRefresh = () => void refresh();
    window.addEventListener('phantoma:git-refresh', onRefresh);
    return () => window.removeEventListener('phantoma:git-refresh', onRefresh);
  }, [refresh]);

  return {
    commits,
    branches,
    tags,
    worktreePaths,
    localChanges,
    loading,
    error,
    defaultBranch,
    unpushedHashes,
    cloneUnpushed,
    refresh,
  };
}