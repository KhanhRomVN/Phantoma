/**
 * ------------------------------------------------------------------
 * Git Diff View
 * ------------------------------------------------------------------
 * Replaces the commit graph in the center area: a scrollable list of
 * every file changed by a commit, each with a collapsible unified
 * diff (line numbers, hunk headers, green / red lines). The file
 * clicked in the right panel is scrolled into view. Esc goes back.
 * ------------------------------------------------------------------
 */

import { memo, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { AlertCircle, ArrowLeft, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

import { cn } from '@renderer/shared/utils/cn';
import { getFileIconPath } from '@renderer/shared/utils/fileIconMapper';
import { splitPath } from './graph';

// ─── Types ──────────────────────────────────────────────────────────────
interface DiffLine {
  type: 'add' | 'del' | 'ctx' | 'meta';
  text: string;
  oldNo: number | null;
  newNo: number | null;
}

interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

type FileStatus = 'added' | 'deleted' | 'renamed' | 'modified';

interface FileDiff {
  path: string;
  oldPath: string | null;
  status: FileStatus;
  binary: boolean;
  added: number;
  deleted: number;
  lineCount: number;
  hunks: DiffHunk[];
}

const LARGE_DIFF_LINES = 800;

const STATUS_LABEL: Record<FileStatus, string> = {
  added: 'Added',
  deleted: 'Deleted',
  renamed: 'Renamed',
  modified: 'Modified',
};

const STATUS_STYLE: Record<FileStatus, string> = {
  added: 'text-green bg-green/10',
  deleted: 'text-red bg-red/10',
  renamed: 'text-primary bg-primary/10',
  modified: 'text-text-secondary bg-card-background',
};

// ─── Parser ─────────────────────────────────────────────────────────────
function parseDiff(raw: string): FileDiff[] {
  const files: FileDiff[] = [];
  const blocks = raw.split(/^diff --git /m).slice(1);

  for (const block of blocks) {
    const lines = block.split('\n');
    const head = lines[0] ?? '';
    const m = head.match(/^a\/(.+) b\/(.+)$/);
    const file: FileDiff = {
      path: m ? m[2] : head,
      oldPath: m && m[1] !== m[2] ? m[1] : null,
      status: 'modified',
      binary: false,
      added: 0,
      deleted: 0,
      lineCount: 0,
      hunks: [],
    };

    let hunk: DiffHunk | null = null;
    let o = 0;
    let n = 0;

    for (let i = 1; i < lines.length; i++) {
      const l = lines[i];
      if (l.startsWith('@@')) {
        const h = l.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        o = h ? parseInt(h[1], 10) : 0;
        n = h ? parseInt(h[2], 10) : 0;
        hunk = { header: l, lines: [] };
        file.hunks.push(hunk);
        continue;
      }
      if (!hunk) {
        if (l.startsWith('new file mode')) file.status = 'added';
        else if (l.startsWith('deleted file mode')) file.status = 'deleted';
        else if (l.startsWith('rename from ')) {
          file.status = 'renamed';
          file.oldPath = l.slice(12);
        } else if (l.startsWith('rename to ')) file.path = l.slice(10);
        else if (l.startsWith('Binary files')) file.binary = true;
        continue;
      }

      const c = l[0];
      if (c === '+') {
        hunk.lines.push({ type: 'add', text: l.slice(1), oldNo: null, newNo: n++ });
        file.added++;
      } else if (c === '-') {
        hunk.lines.push({ type: 'del', text: l.slice(1), oldNo: o++, newNo: null });
        file.deleted++;
      } else if (c === ' ') {
        hunk.lines.push({ type: 'ctx', text: l.slice(1), oldNo: o++, newNo: n++ });
      } else if (c === '\\') {
        hunk.lines.push({ type: 'meta', text: l, oldNo: null, newNo: null });
      }
    }

    file.lineCount = file.hunks.reduce((sum, h) => sum + h.lines.length, 0);
    files.push(file);
  }
  return files;
}

// ─── File Section ───────────────────────────────────────────────────────
interface FileSectionProps {
  file: FileDiff;
  collapsed: boolean;
  onToggle: (path: string) => void;
}

const ROW_STYLE: Record<DiffLine['type'], string> = {
  add: 'bg-green/10',
  del: 'bg-red/10',
  ctx: '',
  meta: 'text-text-secondary/50 italic',
};

const FileSection = memo(function FileSection({ file, collapsed, onToggle }: FileSectionProps) {
  const { name, dir } = splitPath(file.path);

  let body: ReactElement;
  if (file.binary) {
    body = (
      <div className={'px-4 py-3 text-[11.5px] text-text-secondary/60'}>Binary file not shown</div>
    );
  } else if (file.hunks.length === 0) {
    body = (
      <div className={'px-4 py-3 text-[11.5px] text-text-secondary/60'}>No content changes</div>
    );
  } else {
    body = (
      <div>
        {file.hunks.map((h, hi) => (
          <div key={hi}>
            <div
              className={
                'flex items-center px-3 h-6 bg-primary/10 text-primary/80 font-mono text-[11px] truncate'
              }
            >
              {h.header}
            </div>
            {h.lines.map((ln, li) => (
              <div
                key={li}
                className={cn('flex font-mono text-[12px] leading-[20px]', ROW_STYLE[ln.type])}
              >
                <span
                  className={'w-12 shrink-0 pr-2 text-right select-none text-text-secondary/40'}
                >
                  {ln.oldNo ?? ''}
                </span>
                <span
                  className={'w-12 shrink-0 pr-2 text-right select-none text-text-secondary/40'}
                >
                  {ln.newNo ?? ''}
                </span>
                <span
                  className={cn(
                    'w-4 shrink-0 text-center select-none',
                    ln.type === 'add' && 'text-green',
                    ln.type === 'del' && 'text-red',
                  )}
                >
                  {ln.type === 'add' ? '+' : ln.type === 'del' ? '-' : ''}
                </span>
                <span
                  className={'flex-1 min-w-0 whitespace-pre-wrap break-all pr-4 text-text-primary'}
                >
                  {ln.text}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div data-diff-path={file.path} className={'border-b border-border'}>
      <div
        onClick={() => onToggle(file.path)}
        className={
          'sticky top-0 z-10 flex items-center gap-2 px-3 h-9 bg-sidebar-background border-b border-border cursor-pointer hover:bg-card-hover transition-colors'
        }
      >
        {collapsed ? (
          <ChevronRight className={'w-3.5 h-3.5 shrink-0 text-text-secondary/60'} />
        ) : (
          <ChevronDown className={'w-3.5 h-3.5 shrink-0 text-text-secondary/60'} />
        )}
        <img src={getFileIconPath(name)} alt={''} className={'w-4 h-4 shrink-0'} />
        <span
          className={'text-[12.5px] font-semibold text-text-primary truncate shrink-0 max-w-[40%]'}
        >
          {name}
        </span>
        <span className={'flex-1 min-w-0 truncate text-[11px] text-text-secondary/50'}>
          {file.oldPath ? `${file.oldPath} → ${file.path}` : dir}
        </span>
        {collapsed && file.lineCount > LARGE_DIFF_LINES && (
          <span
            className={'text-[10.5px] text-text-secondary/60 shrink-0'}
          >{`Large diff · ${file.lineCount} lines`}</span>
        )}
        <span
          className={cn(
            'px-1.5 h-[18px] rounded flex items-center text-[10px] shrink-0',
            STATUS_STYLE[file.status],
          )}
        >
          {STATUS_LABEL[file.status]}
        </span>
        <span className={'font-mono text-[11px] text-green shrink-0'}>{`+${file.added}`}</span>
        <span className={'font-mono text-[11px] text-red shrink-0'}>{`-${file.deleted}`}</span>
      </div>
      {!collapsed && body}
    </div>
  );
});

// ─── Diff View ──────────────────────────────────────────────────────────
interface DiffViewProps {
  projectPath: string;
  hash: string;
  subject: string;
  activePath: string | null;
  onClose: () => void;
}

export const DiffView = memo(function DiffView({
  projectPath,
  hash,
  subject,
  activePath,
  onClose,
}: DiffViewProps) {
  const [files, setFiles] = useState<FileDiff[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    window.api
      .invoke('git:commit-diff', projectPath, hash)
      .then((res: { diff?: string; error?: string }) => {
        if (cancelled) return;
        if (res?.error) {
          setError(res.error);
          setFiles([]);
          return;
        }
        const parsed = parseDiff(res?.diff ?? '');
        setFiles(parsed);
        setCollapsed(
          new Set(
            parsed
              .filter((f) => f.lineCount > LARGE_DIFF_LINES && f.path !== activePath)
              .map((f) => f.path),
          ),
        );
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message ?? String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectPath, hash]);

  useEffect(() => {
    if (!activePath || loading) return;
    setCollapsed((prev) => {
      if (!prev.has(activePath)) return prev;
      const next = new Set(prev);
      next.delete(activePath);
      return next;
    });
    const id = requestAnimationFrame(() => {
      const nodes = Array.from(rootRef.current?.querySelectorAll('[data-diff-path]') ?? []);
      const el = nodes.find((n) => n.getAttribute('data-diff-path') === activePath);
      el?.scrollIntoView({ block: 'start' });
    });
    return () => cancelAnimationFrame(id);
  }, [activePath, loading, files]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const totals = useMemo(
    () =>
      files.reduce((acc, f) => ({ added: acc.added + f.added, deleted: acc.deleted + f.deleted }), {
        added: 0,
        deleted: 0,
      }),
    [files],
  );

  const toggle = (path: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  return (
    <section className={'flex-1 min-w-0 flex flex-col min-h-0'}>
      <div className={'h-11 shrink-0 px-3 flex items-center gap-3 border-b border-border'}>
        <button
          onClick={onClose}
          title={'Back to graph (Esc)'}
          className={
            'h-7 px-2 rounded-md flex items-center gap-1.5 text-[11.5px] text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors cursor-pointer'
          }
        >
          <ArrowLeft className={'w-3.5 h-3.5'} />
          Graph
        </button>
        <span
          className={
            'font-mono text-[11px] px-1.5 py-0.5 rounded bg-card-background border border-divider text-text-secondary'
          }
        >
          {hash.slice(0, 7)}
        </span>
        <span className={'flex-1 min-w-0 truncate text-[12.5px] font-semibold text-text-primary'}>
          {subject}
        </span>
        <span
          className={'text-[11.5px] text-text-secondary shrink-0'}
        >{`${files.length} files`}</span>
        <span className={'font-mono text-[11.5px] text-green shrink-0'}>{`+${totals.added}`}</span>
        <span className={'font-mono text-[11.5px] text-red shrink-0'}>{`-${totals.deleted}`}</span>
        <button
          onClick={() => setCollapsed(new Set())}
          className={
            'h-7 px-2 rounded-md text-[11px] text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors cursor-pointer'
          }
        >
          Expand all
        </button>
        <button
          onClick={() => setCollapsed(new Set(files.map((f) => f.path)))}
          className={
            'h-7 px-2 rounded-md text-[11px] text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors cursor-pointer'
          }
        >
          Collapse all
        </button>
      </div>

      {loading ? (
        <div className={'flex-1 flex items-center justify-center'}>
          <Loader2 className={'w-5 h-5 animate-spin text-text-secondary/60'} />
        </div>
      ) : error ? (
        <div
          className={
            'flex-1 flex flex-col items-center justify-center gap-2 text-text-secondary/60 text-xs'
          }
        >
          <AlertCircle className={'w-5 h-5'} />
          {error}
        </div>
      ) : files.length === 0 ? (
        <div className={'flex-1 flex items-center justify-center text-xs text-text-secondary/40'}>
          No diff available
        </div>
      ) : (
        <div ref={rootRef} className={'flex-1 overflow-y-auto'}>
          {files.map((f) => (
            <FileSection
              key={f.path}
              file={f}
              collapsed={collapsed.has(f.path)}
              onToggle={toggle}
            />
          ))}
        </div>
      )}
    </section>
  );
});
