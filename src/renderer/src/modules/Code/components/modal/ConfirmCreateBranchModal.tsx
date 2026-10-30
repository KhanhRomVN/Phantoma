import {
  AlertCircle,
  ArrowRight,
  Check,
  Copy,
  FilePen,
  FolderPlus,
  GitBranch,
  Loader2,
  Minus,
} from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { cn } from '@renderer/shared/utils/cn';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalHeader } from '@renderer/components/ui/Modal/ModalHeader';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import { Button } from '@renderer/components/ui/Button/Button';
import { Checkbox } from '@renderer/components/ui/Checkbox/Checkbox';

export interface WorktreePreview {
  hasGitignore: boolean;
  alreadyIgnored: boolean;
  changedFiles: number;
  ignoredPaths: string[];
}

export interface BranchProgress {
  step: 'worktree' | 'local' | 'copy';
  current?: number;
  total?: number;
  label?: string;
}

interface ConfirmCreateBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
  error: string;
  projectName: string;
  source: string;
  branchName: string;
  slug: string;
  mode: 'latest-commit' | 'local';
  preview: WorktreePreview | null;
  selectedPaths: string[];
  onSelectedPathsChange: (paths: string[]) => void;
  progress: BranchProgress | null;
}

// ASSUMED: dependency folders (node_modules, .venv, venv) and env files (.env, .env.*) are auto-selected; build output and logs are not
const AUTO_SELECT_RE = /(^|\/)(node_modules|\.venv|venv)\/$|(^|\/)\.env(\..+)?$/;

export const autoSelectIgnored = (paths: string[]): string[] =>
  paths.filter((p) => AUTO_SELECT_RE.test(p));

const MONO = 'font-mono text-text-primary';

const STEP_LABEL: Record<BranchProgress['step'], string> = {
  worktree: 'Creating worktree',
  local: 'Applying local changes',
  copy: 'Copying ignored items',
};

function SummaryRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-xs leading-relaxed text-text-secondary">
      <span className="mt-0.5 shrink-0 text-text-secondary/70">{icon}</span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

