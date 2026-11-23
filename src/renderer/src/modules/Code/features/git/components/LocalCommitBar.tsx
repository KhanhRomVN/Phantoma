import { fsIpc } from '../../../shared/ipc/fs.ipc';
import { dialogIpc } from '../../../shared/ipc/dialog.ipc';
/**
 * ------------------------------------------------------------------
 * Local Commit Bar
 * ------------------------------------------------------------------
 * Pieces of the local-changes panel:
 *  - GroupHeader: collapsible "Staged Changes" / "Changes" title.
 *  - LocalStageBar (Changes group): git add the ticked files that are
 *    not added yet, with a confirm modal.
 *  - LocalCommitBox (Staged Changes group): commit the staged files
 *    with a message (or copy a plain-text prompt to get one from any AI).
 * ------------------------------------------------------------------
 */

import { memo, useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  FileText,
  GitCommit,
  Loader2,
  Plus,
} from 'lucide-react';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';

import { cn } from '@renderer/utils/cn';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import { Button } from '@renderer/components/ui/Button';
import { codeApi } from '../../../shared/api/code.api';
import { getCommitMessagePlainPrompt } from '../../../agent/prompts/code/commit-message';
import { ChangedFiles, type FilesView } from './ChangedFiles';
import { EmptyState } from './EmptyState';
import { fileKind, formatRelative, type Commit, type CommitFile } from '../utils/graph.util';

const SOFT_BUTTON =
  'h-6 shrink-0 cursor-pointer inline-flex items-center gap-1 rounded-md px-2.5 text-[11.5px] font-medium bg-card-background text-text-secondary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50 transition-colors';

const ACTION_BUTTON =
  'w-full h-9 cursor-pointer flex items-center justify-center gap-2 rounded-lg px-3 text-[12px] font-medium transition-colors bg-primary/5 text-primary hover:bg-primary/10 active:bg-primary/20 outline-dashed outline-1 -outline-offset-1 outline-primary/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary/5';

const STATUS_LETTER = { added: 'A', modified: 'M', deleted: 'D' } as const;

export type ChangesTab = 'staged' | 'changes' | 'unpushed';

interface ChangesTabsProps {
  tab: ChangesTab;
  stagedCount: number;
  changesCount: number;
  unpushedCount?: number;
  onChange: (tab: ChangesTab) => void;
}

export const ChangesTabs = memo(function ChangesTabs({
  tab,
  stagedCount,
  changesCount,
  unpushedCount,
  onChange,
}: ChangesTabsProps) {
  const items: [ChangesTab, string, number][] = [
    ['changes', 'Changes', changesCount],
    ['staged', 'Staged Changes', stagedCount],
  ];
  if (unpushedCount !== undefined) items.push(['unpushed', 'Unpushed', unpushedCount]);
  return (
    <div className={'h-9 shrink-0 flex items-center gap-4 px-3 border-b border-border'}>
      {items.map(([key, label, count]) => (
        <button
          key={key}
          type={'button'}
          onClick={() => onChange(key)}
          className={cn(
            'h-full -mb-px inline-flex items-center gap-1.5 text-[11.5px] font-semibold border-b-2 transition-colors cursor-pointer',
            tab === key
              ? 'border-primary text-text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary',
          )}
        >
          {label}
          <span className={'text-[10.5px] font-mono text-text-secondary/70'}>{count}</span>
        </button>
      ))}
    </div>
  );
});

