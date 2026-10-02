/**
 * ------------------------------------------------------------------
 * Search
 * ------------------------------------------------------------------
 * VS Code-style search panel in the Activity sidebar. Searches file
 * content within the current project, with match-case / whole-word /
 * regex toggles, include / exclude pattern filters, a collapsible
 * replace row, and grouped results with highlighted matches.
 *
 * Main features:
 * - Debounced content search via `fs:search` IPC
 * - Inline toggles: match case, whole word, regex
 * - Collapsible replace row with live replace preview + replace-all
 * - "..." toggles include / exclude pattern inputs
 * - Results as flat list or folder tree, per-file dismiss / replace
 * - Highlighted matches inside each result line
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import type { ReactNode } from 'react';

// ── UI ──
import {
  Search as SearchIcon,
  ChevronRight,
  ChevronDown,
  CaseSensitive,
  WholeWord,
  Regex,
  ReplaceAll,
  Replace,
  RefreshCw,
  Eraser,
  ListTree,
  List,
  ChevronsDownUp,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Folder,
  MoreHorizontal,
  X,
} from 'lucide-react';

// ── Components ──
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@renderer/components/ui/Modal';

// ── Utils ──
import { getFileIconPath } from '@renderer/shared/utils/fileIconMapper';
import { cn } from '@renderer/shared/utils/cn';

// ── Hooks ──
import { useCodeStore } from '../../../hooks/useCodeStore';

// ─── Types ──────────────────────────────────────────────────────────────
interface SearchMatch {
  lineNumber: number;
  lineContent: string;
  column: number;
}

interface FileResult {
  file: string;
  matches: SearchMatch[];
}

interface SearchResponse {
  results: FileResult[];
  totalMatches: number;
  totalFilesSearched: number;
}

interface MatcherOptions {
  matchCase: boolean;
  wholeWord: boolean;
  isRegex: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────
const MAX_MATCHES_PER_FILE = 200;
const MAX_LINE_LENGTH = 300;
const FALLBACK_FILE_ICON = '/images/icon/file.svg';

const INPUT_WRAP_CLASS =
  'flex items-center gap-0.5 px-2 py-1 bg-input-background border border-border rounded-md ' +
  'focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/30 ' +
  'transition-colors min-w-0';

const INPUT_CLASS =
  'flex-1 min-w-0 bg-transparent outline-none text-xs text-text-primary placeholder:text-text-secondary/40';

const ICON_BUTTON_CLASS =
  'p-1 rounded text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors';

// ─── Helpers ────────────────────────────────────────────────────────────
/** Tạo RegExp (flag g) từ query + options. Trả về null nếu regex không hợp lệ. */
function buildMatcher(query: string, opts: MatcherOptions): RegExp | null {
  try {
    let src = opts.isRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (opts.wholeWord) src = `\\b(?:${src})\\b`;
    return new RegExp(src, opts.matchCase ? 'g' : 'gi');
  } catch {
    return null;
  }
}

// ─── IconToggle ─────────────────────────────────────────────────────────
interface IconToggleProps {
  active: boolean;
  title: string;
  onClick: () => void;
  children: ReactNode;
}

function IconToggle({ active, title, onClick, children }: IconToggleProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        'p-0.5 rounded border transition-colors shrink-0',
        active
          ? 'text-primary bg-primary/15 border-primary/40'
          : 'text-text-secondary/70 border-transparent hover:text-text-primary hover:bg-card-hover',
      )}
    >
      {children}
    </button>
  );
}

// ─── HighlightedLine ────────────────────────────────────────────────────
interface HighlightedLineProps {
  text: string;
  matcher: RegExp | null;
  singleMatcher: RegExp | null;
  /** null = không hiển thị preview replace */
  replacement: string | null;
}

interface LinePart {
  text: string;
  hit: boolean;
  rep?: string;
}