function ProgressView({
  steps,
  progress,
}: {
  steps: BranchProgress['step'][];
  progress: BranchProgress | null;
}) {
  const active = Math.max(0, steps.indexOf(progress?.step ?? 'worktree'));
  const total = progress?.total ?? 0;
  const current = progress?.current ?? 1;

  return (
    <ul className="flex flex-col gap-4 py-2">
      {steps.map((s, i) => {
        const state = i < active ? 'done' : i === active ? 'active' : 'pending';
        const copying = s === 'copy' && state === 'active' && total > 0;
        return (
          <li key={s} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
              {state === 'done' ? (
                <Check className="h-3.5 w-3.5 text-text-secondary" />
              ) : state === 'active' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-text-primary" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-text-secondary/40" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div
                className={cn('text-xs', state === 'pending' ? 'text-text-secondary/60' : 'text-text-primary')}
              >
                {STEP_LABEL[s]}
              </div>
              {copying && (
                <div className="mt-2">
                  <div className="h-1 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-text-secondary transition-[width] duration-300"
                      style={{ width: `${((current - 1) / total) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1.5 truncate font-mono text-[11px] text-text-secondary">
                    {current}/{total} · {progress?.label}
                  </p>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ConfirmCreateBranchModal({
  isOpen,
  onClose,
  onConfirm,
  submitting,
  error,
  projectName,
  source,
  branchName,
  slug,
  mode,
  preview,
  selectedPaths,
  onSelectedPathsChange,
  progress,
}: ConfirmCreateBranchModalProps) {
  const willEditIgnore = !!preview && preview.hasGitignore && !preview.alreadyIgnored;
  const changed = preview?.changedFiles ?? 0;
  const ignored = useMemo(() => preview?.ignoredPaths ?? [], [preview]);
  const recommended = useMemo(() => autoSelectIgnored(ignored), [ignored]);
  const sorted = useMemo(
    () => [...recommended, ...ignored.filter((p) => !recommended.includes(p))],
    [ignored, recommended],
  );
  const steps: BranchProgress['step'][] = [
    'worktree',
    ...(mode === 'local' ? (['local'] as const) : []),
    ...(selectedPaths.length > 0 ? (['copy'] as const) : []),
  ];

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const toggle = (p: string) =>
    onSelectedPathsChange(
      selectedPaths.includes(p) ? selectedPaths.filter((x) => x !== p) : [...selectedPaths, p],
    );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-[520px]">
      <ModalHeader
        title={submitting ? 'Creating branch' : 'Confirm new branch'}
        description={
          submitting
            ? 'Copying ignored folders can take a while. Please keep this window open.'
            : `Here is what will change inside ${projectName} once ${branchName} is created.`
        }
        onClose={handleClose}
        className="[&_h3]:text-left [&_p]:text-left px-6 py-4"
      />
      <ModalBody className="flex flex-col gap-5 px-6 py-5">
        {submitting ? (
          <ProgressView steps={steps} progress={progress} />
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 font-mono text-[11.5px]">
                <span className="min-w-0 max-w-[40%] truncate rounded-md border border-border px-2 py-0.5 text-text-secondary">
                  {source}
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-text-secondary/60" />
                <span className="min-w-0 max-w-[60%] truncate rounded-md border border-border bg-input-background px-2 py-0.5 text-text-primary">
                  {branchName}
                </span>
              </div>
              <p className="text-[11px] text-text-secondary">
                {mode === 'local' ? 'Latest commit + local changes' : 'Latest commit'}
              </p>
            </div>

            <ul className="flex flex-col gap-2.5">
              <SummaryRow icon={<FolderPlus className="h-3.5 w-3.5" />}>
                Creates <span className={MONO}>{projectName}/worktrees/{slug}</span> and opens it as a
                separate project.
              </SummaryRow>
              {willEditIgnore && (
                <SummaryRow icon={<FilePen className="h-3.5 w-3.5" />}>
                  Adds <span className={MONO}>worktrees/</span> to{' '}
                  <span className={MONO}>.gitignore</span>.
                </SummaryRow>
              )}
              {mode === 'local' ? (
                <SummaryRow icon={<Copy className="h-3.5 w-3.5" />}>
                  Brings {changed} uncommitted file{changed === 1 ? '' : 's'} from{' '}
                  <span className={MONO}>{source}</span>. The originals stay where they are.
                </SummaryRow>
              ) : (
                changed > 0 && (
                  <SummaryRow icon={<Minus className="h-3.5 w-3.5" />}>
                    {changed} uncommitted file{changed === 1 ? '' : 's'} stay in{' '}
                    <span className={MONO}>{source}</span>.
                  </SummaryRow>
                )
              )}
            </ul>

            {!preview ? (
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Scanning ignored files…
              </div>
            ) : (
              ignored.length > 0 && (
                <section>
                  <div className="mb-2 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-xs font-medium text-text-primary">Ignored by git</h4>
                      <p className="mt-0.5 text-[11px] text-text-secondary">
                        Not part of the commit. Pick what the new branch should get.
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-text-secondary">
                      <button
                        type="button"
                        className="transition-colors hover:text-text-primary"
                        onClick={() => onSelectedPathsChange(recommended)}
                      >
                        Recommended
                      </button>
                      <span className="text-text-secondary/40">·</span>
                      <button
                        type="button"
                        className="transition-colors hover:text-text-primary"
                        onClick={() => onSelectedPathsChange([])}
                      >
                        None
                      </button>
                    </div>
                  </div>

                  <ul className="max-h-56 divide-y divide-divider overflow-y-auto rounded-lg border border-border bg-input-background">
                    {sorted.map((p) => {
                      const on = selectedPaths.includes(p);
                      return (
                        <li key={p}>
                          <div
                            role="checkbox"
                            aria-checked={on}
                            tabIndex={0}
                            onClick={() => toggle(p)}
                            onKeyDown={(e) => {
                              if (e.key === ' ' || e.key === 'Enter') {
                                e.preventDefault();
                                toggle(p);
                              }
                            }}
                            className="flex h-9 cursor-pointer items-center gap-2.5 px-3 transition-colors hover:bg-button-soft-background/50"
                          >
                            <Checkbox size="sm" checked={on} className="pointer-events-none" />
                            <span
                              className={cn(
                                'min-w-0 flex-1 truncate font-mono text-[11.5px]',
                                on ? 'text-text-primary' : 'text-text-secondary',
                              )}
                            >
                              {p}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <p className="mt-1.5 text-[11px] text-text-secondary">
                    {selectedPaths.length} of {ignored.length} selected
                  </p>
                </section>
              )
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">
                <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 break-all">{error}</span>
              </div>
            )}
          </>
        )}
      </ModalBody>

      <ModalFooter className="gap-2 px-6 py-4">
        <Button
          size="sm"
          className="h-8 bg-button-soft-background text-text-secondary hover:bg-button-soft-background/80 hover:text-text-primary active:bg-button-soft-background/70 disabled:hover:bg-button-soft-background"
          onClick={handleClose}
          disabled={submitting}
        >
          Back
        </Button>
        <Button
          variant="soft"
          size="sm"
          className="h-8 gap-1.5 font-semibold"
          onClick={onConfirm}
          disabled={submitting || !preview}
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <GitBranch className="h-3.5 w-3.5" />
          )}
          {submitting ? 'Creating…' : 'Create branch'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default ConfirmCreateBranchModal;