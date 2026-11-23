import { useEffect, useId, useRef, useState } from 'react';
import {
  AlertCircle,
  Folder,
  GitBranch,
  Loader2,
} from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalHeader } from '@renderer/components/ui/Modal/ModalHeader';

import { Button } from '@renderer/components/ui/Button/Button';
import {
  ConfirmCreateBranchModal,
  autoSelectIgnored,
  type BranchProgress,
  type ScanProgress,
  type WorktreePreview,
} from './ConfirmCreateBranchModal';
import { TreeUIPreview } from './TreeUIPreview';
import { codeApi } from '../../../../shared/api/code.api';

type CopyMode = 'latest-commit' | 'local' | 'commit';

export interface CreatedBranchResult {
  branch: string;
  path: string;
}

interface CreateBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectPath: string;
  projectName: string;
  branches: string[];
  remoteBranches?: string[];
  defaultSource?: string;
  existingBranch?: string;
  existingBranchRemote?: boolean;
  projectLogoPath?: string | null;
  onCreated: (result: CreatedBranchResult) => void;
}

const FIELD =
  'w-full h-9 rounded-md bg-input-background text-[13px] text-text-primary outline-none transition-colors placeholder:text-text-secondary/40';

const parentDir = (p: string) => p.replace(/\/+$/, '').replace(/\/[^/]*$/, '') || '/';

