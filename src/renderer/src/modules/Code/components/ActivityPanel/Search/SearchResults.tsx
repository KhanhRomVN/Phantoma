import { memo, useMemo } from 'react';
import { ChevronRight, ChevronDown, Replace, Folder, X } from 'lucide-react';
import { getFileIconPath } from '@renderer/shared/utils/fileIconMapper';
import { cn } from '@renderer/shared/utils/cn';
import type { FileResult } from './useSearch';

const MAX_MATCHES_PER_FILE = 200;
const MAX_LINE_LENGTH = 300;
const LEAD_CONTEXT = 24;
const AUTO_OPEN_FILES = 30;
const FALLBACK_FILE_ICON = '/images/icon/file.svg';

export interface MatcherOptions {
  matchCase: boolean;
  wholeWord: boolean;
  isRegex: boolean;
}

export function buildMatcher(query: string, opts: MatcherOptions): RegExp | null {
  try {
    let src = opts.isRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (opts.wholeWord) src = `\\b(?:${src})\\b`;
    return new RegExp(src, opts.matchCase ? 'g' : 'gi');
  } catch {
    return null;
  }
}

interface LinePart {
  text: string;
  hit: boolean;
  rep?: string;
}

interface HighlightedLineProps {
  text: string;
  matcher: RegExp | null;
  singleMatcher: RegExp | null;
  replacement: string | null;
}

const HighlightedLine = memo(function HighlightedLine({
  text,
  matcher,
  singleMatcher,
  replacement,
}: HighlightedLineProps) {
  const parts = useMemo<LinePart[]>(() => {
    const full = text.trim();
    if (!matcher) return [{ text: full.slice(0, MAX_LINE_LENGTH), hit: false }];

    matcher.lastIndex = 0;
    const first = matcher.exec(full);
    matcher.lastIndex = 0;
    const start = first ? Math.max(0, first.index - LEAD_CONTEXT) : 0;
    const line = full.slice(start, start + MAX_LINE_LENGTH);

    const out: LinePart[] = start > 0 ? [{ text: '…', hit: false }] : [];
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = matcher.exec(line)) !== null) {
      if (m[0].length === 0) {
        matcher.lastIndex++;
        continue;
      }
      if (m.index > last) out.push({ text: line.slice(last, m.index), hit: false });

      let rep: string | undefined;
      if (replacement !== null) {
        try {
          rep = singleMatcher ? m[0].replace(singleMatcher, replacement) : replacement;
        } catch {
          rep = replacement;
        }
      }
      out.push({ text: m[0], hit: true, rep });
      last = m.index + m[0].length;
    }
    if (last < line.length) out.push({ text: line.slice(last), hit: false });
    return out;
  }, [text, matcher, singleMatcher, replacement]);

  return (
    <>
      {parts.map((p, i) =>
        p.hit ? (
          <span key={i}>
            <span
              className={cn(
                'font-semibold text-primary',
                p.rep !== undefined && 'text-error line-through decoration-error/60',
              )}
            >
              {p.text}
            </span>
            {p.rep !== undefined && p.rep !== '' && (
              <span className="font-semibold text-success">{p.rep}</span>
            )}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
});

interface FileGroupProps {
  result: FileResult;
  rel: string;
  indent: number;
  showDir: boolean;
  isOpen: boolean;
  canReplace: boolean;
  matcher: RegExp | null;
  singleMatcher: RegExp | null;
  replacement: string | null;
  onToggle: (file: string, nextOpen: boolean) => void;
  onDismiss: (file: string) => void;
  onReplaceFile: (file: string) => void;
  onOpenMatch: (file: string, line: number, column: number) => void;
}

const FileGroup = memo(function FileGroup({
  result,
  rel,
  indent,
  showDir,
  isOpen,
  canReplace,
  matcher,
  singleMatcher,
  replacement,
  onToggle,
  onDismiss,
  onReplaceFile,
  onOpenMatch,
}: FileGroupProps) {
  const slash = rel.lastIndexOf('/');
  const fileName = slash >= 0 ? rel.slice(slash + 1) : rel;
  const dir = slash >= 0 ? rel.slice(0, slash) : '';
  const shown = result.matches.slice(0, MAX_MATCHES_PER_FILE);
  const hidden = result.matches.length - shown.length;

  return (
    <div>
      <div
        className="group flex items-center gap-1 pr-1.5 rounded hover:bg-card-hover transition-colors"
        style={{ paddingLeft: indent }}
      >
        <button
          onClick={() => onToggle(result.file, !isOpen)}
          className="flex-1 min-w-0 flex items-center gap-1.5 py-1 text-left"
          title={rel}
        >
          {isOpen ? (
            <ChevronDown className="w-3 h-3 shrink-0 text-text-secondary" strokeWidth={1.5} />
          ) : (
            <ChevronRight className="w-3 h-3 shrink-0 text-text-secondary" strokeWidth={1.5} />
          )}
          <img
            src={getFileIconPath(fileName)}
            alt=""
            className="w-4 h-4 shrink-0"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              if (img.src.endsWith(FALLBACK_FILE_ICON)) img.style.display = 'none';
              else img.src = FALLBACK_FILE_ICON;
            }}
          />
          <span className="text-xs text-text-primary truncate">{fileName}</span>
          {showDir && dir && (
            <span className="text-[10px] text-text-secondary/50 truncate">{dir}</span>
          )}
        </button>

        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
          {canReplace && (
            <button
              onClick={() => onReplaceFile(result.file)}
              className="p-0.5 rounded text-text-secondary hover:text-text-primary hover:bg-card-background"
              title="Replace trong file này"
            >
              <Replace className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          )}
          <button
            onClick={() => onDismiss(result.file)}
            className="p-0.5 rounded text-text-secondary hover:text-text-primary hover:bg-card-background"
            title="Loại khỏi kết quả"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>

        <span className="text-[10px] text-text-secondary/80 bg-card-background rounded-full px-1.5 shrink-0 tabular-nums group-hover:hidden">
          {result.matches.length}
        </span>
      </div>

      {isOpen && (
        <div>
          {shown.map((m, i) => (
            <div
              key={`${m.lineNumber}-${m.column}-${i}`}
              onClick={() => onOpenMatch(result.file, m.lineNumber, m.column)}
              className="flex items-baseline gap-2 pr-2 py-0.5 rounded hover:bg-card-hover cursor-pointer"
              style={{ paddingLeft: indent + 22 }}
              title={m.lineContent.trim()}
            >
              <span className="flex-1 min-w-0 truncate text-[11px] font-mono text-text-secondary">
                <HighlightedLine
                  text={m.lineContent}
                  matcher={matcher}
                  singleMatcher={singleMatcher}
                  replacement={replacement}
                />
              </span>
              <span className="text-[10px] text-text-secondary/40 tabular-nums shrink-0">
                {m.lineNumber}
              </span>
            </div>
          ))}
          {hidden > 0 && (
            <div
              className="text-[10px] text-text-secondary/50 py-0.5"
              style={{ paddingLeft: indent + 22 }}
            >
              +{hidden} kết quả nữa
            </div>
          )}
        </div>
      )}
    </div>
  );
});