const HighlightedLine = memo(function HighlightedLine({
  text,
  matcher,
  singleMatcher,
  replacement,
}: HighlightedLineProps) {
  const parts = useMemo<LinePart[]>(() => {
    const line = text.trim().slice(0, MAX_LINE_LENGTH);
    if (!matcher) return [{ text: line, hit: false }];

    const out: LinePart[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    matcher.lastIndex = 0;
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
                'rounded-sm px-px bg-primary/25 text-text-primary',
                p.rep !== undefined && 'bg-error/25 line-through decoration-error/60',
              )}
            >
              {p.text}
            </span>
            {p.rep !== undefined && p.rep !== '' && (
              <span className="rounded-sm px-px bg-success/25 text-text-primary">{p.rep}</span>
            )}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
});

// ─── FileGroup ──────────────────────────────────────────────────────────
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
  onToggle: (file: string) => void;
  onDismiss: (file: string) => void;
  onReplaceFile: (file: string) => void;
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
          onClick={() => onToggle(result.file)}
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
              className="flex items-baseline gap-2 pr-2 py-0.5 rounded hover:bg-card-hover cursor-pointer"
              style={{ paddingLeft: indent + 22 }}
              title={m.lineContent.trim()}
            >
              <span className="min-w-0 truncate text-[11px] font-mono text-text-secondary">
                <HighlightedLine
                  text={m.lineContent}
                  matcher={matcher}
                  singleMatcher={singleMatcher}
                  replacement={replacement}
                />
              </span>
              <span className="ml-auto text-[10px] text-text-secondary/40 tabular-nums shrink-0">
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

// ─── Component ──────────────────────────────────────────────────────────
export function Search() {
  // ── Store ──
  const projectPath = useCodeStore(
    (s) => s.projects.find((p) => p.id === s.currentProjectId)?.path,
  );

  // ── Refs ──
  const inputRef = useRef<HTMLInputElement>(null);

  // ── State — query & options ──
  const [query, setQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [includePattern, setIncludePattern] = useState('');
  const [excludePattern, setExcludePattern] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [viewAsTree, setViewAsTree] = useState(false);

  // ── State — results ──
  const [results, setResults] = useState<FileResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [collapsedDirs, setCollapsedDirs] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);

  // ── Effect — focus input on mount ──
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ── Effect — debounced search ──
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || !projectPath) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const res: SearchResponse = await (window as any).api.invoke(
          'fs:search',
          projectPath,
          trimmed,
          {
            caseSensitive: matchCase,
            wholeWord: matchWholeWord,
            isRegex: useRegex,
            includePattern: includePattern.trim() || undefined,
            excludePattern: excludePattern.trim() || undefined,
          },
        );
        if (cancelled) return;
        const list = res?.results || [];
        setResults(list);
        setDismissed(new Set());
        setCollapsedDirs(new Set());
        setExpandedFiles(new Set(list.slice(0, 20).map((r) => r.file)));
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || 'Search failed');
        setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    query,
    matchCase,
    matchWholeWord,
    useRegex,
    includePattern,
    excludePattern,
    projectPath,
    refreshKey,
  ]);

  // ── Derived ──
  const hasQuery = query.trim().length > 0;

  const visible = useMemo(
    () => results.filter((r) => !dismissed.has(r.file)),
    [results, dismissed],
  );

  const visibleMatches = useMemo(
    () => visible.reduce((sum, r) => sum + r.matches.length, 0),
    [visible],
  );

  const matcher = useMemo(
    () =>
      hasQuery
        ? buildMatcher(query.trim(), {
            matchCase,
            wholeWord: matchWholeWord,
            isRegex: useRegex,
          })
        : null,
    [hasQuery, query, matchCase, matchWholeWord, useRegex],
  );

  const singleMatcher = useMemo(
    () => (matcher ? new RegExp(matcher.source, matcher.flags.replace('g', '')) : null),
    [matcher],
  );

  const replacement = showReplace && replaceQuery !== '' ? replaceQuery : null;
  const canReplace = showReplace && hasQuery;

  const relPath = useCallback(
    (abs: string) =>
      projectPath && abs.startsWith(projectPath) ? abs.slice(projectPath.length + 1) : abs,
    [projectPath],
  );

  const groups = useMemo(() => {
    if (!viewAsTree) return null;
    const map = new Map<string, FileResult[]>();
    for (const r of visible) {
      const rel = relPath(r.file);
      const i = rel.lastIndexOf('/');
      const dir = i >= 0 ? rel.slice(0, i) : '';
      const bucket = map.get(dir);
      if (bucket) bucket.push(r);
      else map.set(dir, [r]);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [viewAsTree, visible, relPath]);

  // ── Handlers ──
  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
    inputRef.current?.focus();
  }, []);

  const handleCollapseAll = useCallback(() => {
    setExpandedFiles(new Set());
    setCollapsedDirs(new Set(groups ? groups.map(([dir]) => dir) : []));
  }, [groups]);

  const toggleFile = useCallback((file: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(file)) next.delete(file);
      else next.add(file);
      return next;
    });
  }, []);

  const toggleDir = useCallback((dir: string) => {
    setCollapsedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dir)) next.delete(dir);
      else next.add(dir);
      return next;
    });
  }, []);

  const dismissFile = useCallback((file: string) => {
    setDismissed((prev) => new Set(prev).add(file));
  }, []);

  const replaceOptions = useMemo(
    () => ({ caseSensitive: matchCase, wholeWord: matchWholeWord, isRegex: useRegex }),
    [matchCase, matchWholeWord, useRegex],
  );

  const handleReplaceFile = useCallback(
    async (file: string) => {
      try {
        await (window as any).api.invoke(
          'fs:replace-all',
          [file],
          query.trim(),
          replaceQuery,
          replaceOptions,
        );
        setRefreshKey((k) => k + 1);
      } catch (e: any) {
        setError(e?.message || 'Replace failed');
      }
    },
    [query, replaceQuery, replaceOptions],
  );

  const handleReplaceAllClick = () => {
    if (!hasQuery || visible.length === 0) return;
    setIsReplaceModalOpen(true);
  };

  const handleConfirmReplaceAll = async () => {
    if (!projectPath || visible.length === 0) return;
    try {
      await (window as any).api.invoke(
        'fs:replace-all',
        visible.map((r) => r.file),
        query.trim(),
        replaceQuery,
        replaceOptions,
      );
      setIsReplaceModalOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      setError(e?.message || 'Replace failed');
      setIsReplaceModalOpen(false);
    }
  };

  // ── Render helpers ──
  const renderFile = (r: FileResult, indent: number, showDir: boolean) => (
    <FileGroup
      key={r.file}
      result={r}
      rel={relPath(r.file)}
      indent={indent}
      showDir={showDir}
      isOpen={expandedFiles.has(r.file)}
      canReplace={canReplace}
      matcher={matcher}
      singleMatcher={singleMatcher}
      replacement={replacement}
      onToggle={toggleFile}
      onDismiss={dismissFile}
      onReplaceFile={handleReplaceFile}
    />
  );

  // ── Render ──
  return (
    <div className="flex flex-col h-full bg-sidebar-background">
      {/* HeaderBar — đồng bộ với FileExplore */}
      <div className="flex items-center justify-between h-9 px-2 border-b border-divider flex-shrink-0 bg-sidebar-background">
        <span className="text-[11px] font-medium uppercase tracking-wide text-text-secondary truncate">
          Search
        </span>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={handleRefresh} className={ICON_BUTTON_CLASS} title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button onClick={handleClear} className={ICON_BUTTON_CLASS} title="Clear search">
            <Eraser className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setViewAsTree((v) => !v)}
            className={cn(ICON_BUTTON_CLASS, viewAsTree && 'text-primary bg-primary/10')}
            title={viewAsTree ? 'View as List' : 'View as Tree'}
          >
            {viewAsTree ? (
              <List className="w-3.5 h-3.5" strokeWidth={1.5} />
            ) : (
              <ListTree className="w-3.5 h-3.5" strokeWidth={1.5} />
            )}
          </button>
          <button onClick={handleCollapseAll} className={ICON_BUTTON_CLASS} title="Collapse All">
            <ChevronsDownUp className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Search form */}
      <div className="shrink-0 p-2 border-b border-divider">
        <div className="flex items-start gap-1">
          <button
            onClick={() => setShowReplace((v) => !v)}
            className="mt-1 p-0.5 rounded text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors shrink-0"
            title={showReplace ? 'Ẩn Replace' : 'Hiện Replace'}
          >
            {showReplace ? (
              <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.5} />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            )}
          </button>

          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Query input + toggles */}
            <div className={INPUT_WRAP_CLASS}>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRefresh();
                  if (e.key === 'Escape') handleClear();
                }}
                className={INPUT_CLASS}
              />
              <IconToggle
                active={matchCase}
                title="Match Case"
                onClick={() => setMatchCase((v) => !v)}
              >
                <CaseSensitive className="w-3.5 h-3.5" strokeWidth={1.5} />
              </IconToggle>
              <IconToggle
                active={matchWholeWord}
                title="Match Whole Word"
                onClick={() => setMatchWholeWord((v) => !v)}
              >
                <WholeWord className="w-3.5 h-3.5" strokeWidth={1.5} />
              </IconToggle>
              <IconToggle
                active={useRegex}
                title="Use Regular Expression"
                onClick={() => setUseRegex((v) => !v)}
              >
                <Regex className="w-3.5 h-3.5" strokeWidth={1.5} />
              </IconToggle>
            </div>

            {/* Replace row */}
            {showReplace && (
              <div className="flex items-center gap-1">
                <div className={cn(INPUT_WRAP_CLASS, 'flex-1')}>
                  <input
                    type="text"
                    placeholder="Replace"
                    value={replaceQuery}
                    onChange={(e) => setReplaceQuery(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <button
                  onClick={handleReplaceAllClick}
                  disabled={!hasQuery || visible.length === 0}
                  className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Replace All"
                >
                  <ReplaceAll className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            )}

            {/* Details toggle */}
            <div className="flex items-center">
              <IconToggle
                active={showDetails}
                title="Toggle Search Details (include / exclude)"
                onClick={() => setShowDetails((v) => !v)}
              >
                <MoreHorizontal className="w-3.5 h-3.5" strokeWidth={1.5} />
              </IconToggle>
            </div>

            {/* Include / exclude */}
            {showDetails && (
              <div className="space-y-1.5">
                <div>
                  <div className="text-[10px] text-text-secondary/70 mb-0.5">files to include</div>
                  <div className={INPUT_WRAP_CLASS}>
                    <input
                      type="text"
                      placeholder="e.g. *.ts, src/**/include"
                      value={includePattern}
                      onChange={(e) => setIncludePattern(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-text-secondary/70 mb-0.5">files to exclude</div>
                  <div className={INPUT_WRAP_CLASS}>
                    <input
                      type="text"
                      placeholder="e.g. *.test.ts, dist/**"
                      value={excludePattern}
                      onChange={(e) => setExcludePattern(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status row */}
      {(loading || error || (hasQuery && visible.length > 0)) && (
        <div className="shrink-0 px-3 py-1.5 border-b border-divider text-[11px] text-text-secondary/70 flex items-center gap-2">
          {loading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} />
              <span>Searching…</span>
            </>
          ) : error ? (
            <>
              <AlertCircle className="w-3 h-3 text-error shrink-0" strokeWidth={1.5} />
              <span className="truncate text-error">{error}</span>
            </>
          ) : (
            <span>
              {visibleMatches} result{visibleMatches !== 1 ? 's' : ''} in {visible.length} file
              {visible.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto py-1 px-1">
        {!projectPath && (
          <div className="p-4 text-xs text-text-secondary/40 text-center">No project open</div>
        )}

        {projectPath && !hasQuery && (
          <div className="flex flex-col items-center justify-center gap-2 p-6 text-text-secondary/40">
            <SearchIcon className="w-6 h-6" strokeWidth={1.25} />
            <span className="text-xs text-center">Nhập từ khóa để tìm trong project</span>
          </div>
        )}

        {projectPath && hasQuery && !loading && !error && visible.length === 0 && (
          <div className="p-4 text-xs text-text-secondary/50 text-center">
            No results found
            {(includePattern.trim() || excludePattern.trim()) && (
              <div className="mt-1 text-[10px] text-text-secondary/40">
                Đang áp dụng bộ lọc include / exclude
              </div>
            )}
          </div>
        )}

        {/* List mode */}
        {!viewAsTree && visible.map((r) => renderFile(r, 4, true))}

        {/* Tree mode */}
        {viewAsTree &&
          groups?.map(([dir, files]) => {
            const dirCollapsed = collapsedDirs.has(dir);
            const dirMatches = files.reduce((sum, f) => sum + f.matches.length, 0);
            return (
              <div key={dir || '__root__'}>
                {dir && (
                  <button
                    onClick={() => toggleDir(dir)}
                    className="w-full flex items-center gap-1.5 pl-1 pr-1.5 py-1 rounded hover:bg-card-hover text-left transition-colors"
                    title={dir}
                  >
                    {dirCollapsed ? (
                      <ChevronRight
                        className="w-3 h-3 shrink-0 text-text-secondary"
                        strokeWidth={1.5}
                      />
                    ) : (
                      <ChevronDown
                        className="w-3 h-3 shrink-0 text-text-secondary"
                        strokeWidth={1.5}
                      />
                    )}
                    <Folder
                      className="w-3.5 h-3.5 shrink-0 text-text-secondary/70"
                      strokeWidth={1.5}
                    />
                    <span className="text-xs text-text-secondary truncate">{dir}</span>
                    <span className="ml-auto text-[10px] text-text-secondary/60 bg-card-background rounded-full px-1.5 shrink-0 tabular-nums">
                      {dirMatches}
                    </span>
                  </button>
                )}
                {!dirCollapsed && files.map((r) => renderFile(r, dir ? 18 : 4, false))}
              </div>
            );
          })}
      </div>

      {/* Replace-All confirmation modal */}
      <Modal
        isOpen={isReplaceModalOpen}
        onClose={() => setIsReplaceModalOpen(false)}
        closeOnBackdropClick={false}
      >
        <ModalHeader
          title="Replace All"
          description={`Thay thế "${query}" bằng "${replaceQuery}" trong ${visible.length} file (${visibleMatches} kết quả).`}
          onClose={() => setIsReplaceModalOpen(false)}
        />
        <ModalBody>
          <div className="flex items-start gap-3 p-3 rounded-md bg-error/10 border border-error/20">
            <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="text-[13px] text-text-secondary leading-relaxed">
              Hành động này sẽ ghi đè nội dung file. Không thể hoàn tác.
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <button
            onClick={() => setIsReplaceModalOpen(false)}
            className="px-4 py-2 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors text-[13px]"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirmReplaceAll}
            className="px-4 py-2 rounded-lg bg-error text-white hover:bg-error/90 transition-colors text-[13px] flex items-center gap-2"
          >
            <ReplaceAll className="w-4 h-4" strokeWidth={1.5} />
            Replace All
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export default Search;
