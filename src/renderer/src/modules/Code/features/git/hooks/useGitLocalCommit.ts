// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { useCallback, useMemo, useState } from 'react';

// ── Components ──
import type { FileChangeAction } from '../components/modals/ConfirmFileChangeModal';

// ── Services ──
import { codeApi } from '../../../shared/api/code.api';
import { toastService } from '@renderer/components/ui/Toast';

// ── Utils ──
import type { CommitFile } from '../utils/graph.util';

// ─── Types ───────────────────────────────────────────────────────────────────
interface UseGitLocalCommitProps {
  localRoot: string;
  selectedVirtual: { name: string; files: CommitFile[] } | null;
  refresh: () => Promise<void>;
  showNotice: (msg: string) => void;
  runFileOp: (
    channel: string,
    payload: unknown,
    okMsg: string,
    opts?: unknown,
    root?: string,
  ) => Promise<void>;
}

interface UseGitLocalCommitReturn {
  localBusy: boolean;
  pendingOp: { action: FileChangeAction; file: CommitFile } | null;
  setPendingOp: (op: { action: FileChangeAction; file: CommitFile } | null) => void;
  fileActions:
    | {
        onStage: (f: CommitFile) => void;
        onUnstage: (f: CommitFile) => void;
        onDiscard: (f: CommitFile) => void;
      }
    | undefined;
  localCommit: {
    busy: boolean;
    onNotice: (msg: string) => void;
    onStage: (paths: string[]) => Promise<void>;
    onCommit: (message: string) => Promise<boolean>;
  };
  confirmPendingOp: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useGitLocalCommit({
  localRoot,
  selectedVirtual,
  refresh,
  showNotice,
  runFileOp,
}: UseGitLocalCommitProps): UseGitLocalCommitReturn {
  // ── State ──
  const [localBusy, setLocalBusy] = useState(false);
  const [pendingOp, setPendingOp] = useState<{ action: FileChangeAction; file: CommitFile } | null>(
    null,
  );

  // ── Derived ──
  const fileActions = useMemo(
    () =>
      selectedVirtual
        ? {
            onStage: (f: CommitFile) => setPendingOp({ action: 'stage', file: f }),
            onUnstage: (f: CommitFile) => setPendingOp({ action: 'unstage', file: f }),
            onDiscard: (f: CommitFile) => setPendingOp({ action: 'discard', file: f }),
          }
        : undefined,
    [selectedVirtual],
  );

  const localCommit = useMemo(
    () => ({
      busy: localBusy,
      onNotice: showNotice,
      onStage: async (paths: string[]) => {
        setLocalBusy(true);
        console.log('[DEBUG][git:stage] start', {
          localRoot,
          count: paths.length,
          paths: paths.slice(0, 20),
        });
        const toastId = toastService.show({
          id: 'git-stage',
          variant: 'loading',
          title: 'Git add',
          description: `Staging ${paths.length} files...`,
        });
        try {
          const res = await codeApi.git.stage(localRoot, paths).catch((e: any) => {
            console.error('[DEBUG][git:stage] threw', e);
            return { error: e?.message || String(e) };
          });
          console.log('[DEBUG][git:stage] result', res);
          if (res?.error) console.error('[DEBUG][git:stage] full error:\n' + String(res.error));
          toastService.show(
            res?.error
              ? {
                  id: toastId,
                  variant: 'error',
                  title: 'Git add failed',
                  description: String(res.error).split('\n')[0],
                  duration: 6000,
                }
              : {
                  id: toastId,
                  variant: 'success',
                  title: 'Git add done',
                  description: `Staged ${paths.length} files`,
                  duration: 3000,
                },
          );
          await refresh();
          console.log('[DEBUG][git:stage] refresh done');
        } finally {
          setLocalBusy(false);
        }
      },
      onCommit: async (message: string) => {
        setLocalBusy(true);
        try {
          const res = await codeApi.git
            .commit(localRoot, message)
            .catch((e: any) => ({ error: e?.message || String(e) }));
          const failed = !!res?.error;
          showNotice(failed ? String(res.error).split('\n')[0] : 'Committed');
          if (!failed) await refresh();
          return !failed;
        } finally {
          setLocalBusy(false);
        }
      },
    }),
    [localBusy, localRoot, refresh, showNotice],
  );

  // ── Callbacks ──
  const confirmPendingOp = useCallback(() => {
    if (!pendingOp) return;
    const { action, file: f } = pendingOp;
    if (action === 'stage')
      void runFileOp('git:stage', [f.path], `Staged ${f.path}`, undefined, localRoot);
    else if (action === 'unstage')
      void runFileOp('git:unstage', [f.path], `Unstaged ${f.path}`, undefined, localRoot);
    else
      void runFileOp(
        'git:discard',
        [f.path],
        `Discarded ${f.path}`,
        {
          untracked: !!f.untracked,
          staged: !f.untracked && !!f.staged,
        },
        localRoot,
      );
  }, [pendingOp, runFileOp, localRoot]);

  return {
    localBusy,
    pendingOp,
    setPendingOp,
    fileActions,
    localCommit,
    confirmPendingOp,
  };
}