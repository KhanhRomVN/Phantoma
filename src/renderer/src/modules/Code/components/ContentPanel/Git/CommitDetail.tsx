/**
 * ------------------------------------------------------------------
 * Git Commit Detail
 * ------------------------------------------------------------------
 * Right panel: real avatar, subject, hash (copyable), parents, refs,
 * change summary and a filterable file list that can switch between
 * flat path view and folder tree view.
 * ------------------------------------------------------------------
 */

import { memo, useMemo, useState } from 'react';
import { Check, Copy, FolderTree, GitCommit, List, Loader2, Search } from 'lucide-react';

import { cn } from '@renderer/shared/utils/cn';
import { Avatar } from './Avatar';
import { ChangedFiles, type FilesView } from './ChangedFiles';
import { RefPill } from './GraphCell';
import { formatRelative, parseRefs, type Commit, type CommitFile } from './graph';

interface CommitDetailProps {
  commit: Commit | null;
  files: CommitFile[];
  loading: boolean;
  selectedFile?: string | null;
  onSelectHash: (hash: string) => void;
  onSelectFile?: (path: string) => void;
}

export const CommitDetail = memo(function CommitDetail({
  commit,
  files,
  loading,
  selectedFile = null,
  onSelectHash,
  onSelectFile,
}: CommitDetailProps) {
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<FilesView>('path');

  const totals = useMemo(
    () =>
      files.reduce(
        (acc, f) => ({ added: acc.added + f.added, deleted: acc.deleted + f.deleted }),
        { added: 0, deleted: 0 },
      ),
    [files],
  );

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () => (q ? files.filter((f) => f.path.toLowerCase().includes(q)) : files),
    [files, q],
  );

  const copyHash = () => {
    if (!commit) return;
    void navigator.clipboard.writeText(commit.hash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  if (!commit) {
    return (
      <aside className={'w-[340px] shrink-0 border-l border-border flex flex-col items-center justify-center gap-2 text-text-secondary/40'}>
        <GitCommit className={'w-8 h-8'} strokeWidth={1.2} />
        <span className={'text-xs'}>Select a commit to see details</span>
      </aside>
    );
  }

  const chips = parseRefs(commit.refs);

  return (
    <aside className={'w-[340px] shrink-0 border-l border-border flex flex-col min-h-0 bg-sidebar-background/40'}>
      <div className={'p-4 border-b border-border'}>
        <div className={'flex items-start gap-2.5'}>
          <Avatar author={commit.author} email={commit.email} size={36} />
          <div className={'min-w-0'}>
            <div className={'text-[12.5px] font-semibold text-text-primary truncate'}>{commit.author}</div>
            <div className={'text-[11px] text-text-secondary/70 truncate'}>{commit.email}</div>
            <div className={'text-[11px] text-text-secondary/60'}>
              {`${formatRelative(commit.date)} · ${new Date(commit.date).toLocaleString()}`}
            </div>
          </div>
        </div>

        <div className={'mt-3 text-[14px] leading-snug font-semibold text-text-primary break-words'}>
          {commit.subject}
        </div>

        {chips.length > 0 && (
          <div className={'mt-3 flex flex-wrap gap-1.5'}>
            {chips.map((c) => (
              <RefPill key={c.kind + c.label} chip={c} />
            ))}
          </div>
        )}

        <div className={'mt-3 flex items-center gap-1.5 font-mono text-[11px] text-text-secondary/70'}>
          <span className={'px-1.5 py-0.5 rounded bg-card-background border border-divider'}>
            {commit.hash.slice(0, 10)}
          </span>
          <button
            onClick={copyHash}
            title={'Copy full hash'}
            className={'w-6 h-6 rounded-md flex items-center justify-center hover:bg-card-hover hover:text-text-primary transition-colors cursor-pointer'}
          >
            {copied ? <Check className={'w-3.5 h-3.5 text-green'} /> : <Copy className={'w-3.5 h-3.5'} />}
          </button>
          {commit.parents.length > 0 && (
            <span className={'ml-auto flex items-center gap-1'}>
              <span className={'text-text-secondary/50'}>parent</span>
              {commit.parents.map((p) => (
                <button
                  key={p}
                  onClick={() => onSelectHash(p)}
                  className={'px-1.5 py-0.5 rounded bg-card-background border border-divider hover:text-primary hover:border-primary/40 transition-colors cursor-pointer'}
                >
                  {p.slice(0, 7)}
                </button>
              ))}
            </span>
          )}
        </div>
      </div>

      <div className={'px-4 py-2.5 border-b border-border flex items-center gap-2 text-[11.5px]'}>
        <span className={'font-semibold text-text-primary'}>{`${files.length} changed files`}</span>
        <span className={'ml-auto font-mono text-green'}>{`+${totals.added}`}</span>
        <span className={'font-mono text-red'}>{`-${totals.deleted}`}</span>
      </div>

      <div className={'px-3 py-2 flex items-center gap-2'}>
        <div className={'relative flex-1'}>
          <Search className={'absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary/60 pointer-events-none'} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={'Filter files...'}
            className={'w-full pl-7 pr-2 h-7 text-xs bg-input-background border border-border rounded-md text-text-primary placeholder:text-text-secondary/50 focus:outline-none'}
          />
        </div>
        <div className={'h-7 p-0.5 rounded-md border border-border bg-card-background flex items-center gap-0.5'}>
          {(
            [
              ['path', List, 'Path view'],
              ['tree', FolderTree, 'Tree view'],
            ] as const
          ).map(([key, Icon, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              title={label}
              className={cn(
                'w-[22px] h-full rounded flex items-center justify-center transition-colors cursor-pointer',
                view === key
                  ? 'bg-primary/15 text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-card-hover',
              )}
            >
              <Icon className={'w-3.5 h-3.5'} />
            </button>
          ))}
        </div>
      </div>

      <div className={'flex-1 overflow-y-auto pb-2'}>
        {loading ? (
          <div className={'flex justify-center py-6'}>
            <Loader2 className={'w-4 h-4 animate-spin text-text-secondary/60'} />
          </div>
        ) : (
          <ChangedFiles files={visible} view={view} selectedPath={selectedFile} onSelect={onSelectFile} />
        )}
      </div>
    </aside>
  );
});