interface SearchResultsProps {
  files: FileResult[];
  groups: Array<[string, FileResult[]]> | null;
  relPath: (abs: string) => string;
  openOverrides: Map<string, boolean>;
  collapsedDirs: Set<string>;
  canReplace: boolean;
  matcher: RegExp | null;
  singleMatcher: RegExp | null;
  replacement: string | null;
  onToggleFile: (file: string, nextOpen: boolean) => void;
  onToggleDir: (dir: string) => void;
  onDismiss: (file: string) => void;
  onReplaceFile: (file: string) => void;
  onOpenMatch: (file: string, line: number, column: number) => void;
}

export function SearchResults({
  files,
  groups,
  relPath,
  openOverrides,
  collapsedDirs,
  canReplace,
  matcher,
  singleMatcher,
  replacement,
  onToggleFile,
  onToggleDir,
  onDismiss,
  onReplaceFile,
  onOpenMatch,
}: SearchResultsProps) {
  const order = useMemo(() => new Map(files.map((f, i) => [f.file, i])), [files]);

  const renderFile = (r: FileResult, indent: number, showDir: boolean) => (
    <FileGroup
      key={r.file}
      result={r}
      rel={relPath(r.file)}
      indent={indent}
      showDir={showDir}
      isOpen={openOverrides.get(r.file) ?? (order.get(r.file) ?? 0) < AUTO_OPEN_FILES}
      canReplace={canReplace}
      matcher={matcher}
      singleMatcher={singleMatcher}
      replacement={replacement}
      onToggle={onToggleFile}
      onDismiss={onDismiss}
      onReplaceFile={onReplaceFile}
      onOpenMatch={onOpenMatch}
    />
  );

  if (!groups) return <>{files.map((r) => renderFile(r, 4, true))}</>;

  return (
    <>
      {groups.map(([dir, group]) => {
        const dirCollapsed = collapsedDirs.has(dir);
        const dirMatches = group.reduce((sum, f) => sum + f.matches.length, 0);
        return (
          <div key={dir || '__root__'}>
            {dir && (
              <button
                onClick={() => onToggleDir(dir)}
                className="w-full flex items-center gap-1.5 pl-1 pr-1.5 py-1 rounded hover:bg-card-hover text-left transition-colors"
                title={dir}
              >
                {dirCollapsed ? (
                  <ChevronRight className="w-3 h-3 shrink-0 text-text-secondary" strokeWidth={1.5} />
                ) : (
                  <ChevronDown className="w-3 h-3 shrink-0 text-text-secondary" strokeWidth={1.5} />
                )}
                <Folder className="w-3.5 h-3.5 shrink-0 text-text-secondary/70" strokeWidth={1.5} />
                <span className="text-xs text-text-secondary truncate">{dir}</span>
                <span className="ml-auto text-[10px] text-text-secondary/60 bg-card-background rounded-full px-1.5 shrink-0 tabular-nums">
                  {dirMatches}
                </span>
              </button>
            )}
            {!dirCollapsed && group.map((r) => renderFile(r, dir ? 18 : 4, false))}
          </div>
        );
      })}
    </>
  );
}