const UnpushedItem = memo(function UnpushedItem({
  commit,
  root,
  view,
}: {
  commit: Commit;
  root: string;
  view: FilesView;
}) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<CommitFile[] | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (!next || files || loading) return;
    setLoading(true);
    codeApi.git
      .commitFiles(root, commit.hash)
      .then((res: { files?: CommitFile[] }) => setFiles(res?.files ?? []))
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  };

  return (
    <div
      className={cn(
        'mx-3 my-1.5 rounded-lg bg-card-background overflow-hidden',
        open && 'outline-dashed outline-1 -outline-offset-1 outline-primary/40',
      )}
    >
      <button
        type={'button'}
        title={commit.subject}
        onClick={toggle}
        className={
          'w-full p-2 flex items-center gap-2.5 text-left cursor-pointer hover:bg-card-hover transition-colors'
        }
      >
        <span
          className={cn(
            'w-7 h-7 rounded-md grid place-items-center shrink-0 text-primary transition-colors',
            open ? 'bg-primary/20' : 'bg-primary/10',
          )}
        >
          {loading ? (
            <Loader2 className={'w-3.5 h-3.5 animate-spin'} />
          ) : (
            <GitCommit className={'w-3.5 h-3.5'} />
          )}
        </span>
        <span className={'flex flex-col gap-0.5 min-w-0 flex-1'}>
          <span className={'text-[12px] font-medium text-text-primary truncate'}>
            {commit.subject}
          </span>
          <span className={'text-[10.5px] text-text-secondary/70 truncate'}>
            {`${commit.hash.slice(0, 7)} · ${commit.author} · ${formatRelative(commit.date)}`}
          </span>
        </span>
        {files && (
          <span className={'shrink-0 text-[10.5px] font-mono text-text-secondary/70'}>
            {files.length}
          </span>
        )}
      </button>
      {open &&
        (loading ? (
          <div className={'flex justify-center py-3'}>
            <Loader2 className={'w-4 h-4 animate-spin text-text-secondary/60'} />
          </div>
        ) : files && files.length === 0 ? (
          <div className={'py-4 text-center text-[11.5px] text-text-secondary/50'}>
            {'No files'}
          </div>
        ) : (
          <ChangedFiles files={files ?? []} view={view} />
        ))}
    </div>
  );
});

