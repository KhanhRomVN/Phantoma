/**
 * ------------------------------------------------------------------
 * DiffBlock
 * ------------------------------------------------------------------
 * Block (không phải drawer/modal) hiển thị diff dạng split: số dòng,
 * hunk, dòng thêm/xoá, highlight cú pháp và highlight từ thay đổi.
 * - parseDiff: parse output `git diff` thành FileDiff[]
 * - FileSection: 1 file diff (có thể ẩn header)
 * - DiffBlock: nhận raw diff string + trạng thái loading/error
 * ------------------------------------------------------------------
 */

import { memo, useMemo, type ReactElement } from 'react';
import { AlertCircle, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

import { cn } from '@renderer/utils/cn';
import { getFileIconPath } from '@renderer/utils/file-icon';
import { detectLanguageId } from '@renderer/components/common/CodeBlock';
import { useDiffHighlight } from './diffHighlight';

// ─── Types ──────────────────────────────────────────────────────────────
export interface DiffLine {
  type: 'add' | 'del' | 'ctx' | 'meta';
  text: string;
  oldNo: number | null;
  newNo: number | null;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export type FileStatus = 'added' | 'deleted' | 'renamed' | 'modified';

export interface FileDiff {
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
  added: 'text-success bg-success/10',
  deleted: 'text-error bg-error/10',
  renamed: 'text-primary bg-primary/10',
  modified: 'text-text-secondary bg-card-background',
};

function splitPath(path: string): { name: string; dir: string } {
  const i = path.lastIndexOf('/');
  return i < 0 ? { name: path, dir: '' } : { name: path.slice(i + 1), dir: path.slice(0, i) };
}

// ─── Parser ─────────────────────────────────────────────────────────────
export function parseDiff(raw: string): FileDiff[] {
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

// ─── Rows ───────────────────────────────────────────────────────────────
const ROW_STYLE: Record<DiffLine['type'], string> = {
  add: 'bg-success/10',
  del: 'bg-error/10',
  ctx: '',
  meta: 'text-text-secondary/50 italic',
};

interface SplitRow {
  left: DiffLine | null;
  right: DiffLine | null;
}

function toSplitRows(lines: DiffLine[]): SplitRow[] {
  const rows: SplitRow[] = [];
  let i = 0;
  while (i < lines.length) {
    const ln = lines[i];
    if (ln.type === 'ctx') {
      rows.push({ left: ln, right: ln });
      i++;
      continue;
    }
    if (ln.type === 'meta') {
      rows.push({ left: ln, right: null });
      i++;
      continue;
    }
    const dels: DiffLine[] = [];
    const adds: DiffLine[] = [];
    while (i < lines.length && lines[i].type === 'del') dels.push(lines[i++]);
    while (i < lines.length && lines[i].type === 'add') adds.push(lines[i++]);
    const n = Math.max(dels.length, adds.length);
    for (let k = 0; k < n; k++) rows.push({ left: dels[k] ?? null, right: adds[k] ?? null });
  }
  return rows;
}

const WORD_RE = /[\p{L}\p{N}_]+|\s+|[^\p{L}\p{N}_\s]/gu;
const WORD_DEL = 'bg-error/30 rounded-[2px]';
const WORD_ADD = 'bg-success/30 rounded-[2px]';

type CharRange = [number, number];

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
}

function diffRanges(a: string, b: string): { a: CharRange; b: CharRange } | null {
  const ta = a.match(WORD_RE) ?? [];
  const tb = b.match(WORD_RE) ?? [];
  let p = 0;
  while (p < ta.length && p < tb.length && ta[p] === tb[p]) p++;
  let s = 0;
  while (s < ta.length - p && s < tb.length - p && ta[ta.length - 1 - s] === tb[tb.length - 1 - s])
    s++;
  const len = (t: string[], from: number, to: number) =>
    t.slice(from, to).reduce((n, x) => n + x.length, 0);
  const ra: CharRange = [len(ta, 0, p), a.length - len(ta, ta.length - s, ta.length)];
  const rb: CharRange = [len(tb, 0, p), b.length - len(tb, tb.length - s, tb.length)];
  const wholeA = ra[0] === 0 && ra[1] === a.length;
  const wholeB = rb[0] === 0 && rb[1] === b.length;
  if (wholeA && wholeB) return null;
  return { a: ra, b: rb };
}

function pairRanges(r: SplitRow): { a: CharRange; b: CharRange } | null {
  if (r.left?.type !== 'del' || r.right?.type !== 'add') return null;
  return diffRanges(r.left.text, r.right.text);
}

function markHtml(html: string, start: number, end: number, cls: string): string {
  if (end <= start) return html;
  let out = '';
  let pos = 0;
  for (const part of html.split(/(<[^>]+>)/)) {
    if (part.startsWith('<')) {
      out += part;
      continue;
    }
    const units = part.match(/&(?:#x?[0-9a-f]+|\w+);|[\s\S]/gi) ?? [];
    let buf = '';
    let inside = false;
    const flush = () => {
      if (buf) out += inside ? `<span class="${cls}">${buf}</span>` : buf;
      buf = '';
    };
    for (const u of units) {
      const ins = pos >= start && pos < end;
      if (ins !== inside) {
        flush();
        inside = ins;
      }
      buf += u;
      pos++;
    }
    flush();
  }
  return out;
}

function DiffCell({
  line,
  side,
  html,
  range,
}: {
  line: DiffLine | null;
  side: 'old' | 'new';
  html?: string;
  range?: CharRange;
}) {
  const no = line ? (side === 'old' ? line.oldNo : line.newNo) : null;
  const finalHtml =
    range && line
      ? markHtml(
          html ?? escapeHtml(line.text),
          range[0],
          range[1],
          side === 'old' ? WORD_DEL : WORD_ADD,
        )
      : html;
  const textClass = 'flex-1 min-w-0 whitespace-pre-wrap break-all pl-2 pr-3 text-text-primary';
  return (
    <div
      className={cn(
        'flex min-w-0',
        side === 'new' && 'border-l border-border',
        line ? ROW_STYLE[line.type] : 'bg-card-background/40',
      )}
    >
      <span className={'w-10 shrink-0 pr-2 text-right select-none text-text-secondary/40'}>
        {no ?? ''}
      </span>
      {finalHtml !== undefined ? (
        <span className={textClass} dangerouslySetInnerHTML={{ __html: finalHtml }} />
      ) : (
        <span className={textClass}>{line?.text ?? ''}</span>
      )}
    </div>
  );
}

// ─── File Section ───────────────────────────────────────────────────────
interface FileSectionProps {
  file: FileDiff;
  collapsed: boolean;
  onToggle: (path: string) => void;
  hideHeader?: boolean;
  rowClassName?: string;
  hideOldSide?: boolean;
}

export const FileSection = memo(function FileSection({
  file,
  collapsed,
  onToggle,
  hideHeader = false,
  rowClassName,
  hideOldSide = false,
}: FileSectionProps) {
  const { name, dir } = splitPath(file.path);
  const languageId = useMemo(() => detectLanguageId(file.path), [file.path]);
  const highlighted = useDiffHighlight(
    file.hunks,
    languageId,
    !collapsed && !file.binary && file.lineCount <= LARGE_DIFF_LINES,
  );

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
          <div key={hi} className={cn(hi > 0 && 'border-t border-border')}>
            {toSplitRows(h.lines).map((r, ri) => (
              <div
                key={ri}
                className={cn(
                  'grid font-mono',
                  hideOldSide ? 'grid-cols-1' : 'grid-cols-2',
                  rowClassName ?? 'text-[12px] leading-[20px]',
                )}
              >
                {!hideOldSide && (
                  <DiffCell
                    line={r.left}
                    side={'old'}
                    html={r.left ? highlighted.get(r.left) : undefined}
                    range={pairRanges(r)?.a}
                  />
                )}
                <DiffCell
                  line={r.right}
                  side={'new'}
                  html={r.right ? highlighted.get(r.right) : undefined}
                  range={pairRanges(r)?.b}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div data-diff-path={file.path} className={'border-b border-border'}>
      {!hideHeader && (
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
            className={
              'text-[12.5px] font-semibold text-text-primary truncate shrink-0 max-w-[40%]'
            }
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
          <span className={'font-mono text-[11px] text-success shrink-0'}>{`+${file.added}`}</span>
          <span className={'font-mono text-[11px] text-error shrink-0'}>{`-${file.deleted}`}</span>
        </div>
      )}
      {!collapsed && body}
    </div>
  );
});

// ─── DiffBlock ──────────────────────────────────────────────────────────
const NOOP = () => undefined;
const DEFAULT_ROW_CLASS = 'text-[12px] leading-[20px]';

export interface DiffBlockProps {
  diff: string;
  loading?: boolean;
  error?: string | null;
  hideHeader?: boolean;
  rowClassName?: string;
  className?: string;
}

export const DiffBlock = memo(function DiffBlock({
  diff,
  loading = false,
  error = null,
  hideHeader = true,
  rowClassName = DEFAULT_ROW_CLASS,
  className,
}: DiffBlockProps) {
  const files = useMemo(
    () =>
      parseDiff(diff).map((f) => ({
        ...f,
        hunks: f.hunks.map((h) => ({ ...h, lines: h.lines.filter((l) => l.type !== 'meta') })),
      })),
    [diff],
  );

  let content: ReactElement;
  if (loading) {
    content = (
      <div className={'flex flex-1 items-center justify-center py-8'}>
        <Loader2 className={'w-5 h-5 animate-spin text-text-secondary/60'} />
      </div>
    );
  } else if (error) {
    content = (
      <div
        className={
          'flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center text-xs text-error'
        }
      >
        <AlertCircle className={'w-5 h-5'} />
        {error}
      </div>
    );
  } else if (files.length === 0) {
    content = (
      <div className={'flex flex-1 items-center justify-center py-8 text-xs text-text-secondary/60'}>
        No differences
      </div>
    );
  } else {
    content = (
      <>
        {files.map((f) => (
          <FileSection
            key={f.path}
            file={f}
            collapsed={false}
            onToggle={NOOP}
            hideHeader={hideHeader}
            rowClassName={rowClassName}
          />
        ))}
      </>
    );
  }

  return <div className={cn('flex min-h-0 flex-col overflow-auto', className)}>{content}</div>;
});

export default DiffBlock;