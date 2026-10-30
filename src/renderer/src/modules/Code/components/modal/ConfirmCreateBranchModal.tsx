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
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { cn } from '@renderer/shared/utils/cn';
import { getFileIconPath, getFolderIconPath } from '@renderer/shared/utils/fileIconMapper';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalHeader } from '@renderer/components/ui/Modal/ModalHeader';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import { Button } from '@renderer/components/ui/Button/Button';

export interface WorktreePreview {
  hasGitignore: boolean;
  alreadyIgnored: boolean;
  changedFiles: number;
  ignoredPaths: string[];
  sizes?: Record<string, number>;
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
  actionTitle: string;
  confirmLabel: string;
  existing?: boolean;
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

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
};

function SummaryRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-[13px] leading-relaxed text-text-secondary">
      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-white/[0.05] text-text-secondary">
        {icon}
      </span>
      <span className="min-w-0 pt-px">{children}</span>
    </li>
  );
}

function TickBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition-all duration-150',
        checked
          ? 'border-primary bg-primary text-white'
          : 'border-text-secondary/40 bg-transparent group-hover:border-text-secondary',
      )}
    >
      <Check
        className={cn(
          'h-3 w-3 transition-all duration-150',
          checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
        )}
        strokeWidth={3}
      />
    </span>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-primary/25 text-text-primary">
        {text.slice(i, i + query.length)}
      </mark>
      {text.slice(i + query.length)}
    </>
  );
}

