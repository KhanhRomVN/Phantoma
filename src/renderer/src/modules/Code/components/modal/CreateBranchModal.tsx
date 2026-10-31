import { useEffect, useId, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  FileDiff,
  Folder,
  GitBranch,
  GitCommit,
  Loader2,
} from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalHeader } from '@renderer/components/ui/Modal/ModalHeader';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import { Button } from '@renderer/components/ui/Button/Button';
import {
  ConfirmCreateBranchModal,
  autoSelectIgnored,
  type BranchProgress,
  type ScanProgress,
  type WorktreePreview,
} from './ConfirmCreateBranchModal';
import { TreeUIPreview } from './TreeUIPreview';

type CopyMode = 'latest-commit' | 'local' | 'commit';

interface CommitItem {
  hash: string;
  subject: string;
  author: string;
  date: number;
}

const CARD =
  'flex w-full items-center gap-3 rounded-md border-l-2 border-transparent bg-input-background px-3 py-2.5 text-left outline-none transition-colors';

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
  existingBranch,
  existingBranchRemote,
  projectLogoPath,
  onCreated,
}: CreateBranchModalProps) {
  const [name, setName] = useState('');
  const [source, setSource] = useState('');
  const [currentBranch, setCurrentBranch] = useState('');
  const [changedFiles, setChangedFiles] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [preview, setPreview] = useState<WorktreePreview | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [progress, setProgress] = useState<BranchProgress | null>(null);
  const [targetDir, setTargetDir] = useState('');
  const [copyMode, setCopyMode] = useState<'local' | 'commit'>('local');
  const [commits, setCommits] = useState<CommitItem[]>([]);
  const [commitsLoading, setCommitsLoading] = useState(false);
  const [selectedHash, setSelectedHash] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [commitQuery, setCommitQuery] = useState('');


  const nameId = useId();
  const sourceId = useId();

  const localNames = branches.filter((b) => !remoteBranches.includes(b));
  const sourceOptions = [...localNames, ...remoteBranches];

  useEffect(() => {
    if (!isOpen) return;
    setName(existingBranch ?? '');
    setTargetDir(parentDir(projectPath));
    setError('');
    setSubmitting(false);
    setConfirmOpen(false);
    setPreview(null);
    setSelectedPaths([]);
    setChangedFiles(0);
    setCopyMode('local');
    setPickerOpen(false);
    setCommitQuery('');

    setSource(
      defaultSource && sourceOptions.includes(defaultSource)
        ? defaultSource
        : (sourceOptions[0] ?? ''),
    );
    (window as any).api
      .invoke('git:status', projectPath)
      .then((res: any) => setCurrentBranch(res?.branch ?? ''))
      .catch(() => setCurrentBranch(''));
    (window as any).api
      .invoke('git:worktree-preview', projectPath, undefined, false)
      .then((res: any) => setChangedFiles(res?.changedFiles ?? 0))
      .catch(() => setChangedFiles(0));
  }, [isOpen]);

  const trimmedName = name.trim();
  const slug = trimmedName.replace(/\//g, '-');
  const bareName = trimmedName.replace(/^origin\//, '');
  const takenRemote =
    !existingBranch && bareName !== '' && remoteBranches.includes(bareName);
  const takenLocal =
    !existingBranch && bareName !== '' && !takenRemote && localNames.includes(bareName);
  const nameTaken = takenLocal || takenRemote;
  const sourceRef = remoteBranches.includes(source) ? `origin/${source}` : source;
  const localAvailable = source !== '' && source === currentBranch;
  useEffect(() => {
    if (!isOpen || existingBranch || !sourceRef) return;
    let cancelled = false;
    setCommitsLoading(true);
    setSelectedHash(null);
    (window as any).api
      .invoke('git:log', projectPath, 100, sourceRef)
      .then((res: any) => {
        if (!cancelled) setCommits(res?.commits ?? []);
      })
      .catch(() => {
        if (!cancelled) setCommits([]);
      })
      .finally(() => {
        if (!cancelled) setCommitsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, sourceRef, projectPath, existingBranch]);

  const activeCommit = commits.find((c) => c.hash === selectedHash) ?? commits[0] ?? null;
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPickerOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [pickerOpen]);
  const effectiveMode: CopyMode =
    copyMode === 'local' && localAvailable ? 'local' : activeCommit ? 'commit' : 'latest-commit';
  const folderName = `${projectName}-${slug || 'branch-name'}`;
  const canSubmit = trimmedName !== '' && !nameTaken && source !== '' && !submitting;

  const actionTitle = existingBranch ? 'Create Project As Remote Branch' : 'Create Local Branch';

  const worktreeFolder = `${targetDir || '..'}/`;

  const pickFolder = async () => {
    try {
      const res = await (window as any).api.invoke('dialog:select-paths', { kind: 'folder' });
      if (res?.success && res.paths?.[0]) setTargetDir(res.paths[0]);
    } catch {
      setError('Không thể mở hộp thoại chọn thư mục');
    }
  };

  const localDetail = localAvailable
    ? changedFiles > 0
      ? `Latest commit of ${source} plus ${changedFiles} uncommitted file${changedFiles > 1 ? 's' : ''} and untracked files.`
      : `${source} is checked out and clean, so this equals its latest commit.`
    : `Only available when ${source || 'the source branch'} is checked out${
        currentBranch ? ` (currently ${currentBranch})` : ''
      }.`;
  const commitDetail = activeCommit
    ? `${activeCommit.hash.slice(0, 7)} · ${activeCommit.subject}`
    : commitsLoading
      ? 'Loading commits…'
      : 'No commits found on this branch.';
  const commitQueryLower = commitQuery.trim().toLowerCase();
  const filteredCommits = commitQueryLower
    ? commits.filter((c) =>
        `${c.hash} ${c.subject} ${c.author}`.toLowerCase().includes(commitQueryLower),
      )
    : commits;

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
        effectiveMode === 'commit' ? activeCommit?.hash : undefined,
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
                  <label htmlFor={sourceId} className="mb-1.5 block text-[12px] text-text-secondary">
                    From
                  </label>
                  <Dropdown align="start" sideOffset={4} className="w-full">
                    <DropdownTrigger>
                      <button
                        id={sourceId}
                        type="button"
                        className={cn(FIELD, 'flex items-center justify-between gap-2 px-3 text-left')}
                      >
                        <span className="truncate">{source || 'Select branch'}</span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                      </button>
                    </DropdownTrigger>
                    <DropdownContent className="max-h-[220px] overflow-y-auto">
                      {sourceOptions.map((b) => (
                        <DropdownItem
                          key={b}
                          icon={<Check className={cn('h-3.5 w-3.5 text-primary', b !== source && 'invisible')} />}
                          onClick={() => setSource(b)}
                        >
                          <span className="truncate">{b}</span>
                        </DropdownItem>
                      ))}
                    </DropdownContent>
                  </Dropdown>
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
                    <p className="mt-1.5 text-[13px] text-error">
                      A remote branch named origin/{bareName} already exists. Open it from the project menu
                      instead.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-1.5 text-[12px] text-text-secondary">Copy As...</div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={!localAvailable}
                    onClick={() => setCopyMode('local')}
                    className={cn(
                      CARD,
                      effectiveMode === 'local' && 'rounded-l-none border-primary',
                      localAvailable ? 'hover:bg-white/[0.04]' : 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-9 w-9 shrink-0 place-items-center rounded-md',
                        effectiveMode === 'local' ? 'bg-primary/15' : 'bg-white/[0.04]',
                      )}
                    >
                      <FileDiff
                        className={cn(
                          'h-5 w-5',
                          effectiveMode === 'local' ? 'text-primary' : 'text-text-secondary',
                        )}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-text-primary">Local</div>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-text-secondary">
                        {localDetail}
                      </p>
                    </div>
                    {effectiveMode === 'local' && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>

                  <div ref={pickerRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setCopyMode('commit');
                        setPickerOpen((o) => !o);
                      }}
                      className={cn(
                        CARD,
                        effectiveMode !== 'local' && 'rounded-l-none border-primary',
                        'hover:bg-white/[0.04]',
                      )}
                    >
                      <span
                        className={cn(
                          'grid h-9 w-9 shrink-0 place-items-center rounded-md',
                          effectiveMode !== 'local' ? 'bg-primary/15' : 'bg-white/[0.04]',
                        )}
                      >
                        <GitCommit
                          className={cn(
                            'h-5 w-5',
                            effectiveMode !== 'local' ? 'text-primary' : 'text-text-secondary',
                          )}
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-text-primary">Selected commit</div>
                        <p className="mt-0.5 truncate text-[13px] leading-relaxed text-text-secondary">
                          {commitDetail}
                        </p>
                      </div>
                      {commitsLoading ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-text-secondary" />
                      ) : (
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 shrink-0 text-text-secondary transition-transform',
                            pickerOpen && 'rotate-180',
                          )}
                        />
                      )}
                    </button>

                    {pickerOpen && (
                      <div className="mt-2 overflow-hidden rounded-md bg-input-background">
                        <input
                          value={commitQuery}
                          onChange={(e) => setCommitQuery(e.target.value)}
                          placeholder="Search by message, author or hash"
                          spellCheck={false}
                          className="h-9 w-full bg-white/[0.04] px-3 text-[13px] text-text-primary outline-none placeholder:text-text-secondary/40"
                        />
                        <div className="max-h-[220px] overflow-y-auto">
                          {filteredCommits.length === 0 ? (
                            <p className="px-3 py-4 text-center text-[13px] text-text-secondary">
                              No matching commits
                            </p>
                          ) : (
                            filteredCommits.map((c) => (
                              <button
                                key={c.hash}
                                type="button"
                                onClick={() => {
                                  setSelectedHash(c.hash);
                                  setCopyMode('commit');
                                  setPickerOpen(false);
                                }}
                                className="flex w-full items-center gap-3 px-3 py-2 text-left outline-none transition-colors hover:bg-white/[0.04]"
                              >
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[13px] text-text-primary">
                                    {c.subject}
                                  </span>
                                  <span className="block truncate text-[12px] text-text-secondary">
                                    <span className="font-mono text-primary">{c.hash.slice(0, 7)}</span>
                                    {` · ${c.author} · ${new Date(c.date).toLocaleDateString()}`}
                                  </span>
                                </span>
                                {activeCommit?.hash === c.hash && (
                                  <Check className="h-4 w-4 shrink-0 text-primary" />
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="mt-5">
            <div className="mb-1.5 text-[12px] text-text-secondary">Folder name</div>
            <div className="flex h-9 items-center rounded-md bg-input-background px-3">
              <span className="truncate font-mono text-[13.5px] text-text-primary">{folderName}</span>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-1.5 text-[12px] text-text-secondary">Saved to</div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 min-w-0 flex-1 items-center rounded-md bg-input-background px-3">
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
            {existingBranch && (
              <p className="mt-2 break-all text-[13px] leading-relaxed text-text-secondary">
                {existingBranchRemote
                  ? `A local branch ${existingBranch} will be created, tracking origin/${existingBranch}.`
                  : `${existingBranch} will be checked out in the new folder.`}
              </p>
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
            />
          </div>

          {error && !confirmOpen && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-3 py-2 text-[13px] text-error">
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
              <span className="break-words">{error}</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-divider px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="h-8 rounded-md px-3 text-[13px] font-medium text-text-secondary outline-none transition-colors hover:bg-white/[0.04] hover:text-text-primary focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50"
          >
            Cancel
          </button>
          <Button
            variant="soft"
            size="sm"
            className="h-8 gap-1.5 font-semibold"
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