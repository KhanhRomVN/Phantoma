// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { useCallback, useState } from 'react';

// ── UI ──
import { toastService, type ToastVariant } from '@renderer/components/ui/Toast';

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
  showNotice: (title: string, variant?: ToastVariant, description?: string) => void;
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

const firstLine = (err: unknown): string => String(err).split('\n')[0];

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
          showNotice('Cannot resolve branch', 'error', res?.error ? firstLine(res.error) : name);
          return;
        }
        if (commits.some((c) => c.hash === res.hash)) {
          selectHash(res.hash, 'center');
          setActiveBranch(name);
        } else {
          showNotice(
            'Commit not loaded',
            'warning',
            `Tip of "${name}" (${res.hash.slice(0, 7)}) is outside the loaded 300 commits`,
          );
        }
      } catch (e: any) {
        showNotice('Cannot jump to branch', 'error', firstLine(e?.message || e));
      } finally {
        setBusyBranch(null);
      }
    },
    [commits, localChanges, projectPath, cloneBranchPaths, selectHash, showNotice],
  );

  const handleCheckout = useCallback(
    async (name: string) => {
      setBusyBranch(name);
      const id = toastService.show({
        id: 'git-checkout',
        variant: 'loading',
        title: 'Checking out',
        description: name,
      });
      try {
        const res = await codeApi.git
          .checkout(projectPath, name)
          .catch((e: any) => ({ error: e?.message || String(e) }));
        if (res?.error) {
          toastService.show({
            id,
            variant: 'error',
            title: 'Checkout failed',
            description: firstLine(res.error),
          });
        } else {
          toastService.show({
            id,
            variant: 'success',
            title: 'Checked out',
            description: name,
          });
          await refresh();
        }
      } finally {
        setBusyBranch(null);
      }
    },
    [projectPath, refresh],
  );

  const handlePush = useCallback(
    async (root?: string) => {
      setPushing(true);
      const id = toastService.show({
        id: 'git-push',
        variant: 'loading',
        title: 'Pushing',
        description: 'Pushing commits to remote...',
      });
      try {
        const res = await codeApi.git
          .push(root ?? projectPath)
          .catch((e: any) => ({ error: e?.message || String(e) }));
        toastService.show(
          res?.error
            ? { id, variant: 'error', title: 'Push failed', description: firstLine(res.error) }
            : { id, variant: 'success', title: 'Pushed', description: 'Commits were pushed to remote' },
        );
        await refresh();
      } finally {
        setPushing(false);
      }
    },
    [projectPath, refresh],
  );

  const runFileOp = useCallback(
    async (channel: string, payload: unknown, okMsg: string, opts?: unknown, root?: string) => {
      const res: any = await gitIpc
        .invoke(channel, root ?? projectPath, payload, ...(opts === undefined ? [] : [opts]))
        .catch((e: any) => ({ error: e?.message || String(e) }));
      if (res?.error) showNotice('Git operation failed', 'error', firstLine(res.error));
      else showNotice(okMsg, 'success');
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