export const UnpushedList = memo(function UnpushedList({
  commits,
  root,
  view,
  onPush,
  pushing,
}: {
  commits: Commit[];
  root: string;
  view: FilesView;
  onPush?: () => void | Promise<void>;
  pushing?: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pushWorking, setPushWorking] = useState(false);

  if (commits.length === 0) {
    return (
      <EmptyState
        icon={GitCommit}
        text={'No unpushed commits'}
        desc={'Everything is already pushed to the remote.'}
      />
    );
  }

  const count = commits.length;
  const label = `${count} ${count === 1 ? 'commit' : 'commits'}`;

  const handleConfirmPush = async () => {
    if (pushWorking) return;
    setPushWorking(true);
    try {
      await onPush?.();
    } finally {
      setPushWorking(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className={'flex flex-col'}>
      {onPush && (
        <div className={'mx-3 my-2'}>
          <button
            type={'button'}
            disabled={pushing}
            onClick={() => setConfirmOpen(true)}
            className={ACTION_BUTTON}
          >
            {pushing ? (
              <Loader2 className={'w-3.5 h-3.5 animate-spin'} />
            ) : (
              <ArrowUp className={'w-3.5 h-3.5'} />
            )}
            {`Let's git push ${label}`}
          </button>

          <Modal
            isOpen={confirmOpen}
            onClose={() => !pushWorking && setConfirmOpen(false)}
            className={'max-w-[400px]'}
          >
            <ModalBody className={'py-6 px-5'}>
              <div className={'flex flex-col items-center text-center gap-3'}>
                <div
                  className={
                    'w-11 h-11 rounded-xl border grid place-items-center shrink-0 bg-primary/10 border-primary/20 text-primary'
                  }
                >
                  <ArrowUp className={'w-5 h-5'} strokeWidth={1.8} />
                </div>
                <h3 className={'text-base font-semibold text-text-primary leading-snug'}>
                  {'Git push these commits?'}
                </h3>
                <p className={'text-xs text-text-secondary leading-relaxed max-w-[300px]'}>
                  {'Do you want to push '}
                  <b className={'font-medium text-text-primary'}>{label}</b>
                  {' to the remote?'}
                </p>
              </div>
            </ModalBody>

            <ModalFooter className={'gap-0 p-0 border-t border-border'}>
              <Button
                onClick={() => !pushWorking && setConfirmOpen(false)}
                className={
                  'flex-1 h-[42px] text-xs font-medium bg-card-background text-text-secondary hover:text-text-primary border-r border-border rounded-none'
                }
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleConfirmPush()}
                className={
                  'flex-1 h-[42px] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 rounded-none bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30'
                }
              >
                {pushWorking ? (
                  <Loader2 className={'w-3.5 h-3.5 animate-spin'} />
                ) : (
                  <ArrowUp className={'w-3.5 h-3.5'} />
                )}
                {pushWorking ? 'Pushing…' : 'Git push'}
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      )}
      {commits.map((c) => (
        <UnpushedItem key={c.hash} commit={c} root={root} view={view} />
      ))}
    </div>
  );
});

interface LocalStageBarProps {
  unstagedCount: number;
  checkedUnstaged: CommitFile[];
  busy: boolean;
  onStage: (paths: string[]) => Promise<void>;
}

export const LocalStageBar = memo(function LocalStageBar({
  unstagedCount,
  checkedUnstaged,
  busy,
  onStage,
}: LocalStageBarProps) {
  const [working, setWorking] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (unstagedCount === 0) return null;

  const disabled = busy || working;
  const addCount = checkedUnstaged.length;

  const handleConfirmAdd = async () => {
    setConfirmOpen(false);
    setWorking(true);
    try {
      await onStage(checkedUnstaged.map((f) => f.path));
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className={'mx-3 my-2'}>
      <button
        type={'button'}
        disabled={disabled || addCount === 0}
        onClick={() => setConfirmOpen(true)}
        className={ACTION_BUTTON}
      >
        {working ? (
          <Loader2 className={'w-3.5 h-3.5 animate-spin'} />
        ) : (
          <Plus className={'w-3.5 h-3.5'} />
        )}
        {addCount > 0
          ? `Let's git add ${addCount} ticked ${addCount === 1 ? 'file' : 'files'}`
          : 'Tick files to git add them'}
      </button>

      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} className={'max-w-[400px]'}>
        <ModalBody className={'py-6 px-5'}>
          <div className={'flex flex-col items-center text-center gap-3'}>
            <div
              className={
                'w-11 h-11 rounded-xl border grid place-items-center shrink-0 bg-primary/10 border-primary/20 text-primary'
              }
            >
              <Plus className={'w-5 h-5'} strokeWidth={1.8} />
            </div>
            <h3 className={'text-base font-semibold text-text-primary leading-snug'}>
              {'Git add these files?'}
            </h3>
            <p className={'text-xs text-text-secondary leading-relaxed max-w-[300px]'}>
              {'Do you want to stage '}
              <b
                className={'font-medium text-text-primary'}
              >{`${addCount} ticked ${addCount === 1 ? 'file' : 'files'}`}</b>
              {'?'}
            </p>
          </div>
        </ModalBody>

        <ModalFooter className={'gap-0 p-0 border-t border-border'}>
          <Button
            onClick={() => setConfirmOpen(false)}
            className={
              'flex-1 h-[42px] text-xs font-medium bg-card-background text-text-secondary hover:text-text-primary border-r border-border rounded-none'
            }
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleConfirmAdd()}
            className={
              'flex-1 h-[42px] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 rounded-none bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30'
            }
          >
            <Plus className={'w-3.5 h-3.5'} />
            Git add
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
});

interface LocalCommitBoxProps {
  staged: CommitFile[];
  projectPath: string;
  busy: boolean;
  onCommit: (message: string) => Promise<boolean>;
  onNotice: (message: string) => void;
}

export const LocalCommitBox = memo(function LocalCommitBox({
  staged,
  projectPath,
  busy,
  onCommit,
  onNotice,
}: LocalCommitBoxProps) {
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [message]);

  if (staged.length === 0) return null;

  const disabled = busy || working;

  const handleCommit = async () => {
    setConfirmOpen(false);
    if (!message.trim()) return;
    setWorking(true);
    try {
      if (await onCommit(message.trim())) setMessage('');
    } finally {
      setWorking(false);
    }
  };

  const handleCopyPrompt = async () => {
    setWorking(true);
    try {
      const status = staged
        .map((f) => `${STATUS_LETTER[fileKind(f)]}  ${f.path} (+${f.added} -${f.deleted})`)
        .join('\n');
      await navigator.clipboard.writeText(getCommitMessagePlainPrompt('en', status, undefined));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      onNotice('Prompt copied — paste it to any AI and paste the reply below');
    } catch (e: any) {
      onNotice(e?.message ?? 'Cannot copy prompt');
    } finally {
      setWorking(false);
    }
  };

  const handleExportFull = async () => {
    setWorking(true);
    try {
      const picked = await dialogIpc.selectPaths({ kind: 'folder' });
      const destDir = picked?.paths?.[0];
      if (!destDir) return;
      const status = staged
        .map((f) => `${STATUS_LETTER[fileKind(f)]}  ${f.path} (+${f.added} -${f.deleted})`)
        .join('\n');
      const diffRes = await codeApi.git.stagedDiff(projectPath).catch(() => null);
      const filePath = `${destDir}/commit-prompt-${Date.now()}.md`;
      const wr = await fsIpc.writeFile(filePath,
        getCommitMessagePlainPrompt('en', status, diffRes?.diff),
      );
      onNotice(wr?.error ? String(wr.error).split('\n')[0] : `Exported ${filePath}`);
    } catch (e: any) {
      onNotice(e?.message ?? 'Cannot export prompt');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className={'mx-3 my-2 flex flex-col gap-2'}>
      <div className={'flex items-center gap-2'}>
        <span className={'flex-1 min-w-0 text-[11.5px] text-text-secondary'}>
          <span className={'font-semibold text-green'}>{staged.length}</span>
          {' added, not committed'}
        </span>
        <Dropdown open={menuOpen} onOpenChange={setMenuOpen} side="bottom" align="end">
          <DropdownTrigger asChild>
            <button type={'button'} disabled={disabled} className={SOFT_BUTTON}>
              {copied ? <Check className={'w-3 h-3'} /> : <Copy className={'w-3 h-3'} />}
              {copied ? 'Copied' : 'Copy prompt'}
              <ChevronDown className={'w-3 h-3'} />
            </button>
          </DropdownTrigger>
          <DropdownContent className="min-w-[260px]" size="sm">
            <DropdownItem onClick={() => void handleCopyPrompt()}>
              <span className="flex items-center gap-2 w-full">
                <Copy className={'w-3 h-3 shrink-0'} />
                <span className="flex-1">{'Simple · no diff · copy to clipboard'}</span>
              </span>
            </DropdownItem>
            <DropdownItem onClick={() => void handleExportFull()}>
              <span className="flex items-center gap-2 w-full">
                <FileText className={'w-3 h-3 shrink-0'} />
                <span className="flex-1">{'Full · with diff · export .md file'}</span>
              </span>
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
      </div>
      <div className={'rounded-md border border-border bg-input-background p-3'}>
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={'Commit message...'}
          rows={1}
          className={
            'block w-full min-h-6 max-h-60 p-0 border-0 outline-none resize-none bg-transparent text-[13px] leading-6 text-text-primary placeholder:text-text-secondary/50 overflow-x-hidden overflow-y-auto'
          }
        />
      </div>
      <button
        type={'button'}
        disabled={disabled || !message.trim()}
        onClick={() => setConfirmOpen(true)}
        className={ACTION_BUTTON}
      >
        {working ? (
          <Loader2 className={'w-3.5 h-3.5 animate-spin'} />
        ) : (
          <GitCommit className={'w-3.5 h-3.5'} />
        )}
        {`Commit ${staged.length} ${staged.length === 1 ? 'file' : 'files'}`}
      </button>

      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} className={'max-w-[400px]'}>
        <ModalBody className={'py-6 px-5'}>
          <div className={'flex flex-col items-center text-center gap-3'}>
            <div
              className={
                'w-11 h-11 rounded-xl border grid place-items-center shrink-0 bg-primary/10 border-primary/20 text-primary'
              }
            >
              <GitCommit className={'w-5 h-5'} strokeWidth={1.8} />
            </div>
            <h3 className={'text-base font-semibold text-text-primary leading-snug'}>
              {'Commit these files?'}
            </h3>
            <p className={'text-xs text-text-secondary leading-relaxed max-w-[300px]'}>
              {'Do you want to commit '}
              <b
                className={'font-medium text-text-primary'}
              >{`${staged.length} staged ${staged.length === 1 ? 'file' : 'files'}`}</b>
              {' with this message?'}
            </p>
            <p
              className={
                'w-full text-xs text-text-primary rounded-md bg-card-background px-3 py-2 text-left break-words line-clamp-4'
              }
            >
              {message.trim()}
            </p>
          </div>
        </ModalBody>

        <ModalFooter className={'gap-0 p-0 border-t border-border'}>
          <Button
            onClick={() => setConfirmOpen(false)}
            className={
              'flex-1 h-[42px] text-xs font-medium bg-card-background text-text-secondary hover:text-text-primary border-r border-border rounded-none'
            }
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleCommit()}
            className={
              'flex-1 h-[42px] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 rounded-none bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30'
            }
          >
            <GitCommit className={'w-3.5 h-3.5'} />
            Commit
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
});
