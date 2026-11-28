// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { useMemo } from 'react';

// ── Utils ──
import type { Commit } from '../utils/graph.util';

// ── Types ──
import type { ProjectBranch } from '../types/project-branch.types';

// ─── Types ───────────────────────────────────────────────────────────────────
interface UseGitBranchesProps {
  branches: string[];
  commits: Commit[];
  projectBranches?: ProjectBranch[];
  projectPath: string;
  worktreePaths: Record<string, string>;
  activeBranch: string | null;
  currentBranch: string | null;
}

interface UseGitBranchesReturn {
  currentBranch: string | null;
  cloneBranchPaths: Record<string, string>;
  validBranches: string[];
  localBranches: string[];
  remoteBranches: string[];
  syncTargets: Array<{ name: string; path: string }>;
  syncSourceLabel: (commit: Commit) => string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useGitBranches({
  branches,
  commits,
  projectBranches,
  projectPath,
  worktreePaths,
  activeBranch,
}: UseGitBranchesProps): UseGitBranchesReturn {
  // ── Derived ──
  const currentBranch = useMemo(() => {
    for (const c of commits) {
      const ref = c.refs.find((r) => r.startsWith('HEAD -> '));
      if (ref) return ref.slice(8);
    }
    return null;
  }, [commits]);

  const cloneBranchPaths = useMemo(() => {
    const map: Record<string, string> = {};
    for (const b of projectBranches ?? []) {
      if (b.path && b.path !== projectPath) map[b.name] = b.path;
    }
    return map;
  }, [projectBranches, projectPath]);

  const validBranches = useMemo(() => {
    const base = branches.filter((b) => b !== 'origin' && !b.endsWith('/HEAD'));
    const extra = Object.keys(cloneBranchPaths).filter((n) => !base.includes(n));
    return [...base, ...extra];
  }, [branches, cloneBranchPaths]);

  const localBranches = useMemo(
    () => validBranches.filter((b) => !b.startsWith('origin/')),
    [validBranches],
  );

  const remoteBranches = useMemo(
    () => validBranches.filter((b) => b.startsWith('origin/')),
    [validBranches],
  );

  const syncTargets = useMemo(() => {
    const list = currentBranch ? [{ name: currentBranch, path: projectPath }] : [];
    Object.entries({ ...cloneBranchPaths, ...worktreePaths }).forEach(([name, path]) =>
      list.push({ name, path }),
    );
    return list;
  }, [currentBranch, projectPath, worktreePaths, cloneBranchPaths]);

  const syncSourceLabel = useMemo(
    () => (commit: Commit) => {
      const parseRefs = (refs: string[]) => {
        return refs.map((r) => {
          if (r.startsWith('origin/')) return { kind: 'remote' as const, label: r };
          if (r.startsWith('HEAD -> ')) return { kind: 'head' as const, label: r.slice(8) };
          return { kind: 'local' as const, label: r };
        });
      };
      const chips = parseRefs(commit.refs);
      const remote = chips.find((c) => c.kind === 'remote');
      const local = chips.find((c) => c.kind === 'head' || c.kind === 'local');
      const branch = remote
        ? remote.label
        : `origin/${local?.label ?? activeBranch ?? currentBranch ?? 'HEAD'}`;
      return `${branch} - ${commit.hash.slice(0, 7)}`;
    },
    [activeBranch, currentBranch],
  );

  return {
    currentBranch,
    cloneBranchPaths,
    validBranches,
    localBranches,
    remoteBranches,
    syncTargets,
    syncSourceLabel,
  };
}