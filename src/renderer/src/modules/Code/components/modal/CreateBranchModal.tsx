import { useEffect, useId, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  FileDiff,
  Folder,
  GitBranch,
  GitCommit,
  Loader2,
  X,
} from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { Modal } from '@renderer/components/ui/Modal';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import { Button } from '@renderer/components/ui/Button/Button';

type CopyMode = 'latest-commit' | 'local';

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
  defaultSource?: string;
  onCreated: (result: CreatedBranchResult) => void;
}

const FIELD =
  'w-full h-9 rounded-md bg-input-background border border-border text-[13px] text-text-primary outline-none transition-colors placeholder:text-text-secondary/40 focus:border-primary';

const MODES: { id: CopyMode; label: string; icon: typeof GitCommit }[] = [
  { id: 'latest-commit', label: 'Latest commit', icon: GitCommit },
  { id: 'local', label: 'Local changes', icon: FileDiff },
];

export function CreateBranchModal({
  isOpen,
  onClose,
  projectPath,
  projectName,
  branches,
  defaultSource,
  onCreated,
}: CreateBranchModalProps) {
  const [name, setName] = useState('');
  const [source, setSource] = useState('');
  const [mode, setMode] = useState<CopyMode>('latest-commit');
  const [currentBranch, setCurrentBranch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const nameId = useId();
  const sourceId = useId();

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setMode('latest-commit');
    setError('');
    setSubmitting(false);
    setSource(defaultSource && branches.includes(defaultSource) ? defaultSource : (branches[0] ?? ''));
    (window as any).api
      .invoke('git:status', projectPath)
      .then((res: any) => setCurrentBranch(res?.branch ?? ''))
      .catch(() => setCurrentBranch(''));
  }, [isOpen]);

  const trimmedName = name.trim();
  const slug = trimmedName.replace(/\//g, '-');
  const nameTaken = trimmedName !== '' && branches.includes(trimmedName);
  const localAvailable = source !== '' && source === currentBranch;
  const effectiveMode: CopyMode = localAvailable ? mode : 'latest-commit';
  const canSubmit = trimmedName !== '' && !nameTaken && source !== '' && !submitting;

  const worktreeFolder = '~/.phantoma/code:…/worktrees/';

  const hint =
    effectiveMode === 'local'
      ? `Also brings over uncommitted changes and untracked files from ${source}.`
      : `Starts from the last commit on ${source}. Uncommitted edits stay where they are.`;
  const localNote =
    !localAvailable && currentBranch
      ? `Local changes are only available for the checked-out branch (${currentBranch}).`
      : '';

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await (window as any).api.invoke(
        'git:create-branch-worktree',
        projectPath,
        trimmedName,
        source,
        effectiveMode,
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
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[440px]">
      <div className="flex items-start gap-4 px-6 pt-5 pb-5">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold leading-tight text-text-primary">Create branch</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
            Opens as its own project next to {projectName}, so you can edit both branches at the same
            time.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-text-secondary outline-none transition-colors hover:bg-white/[0.06] hover:text-text-primary focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-y-auto px-6">
        <div className="flex gap-3">
          <div className="flex w-3 shrink-0 flex-col items-center">
            <span className="mt-[34px] h-3 w-3 rounded-full border-2 border-text-secondary/70 bg-background" />
            <span className="w-px flex-1 bg-border" />
          </div>
          <div className="min-w-0 flex-1 pb-4">
            <label htmlFor={sourceId} className="mb-1.5 block text-[11px] text-text-secondary">
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
                {branches.map((b) => (
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
        </div>

        <div className="flex gap-3">
          <div className="flex w-3 shrink-0 flex-col items-center">
            <span className="h-[34px] w-px bg-border" />
            <span className="h-3 w-3 rounded-full bg-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor={nameId} className="mb-1.5 block text-[11px] text-text-secondary">
              New branch
            </label>
            <input
              id={nameId}
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="feature/my-branch"
              spellCheck={false}
              className={cn(FIELD, 'px-3 font-mono text-[12.5px]', nameTaken && 'border-error focus:border-error')}
            />
            {nameTaken && (
              <p className="mt-1.5 text-xs text-error">A local branch named {trimmedName} already exists.</p>
            )}
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-1.5 text-[11px] text-text-secondary">Copy</div>
          <div
            role="radiogroup"
            aria-label="Copy mode"
            className="grid grid-cols-2 gap-0.5 rounded-md border border-border bg-input-background p-0.5"
          >
            {MODES.map(({ id, label, icon: Icon }) => {
              const disabled = id === 'local' && !localAvailable;
              const active = effectiveMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={disabled}
                  onClick={() => setMode(id)}
                  className={cn(
                    'flex h-8 items-center justify-center gap-1.5 rounded-[5px] text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/50',
                    active
                      ? 'bg-card-background text-text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary',
                    disabled && 'cursor-not-allowed opacity-40 hover:text-text-secondary',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-text-secondary">
            {hint}
            {localNote && <span className="block text-text-secondary/60">{localNote}</span>}
          </p>
        </div>

        <div className="mt-5">
          <div className="mb-1.5 text-[11px] text-text-secondary">Saved to</div>
          <div className="flex h-9 items-center gap-2 rounded-md border border-divider px-3">
            <Folder className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
            <span className="truncate font-mono text-[11.5px] text-text-secondary">
              {worktreeFolder}<span className="text-text-primary">{slug || 'branch-name'}</span>
            </span>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
            <span className="break-words">{error}</span>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-end gap-2 border-t border-divider px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="h-8 rounded-md px-3 text-xs font-medium text-text-secondary outline-none transition-colors hover:bg-white/[0.04] hover:text-text-primary focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          Cancel
        </button>
        <Button
          variant="soft"
          size="sm"
          className="h-8 gap-1.5 font-semibold"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <GitBranch className="h-3.5 w-3.5" />
          )}
          {submitting ? 'Creating…' : 'Create branch'}
        </Button>
      </div>
    </Modal>
  );
}

export default CreateBranchModal;