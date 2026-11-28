// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { useCallback, useState } from 'react';

// ── Services ──
import { codeApi } from '../../../shared/api/code.api';
import { gitIpc } from '../../../shared/ipc/git.ipc';

// ── Utils ──
import type { Commit } from '../utils/graph.util';
import { VIRTUAL_PREFIX } from '../constants/git-view.constants';

// ─── Types ───────────────────────────────────────────────────────────────────
interface UseGitActionsProps {
  projectPath: string;
  commits: Commit[];
  localChanges: Array<{ name: string }>;
  cloneBranchPaths: Record<string, string>;
  refresh: () => Promise<void>;
  showNotice: (msg: string) => void;
  selectHash: (hash: string, block?: ScrollLogicalPosition) => void;
}

interface UseGitActionsReturn {
  busyBranch: string | null;
  pushing: boolean;
  activeBranch: string | null;
  setActiveBranch: (branch: string | null) => void;
  jumpToBranch: (name: string) => Promise<void>;
  handleCheckout: (name: string) => Promise<void>;
  handlePush: (root?: string) => Promise<void>;
  runFileOp: (
    channel: string,
    payload: unknown,
    okMsg: string,
    opts?: unknown,
    root?: string,
  ) => Promise<void>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useGitActions({
  projectPath,
  commits,
  localChanges,
  cloneBranchPaths,
  refresh,
  showNotice,
  selectHash,
}: UseGitActionsProps): UseGitActionsReturn {
  // ── State ──
  const [busyBranch, setBusyBranch] = useState<string | null>(null);
  const [pushing, setPushing] = useState(false);
  const [activeBranch, setActiveBranch] = useState<string | null>(null);

  // ── Callbacks ──
  const jumpToBranch = useCallback(
    async (name: string) => {
      if (localChanges.some((lc) => lc.name === name)) {
        selectHash(VIRTUAL_PREFIX + name, 'center');
        setActiveBranch(name);
        return;
      }
      setBusyBranch(name);
      try {
        const clonePath = cloneBranchPaths[name];
        let res: any = await codeApi.git.resolveRef(
          clonePath ?? projectPath,
          clonePath ? 'HEAD' : name,
        );
        if (clonePath && !commits.some((c) => c.hash === res?.hash)) {
          const remote: any = await codeApi.git.resolveRef(projectPath, `origin/${name}`);
          if (remote?.hash) res = remote;
        }
        if (res?.error || !res?.hash) {
          showNotice(`Cannot resolve "${name}"`);
          return;
        }
        if (commits.some((c) => c.hash === res.hash)) {
          selectHash(res.hash, 'center');
          setActiveBranch(name);
        } else {
          showNotice(
            `Tip of "${name}" (${res.hash.slice(0, 7)}) is outside the loaded 300 commits`,
          );
        }
      } finally {
        setBusyBranch(null);
      }
    },
    [commits, localChanges, projectPath, cloneBranchPaths, selectHash, showNotice],
  );

  const handleCheckout = useCallback(
    async (name: string) => {
      setBusyBranch(name);
      try {
        const res = await codeApi.git
          .checkout(projectPath, name)
          .catch((e: any) => ({ error: e?.message || String(e) }));
        if (res?.error) {
          showNotice(String(res.error).split('\n')[0]);
        } else {
          showNotice(`Checked out "${name}"`);
          await refresh();
        }
      } finally {
        setBusyBranch(null);
      }
    },
    [projectPath, refresh, showNotice],
  );

  const handlePush = useCallback(
    async (root?: string) => {
      setPushing(true);
      try {
        const res = await codeApi.git
          .push(root ?? projectPath)
          .catch((e: any) => ({ error: e?.message || String(e) }));
        showNotice(res?.error ? String(res.error).split('\n')[0] : 'Pushed');
        await refresh();
      } finally {
        setPushing(false);
      }
    },
    [projectPath, refresh, showNotice],
  );

  const runFileOp = useCallback(
    async (channel: string, payload: unknown, okMsg: string, opts?: unknown, root?: string) => {
      const res = await gitIpc.invoke(
        channel,
        root ?? projectPath,
        payload,
        ...(opts === undefined ? [] : [opts]),
      );
      showNotice(res?.error ? String(res.error).split('\n')[0] : okMsg);
      await refresh();
    },
    [projectPath, refresh, showNotice],
  );

  return {
    busyBranch,
    pushing,
    activeBranch,
    setActiveBranch,
    jumpToBranch,
    handleCheckout,
    handlePush,
    runFileOp,
  };
}