export function CreateBranchModal({
  isOpen,
  onClose,
  projectPath,
  projectName,
  branches,
  remoteBranches = [],
  defaultSource,
  existingBranch: existingBranchProp,
  existingBranchRemote: existingBranchRemoteProp,
  projectLogoPath,
  onCreated,
}: CreateBranchModalProps) {
  const [remoteOverride, setRemoteOverride] = useState<string | null>(null);
  const existingBranch = existingBranchProp ?? remoteOverride ?? undefined;
  const existingBranchRemote = existingBranchProp
    ? existingBranchRemoteProp
    : remoteOverride !== null;
  const [name, setName] = useState('');
  const [source, setSource] = useState('');
  const [currentBranch, setCurrentBranch] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [preview, setPreview] = useState<WorktreePreview | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [progress, setProgress] = useState<BranchProgress | null>(null);
  const [targetDir, setTargetDir] = useState('');
  const [siblingDirs, setSiblingDirs] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen || !targetDir) {
      setSiblingDirs([]);
      return;
    }
    let cancelled = false;
    const load = () => {
      codeApi.fs
        .listDir(targetDir)
        .then((entries: any) => {
          if (cancelled) return;
          const dirs = Array.isArray(entries)
            ? entries.filter((e: any) => e.isDirectory).map((e: any) => e.name as string)
            : [];
          const next = dirs.sort((a, b) => a.localeCompare(b));
          setSiblingDirs((prev) =>
            prev.length === next.length && prev.every((n, i) => n === next[i]) ? prev : next,
          );
        })
        .catch(() => {
          if (!cancelled) setSiblingDirs([]);
        });
    };
    load();
    const timer = setInterval(load, 1500);
    window.addEventListener('focus', load);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('focus', load);
    };
  }, [isOpen, targetDir]);

  const nameId = useId();
  const sourceId = useId();

  const localNames = branches.filter((b) => !remoteBranches.includes(b));
  const sourceOptions = [...localNames, ...remoteBranches];

  useEffect(() => {
    if (!isOpen) return;
    setRemoteOverride(null);
    setName(existingBranchProp ?? '');
    setTargetDir(parentDir(projectPath));
    setError('');
    setSubmitting(false);
    setConfirmOpen(false);
    setPreview(null);
    setSelectedPaths([]);

    setSource(
      defaultSource && sourceOptions.includes(defaultSource)
        ? defaultSource
        : (sourceOptions[0] ?? ''),
    );
    // ASSUMED: nguồn cố định = default branch của origin
    codeApi.git
      .defaultBranch(projectPath)
      .then((res) => {
        const n = (res?.name ?? '').replace(/^origin\//, '');
        if (n) setSource(n);
      })
      .catch(() => {});
    codeApi.git
      .status(projectPath)
      .then((res: any) => setCurrentBranch(res?.branch ?? ''))
      .catch(() => setCurrentBranch(''));

  }, [isOpen]);

  const trimmedName = name.trim();
  const slug = trimmedName.replace(/\//g, '-');
  const bareName = trimmedName.replace(/^origin\//, '');
  const takenRemote =
    !existingBranch && bareName !== '' && remoteBranches.includes(bareName);
  const takenLocal =
    !existingBranch && bareName !== '' && !takenRemote && localNames.includes(bareName);
  const nameTaken = takenLocal || takenRemote;
  const sourceRef = source ? `origin/${source.replace(/^origin\//, '')}` : '';
  const effectiveMode: CopyMode = 'latest-commit';
  const folderName = `${projectName}-${slug || 'branch-name'}`;
  const folderExists = siblingDirs.includes(folderName);
  const canSubmit =
    trimmedName !== '' && !nameTaken && !folderExists && source !== '' && !submitting;

  const actionTitle = existingBranch ? 'Create Project As Remote Branch' : 'Create Branch';

  const worktreeFolder = `${targetDir || '..'}/`;

  const pickFolder = async () => {
    try {
      const res = await (window as any).api.invoke('dialog:select-paths', { kind: 'folder' });
      if (res?.success && res.paths?.[0]) setTargetDir(res.paths[0]);
    } catch {
      setError('Không thể mở hộp thoại chọn thư mục');
    }
  };


  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const scanIdRef = useRef<string | null>(null);

  const stopScan = () => {
    if (scanIdRef.current) {
      (window as any).api.invoke('git:worktree-preview-cancel', scanIdRef.current).catch(() => {});
    }
  };

  const openConfirm = async () => {
    if (!canSubmit) return;
    setError('');
    setPreview(null);
    setScanProgress(null);
    setConfirmOpen(true);
    const requestId = `scan-${Date.now()}`;
    scanIdRef.current = requestId;
    const off = (window as any).api.on(
      'git:worktree-preview-progress',
      (_e: unknown, p: ScanProgress) => {
        if (p.requestId === requestId) setScanProgress(p);
      },
    );
    try {
      const res: WorktreePreview = await (window as any).api.invoke(
        'git:worktree-preview',
        projectPath,
        requestId,
        true,
      );
      setPreview(res);
      setSelectedPaths(autoSelectIgnored(res.ignoredPaths));
    } catch {
      setPreview({ hasGitignore: false, alreadyIgnored: false, changedFiles: 0, ignoredPaths: [] });
    } finally {
      off?.();
      scanIdRef.current = null;
      setScanProgress(null);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    setProgress({ step: 'worktree' });
    const off = (window as any).api.on(
      'git:create-branch-progress',
      (_e: unknown, p: BranchProgress) => setProgress(p),
    );
    try {
      const res = await (window as any).api.invoke(
        'git:create-branch-worktree',
        projectPath,
        trimmedName,
        sourceRef,
        effectiveMode,
        selectedPaths,
        targetDir || undefined,
        !!existingBranch,
        undefined,
      );
      if (res?.error) {
        setError(res.error);
        return;
      }
      onCreated(res);
      onClose();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      off?.();
      setProgress(null);
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !confirmOpen}
        onClose={handleClose}
        className="w-[42vw] min-w-[480px] max-w-[820px] max-h-[88vh]"
      >
        <ModalHeader
          title={actionTitle}
          description={
            existingBranch
              ? `Creates a separate folder for ${existingBranch}. ${projectName} detects it as the same git repository and groups it under this project.`
              : `Creates a new branch in its own folder next to ${projectName}. ${projectName} detects it as the same git repository and groups it under this project.`
          }
          onClose={handleClose}
          className="px-6 py-4"
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-5">
          {!existingBranch && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <div className="mb-1.5 text-[12px] text-text-secondary">From</div>
                  <div id={sourceId} className={cn(FIELD, 'flex items-center px-3')}>
                    <span className="truncate font-mono text-[13.5px] text-text-primary">
                      {sourceRef || 'origin/…'}
                    </span>
                  </div>
                </div>
                <div className="min-w-0">
                  <label htmlFor={nameId} className="mb-1.5 block text-[12px] text-text-secondary">
                    New branch
                  </label>
                  <input
                    id={nameId}
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && openConfirm()}
                    placeholder="feature/my-branch"
                    spellCheck={false}
                    className={cn(
                      FIELD,
                      'px-3 font-mono text-[13.5px]',
                      nameTaken && 'ring-1 ring-error',
                    )}
                  />
                  {takenLocal && (
                    <p className="mt-1.5 text-[13px] text-error">
                      A local branch named {bareName} already exists.
                    </p>
                  )}
                  {takenRemote && (
                    <>
                      <p className="mt-1.5 text-[13px] text-error">
                        A remote branch named origin/{bareName} already exists. Open it from the project menu
                        instead.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setRemoteOverride(bareName);
                          setName(bareName);
                          setError('');
                        }}
                        className="mt-2 h-8 cursor-pointer rounded-lg bg-primary/10 px-3 text-[12.5px] font-medium text-primary outline-none transition-colors hover:bg-primary/20 active:bg-primary/30"
                      >
                        Create project as remote branch
                      </button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="mt-5">
            <div className="mb-1.5 text-[12px] text-text-secondary">Folder name</div>
            <div
              className={cn(
                'flex h-9 items-center rounded-md bg-input-background px-3',
                folderExists && 'outline outline-1 -outline-offset-1 outline-dashed outline-error',
              )}
            >
              <span className="truncate font-mono text-[13.5px] text-text-primary">{folderName}</span>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-1.5 text-[12px] text-text-secondary">Saved to</div>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-9 min-w-0 flex-1 items-center rounded-md bg-input-background px-3',
                  folderExists && 'outline outline-1 -outline-offset-1 outline-dashed outline-error',
                )}
              >
                <span
                  className="min-w-0 truncate font-mono text-[12.5px] text-text-secondary"
                  title={worktreeFolder}
                >
                  {worktreeFolder}
                  <span className="text-text-primary">{folderName}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={pickFolder}
                disabled={submitting}
                aria-label="Choose folder"
                title="Choose folder"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-input-background text-text-secondary outline-none transition-colors hover:bg-white/[0.08] hover:text-text-primary focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50"
              >
                <Folder className="h-4 w-4" />
              </button>
            </div>
            {folderExists && (
              <p className="mt-1.5 text-[13px] text-error">
                A folder named {folderName} already exists in this location.
              </p>
            )}
            {existingBranch && (
              <p className="mt-2 break-all text-[13px] leading-relaxed text-text-secondary">
                {existingBranchRemote
                  ? `A local branch ${existingBranch} will be created, tracking origin/${existingBranch}.`
                  : `${existingBranch} will be checked out in the new folder.`}
              </p>
            )}
            {remoteOverride !== null && !existingBranchProp && (
              <button
                type="button"
                onClick={() => setRemoteOverride(null)}
                disabled={submitting}
                className="mt-2 h-8 cursor-pointer rounded-lg bg-text-secondary/10 px-3 text-[12.5px] font-medium text-text-secondary outline-none transition-colors hover:bg-text-secondary/15 hover:text-text-primary active:bg-text-secondary/20 disabled:opacity-50"
              >
                Back to Create Branch
              </button>
            )}
          </div>

          <div className="mt-5">
            <div className="mb-1.5 text-[12px] text-text-secondary">Preview</div>
            <TreeUIPreview
              projectName={projectName}
              projectPath={projectPath}
              folderName={folderName}
              targetDir={targetDir}
              logoPath={projectLogoPath}
              projectBranch={currentBranch || defaultSource}
              newBranch={existingBranch ?? (trimmedName || undefined)}
              siblings={siblingDirs}
              hideBadges
              conflict={folderExists}
            />
          </div>

          {error && !confirmOpen && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-3 py-2 text-[13px] text-error">
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
              <span className="break-words">{error}</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button
            onClick={handleClose}
            disabled={submitting}
            className="h-8 rounded-md px-3 text-[13px] font-medium bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/20 hover:text-text-primary active:bg-text-secondary/30 disabled:opacity-50"
          >
            Cancel
          </Button>
          <Button
            className="h-8 gap-1.5 font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-text-primary active:bg-primary/80"
            onClick={openConfirm}
            disabled={!canSubmit}
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <GitBranch className="h-3.5 w-3.5" />
            )}
            {submitting ? 'Creating…' : 'Review & create'}
          </Button>
        </div>
      </Modal>

      <ConfirmCreateBranchModal
        isOpen={isOpen && confirmOpen}
        onClose={() => {
          stopScan();
          setConfirmOpen(false);
        }}
        onConfirm={handleSubmit}
        submitting={submitting}
        error={error}
        actionTitle={actionTitle}
        confirmLabel={existingBranch ? 'Create folder' : 'Create branch'}
        existing={!!existingBranch}
        projectName={projectName}
        source={source}
        branchName={trimmedName}
        slug={slug}
        mode={effectiveMode}
        preview={preview}
        selectedPaths={selectedPaths}
        onSelectedPathsChange={setSelectedPaths}
        progress={progress}
        scanProgress={scanProgress}
        onStopScan={stopScan}
        projectPath={projectPath}
        folderName={folderName}
        targetDir={targetDir}
        logoPath={projectLogoPath}
        projectBranch={currentBranch || defaultSource}
      />
    </>
  );
}

export default CreateBranchModal;