function QuickAction({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md px-2 py-1 text-[12px] font-medium text-text-secondary outline-none transition-colors hover:bg-white/[0.06] hover:text-text-primary focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      {children}
    </button>
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
                className={cn(
                  'text-[13px]',
                  state === 'pending' ? 'text-text-secondary/60' : 'text-text-primary',
                )}
              >
                {STEP_LABEL[s]}
              </div>
              {copying && (
                <div className="mt-2">
                  <div className="h-1 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-300"
                      style={{ width: `${((current - 1) / total) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1.5 truncate font-mono text-[12px] text-text-secondary">
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
  actionTitle,
  confirmLabel,
  existing = false,
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
  const [query, setQuery] = useState('');
  const willEditIgnore = !!preview && preview.hasGitignore && !preview.alreadyIgnored;
  const changed = preview?.changedFiles ?? 0;
  const ignored = useMemo(() => preview?.ignoredPaths ?? [], [preview]);
  const sizes = preview?.sizes;
  const recommended = useMemo(() => autoSelectIgnored(ignored), [ignored]);
  const sorted = useMemo(
    () => [...recommended, ...ignored.filter((p) => !recommended.includes(p))],
    [ignored, recommended],
  );
  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () => (q ? sorted.filter((p) => p.toLowerCase().includes(q)) : sorted),
    [sorted, q],
  );
  const selectedSize = useMemo(
    () =>
      sizes ? selectedPaths.reduce((sum, p) => sum + (sizes[p] ?? 0), 0) : null,
    [sizes, selectedPaths],
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

  const selectVisible = () =>
    onSelectedPathsChange(Array.from(new Set([...selectedPaths, ...visible])));

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-[580px]">
      <ModalHeader
        title={submitting ? 'Creating…' : `Confirm ${actionTitle}`}
        description={
          submitting
            ? 'Copying ignored folders can take a while. Please keep this window open.'
            : `Here is what will change inside ${projectName} once ${branchName} is created.`
        }
        onClose={handleClose}
        className="px-6 py-4"
      />
      <ModalBody className="flex flex-col gap-5 px-6 py-5">
        {submitting ? (
          <ProgressView steps={steps} progress={progress} />
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 font-mono text-[12.5px]">
                {!existing && (
                  <>
                    <span className="min-w-0 max-w-[40%] truncate rounded-md border border-border px-2.5 py-1 text-text-secondary">
                      {source}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-text-secondary/60" />
                  </>
                )}
                <span className="inline-flex min-w-0 max-w-[60%] items-center gap-1.5 rounded-md border border-border bg-input-background px-2.5 py-1 text-text-primary">
                  <GitBranch className="h-3 w-3 shrink-0 text-primary" />
                  <span className="truncate">{branchName}</span>
                </span>
              </div>
              <p className="text-[12px] text-text-secondary">
                {existing
                  ? 'Existing branch checked out in a new folder'
                  : mode === 'local'
                    ? 'Latest commit + local changes'
                    : 'Latest commit'}
              </p>
            </div>

            <ul className="flex flex-col gap-3">
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
              {!existing &&
                (mode === 'local' ? (
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
                ))}
            </ul>

            {!preview ? (
              <div className="flex items-center gap-2 text-[13px] text-text-secondary">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Scanning ignored files…
              </div>
            ) : (
              ignored.length > 0 && (
                <section>
                  <div className="mb-2.5 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-[13px] font-medium text-text-primary">Ignored by git</h4>
                      <p className="mt-0.5 text-[12px] text-text-secondary">
                        Not part of the commit. Pick what the new branch should get.
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <QuickAction onClick={() => onSelectedPathsChange(recommended)}>
                        Recommended
                      </QuickAction>
                      <QuickAction onClick={selectVisible}>All</QuickAction>
                      <QuickAction onClick={() => onSelectedPathsChange([])}>None</QuickAction>
                    </div>
                  </div>

                  <div className="relative mb-2">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary/70" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search ignored items…"
                      spellCheck={false}
                      className="h-9 w-full rounded-md border border-border bg-input-background pl-9 pr-8 text-[13px] text-text-primary outline-none transition-colors placeholder:text-text-secondary/40 focus:border-primary"
                    />
                    {query && (
                      <button
                        type="button"
                        aria-label="Clear search"
                        onClick={() => setQuery('')}
                        className="absolute right-2 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-text-secondary outline-none transition-colors hover:bg-white/[0.08] hover:text-text-primary"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <ul className="max-h-72 divide-y divide-divider overflow-y-auto rounded-lg border border-border bg-input-background">
                    {visible.length === 0 && (
                      <li className="flex h-16 items-center justify-center text-[13px] text-text-secondary">
                        No items match “{query.trim()}”
                      </li>
                    )}
                    {visible.map((p) => {
                      const on = selectedPaths.includes(p);
                      const isDir = p.endsWith('/');
                      const clean = p.replace(/\/+$/, '');
                      const base = clean.split('/').pop() || clean;
                      const dir = clean.slice(0, clean.length - base.length);
                      const iconSrc = isDir ? getFolderIconPath(base, false) : getFileIconPath(base);
                      const size = sizes?.[p];
                      const isRecommended = recommended.includes(p);
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
                            className={cn(
                              'group flex h-10 cursor-pointer items-center gap-3 px-3 outline-none transition-colors hover:bg-button-soft-background/50 focus-visible:bg-button-soft-background/50',
                              on && 'bg-primary/[0.06]',
                            )}
                          >
                            <TickBox checked={on} />
                            <img
                              src={iconSrc}
                              alt=""
                              draggable={false}
                              className="h-4 w-4 shrink-0"
                            />
                            <span
                              className={cn(
                                'min-w-0 flex-1 truncate font-mono text-[12.5px]',
                                on ? 'text-text-primary' : 'text-text-secondary',
                              )}
                              title={p}
                            >
                              {dir && (
                                <span className="text-text-secondary/60">
                                  <Highlight text={dir} query={q} />
                                </span>
                              )}
                              <Highlight text={isDir ? `${base}/` : base} query={q} />
                            </span>
                            {isRecommended && (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded bg-primary/10 px-1.5 py-px text-[11px] font-semibold text-primary">
                                <Sparkles className="h-2.5 w-2.5" />
                                Recommended
                              </span>
                            )}
                            {size !== undefined && (
                              <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-px font-mono text-[11.5px] tabular-nums text-text-secondary">
                                {formatSize(size)}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <p className="mt-2 flex items-center gap-1.5 text-[12px] text-text-secondary">
                    <span>
                      {selectedPaths.length} of {ignored.length} selected
                    </span>
                    {selectedSize !== null && selectedPaths.length > 0 && (
                      <>
                        <span className="text-text-secondary/40">·</span>
                        <span className="font-mono tabular-nums">{formatSize(selectedSize)}</span>
                      </>
                    )}
                  </p>
                </section>
              )
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-3 py-2 text-[13px] text-error">
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
          {submitting ? 'Creating…' : confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default ConfirmCreateBranchModal;