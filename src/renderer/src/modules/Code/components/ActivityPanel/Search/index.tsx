/**
 * ------------------------------------------------------------------
 * Search
 * ------------------------------------------------------------------
 * Project-wide content search panel (right sidebar), powered by
 * ripgrep in the main process with results streamed in chunks.
 *
 * Files:
 * - useSearch.ts         : debounce + stream + cancel logic
 * - SearchResults.tsx    : result list / tree rendering
 * - SearchEmptyState.tsx : vertically centered empty / error states
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';

import {
  CaseSensitive,
  WholeWord,
  Regex,
  Replace,
  ReplaceAll,
  RefreshCw,
  Eraser,
  ListTree,
  List,
  ChevronsDownUp,
  Loader2,
  AlertCircle,
  AlertTriangle,
  SlidersHorizontal,
} from 'lucide-react';

import { Modal, ModalHeader, ModalBody, ModalFooter } from '@renderer/components/ui/Modal';
import { cn } from '@renderer/shared/utils/cn';

import { useCodeStore } from '../../../hooks/useCodeStore';
import { useSearch, type FileResult } from './useSearch';
import { SearchResults, buildMatcher } from './SearchResults';
import { SearchEmptyState, type EmptyVariant } from './SearchEmptyState';

// ─── Constants ──────────────────────────────────────────────────────────
const INPUT_WRAP_CLASS =
  'flex items-center gap-0.5 px-2 py-1 bg-input-background border border-border rounded-md ' +
  'focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/30 ' +
  'transition-colors min-w-0';

const INPUT_CLASS =
  'flex-1 min-w-0 bg-transparent outline-none text-xs text-text-primary placeholder:text-text-secondary/40';

const ICON_BUTTON_CLASS =
  'p-1 rounded text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors';

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

// ─── ToolbarToggle ──────────────────────────────────────────────────────
interface ToolbarToggleProps {
  active: boolean;
  label: string;
  title: string;
  dot?: boolean;
  onClick: () => void;
  children: ReactNode;
}

function ToolbarToggle({ active, label, title, dot, onClick, children }: ToolbarToggleProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        'relative flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] shrink-0 transition-colors',
        active
          ? 'text-primary bg-primary/10 border-primary/30'
          : 'text-text-secondary border-transparent hover:text-text-primary hover:bg-card-hover',
      )}
    >
      {children}
      <span>{label}</span>
      {dot && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />}
    </button>
  );
}

// ─── Component ──────────────────────────────────────────────────────────
export function Search() {
  const projectPath = useCodeStore(
    (s) => s.projects.find((p) => p.id === s.currentProjectId)?.path,
  );

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
  const [refreshKey, setRefreshKey] = useState(0);

  // ── State — result view ──
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [openOverrides, setOpenOverrides] = useState<Map<string, boolean>>(new Map());
  const [collapsedDirs, setCollapsedDirs] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);

  const options = useMemo(
    () => ({
      matchCase,
      wholeWord: matchWholeWord,
      isRegex: useRegex,
      include: includePattern,
      exclude: excludePattern,
    }),
    [matchCase, matchWholeWord, useRegex, includePattern, excludePattern],
  );

  const { results, status, error, truncated, session } = useSearch(
    projectPath,
    query,
    options,
    refreshKey,
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setDismissed(new Set());
    setOpenOverrides(new Map());
    setCollapsedDirs(new Set());
    setActionError(null);
  }, [session]);

  // ── Derived ──
  const hasQuery = query.trim().length > 0;
  const searching = status === 'searching';
  const hasFilters = includePattern.trim() !== '' || excludePattern.trim() !== '';

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

  const emptyVariant: EmptyVariant | null = !projectPath
    ? 'no-project'
    : !hasQuery
      ? 'idle'
      : status === 'error' && visible.length === 0
        ? 'error'
        : status === 'done' && visible.length === 0
          ? 'no-results'
          : null;

  const errorText = actionError ?? (visible.length > 0 ? error : null);
  const showSummary = searching || (hasQuery && visible.length > 0);

  // ── Handlers ──
  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleClear = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

  const handleCollapseAll = useCallback(() => {
    setOpenOverrides(new Map(visible.map((r) => [r.file, false])));
    setCollapsedDirs(new Set(groups ? groups.map(([dir]) => dir) : []));
  }, [visible, groups]);

  const toggleFile = useCallback((file: string, nextOpen: boolean) => {
    setOpenOverrides((prev) => new Map(prev).set(file, nextOpen));
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

  const handleOpenMatch = useCallback((file: string, line: number, column: number) => {
    const { activeWorkspaceSessionId, requestOpenFile } = useCodeStore.getState();
    if (!activeWorkspaceSessionId) return;
    const name = file.split(/[\\/]/).pop() ?? file;
    requestOpenFile(activeWorkspaceSessionId, file, name, { line, column });
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
        setActionError(e?.message || 'Replace failed');
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
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      setActionError(e?.message || 'Replace failed');
    } finally {
      setIsReplaceModalOpen(false);
    }
  };

  // ── Render ──
  return (
    <div className="flex flex-col h-full bg-sidebar-background">
      {/* HeaderBar */}
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

      {/* Search form — full width, no left gutter (panel lives on the right edge) */}
      <div className="shrink-0 p-2 space-y-1.5 border-b border-divider">
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
          <IconToggle active={matchCase} title="Match Case" onClick={() => setMatchCase((v) => !v)}>
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

        {/* Toolbar: toggles on the left, live summary pinned to the right */}
        <div className="flex items-center gap-1 min-w-0">
          <ToolbarToggle
            active={showReplace}
            label="Replace"
            title={showReplace ? 'Ẩn Replace' : 'Hiện Replace'}
            onClick={() => setShowReplace((v) => !v)}
          >
            <Replace className="w-3 h-3" strokeWidth={1.5} />
          </ToolbarToggle>
          <ToolbarToggle
            active={showDetails}
            label="Filters"
            title="Files to include / exclude"
            dot={hasFilters && !showDetails}
            onClick={() => setShowDetails((v) => !v)}
          >
            <SlidersHorizontal className="w-3 h-3" strokeWidth={1.5} />
          </ToolbarToggle>

          {showSummary && (
            <div className="ml-auto min-w-0 flex items-center gap-1 text-[11px] text-text-secondary/70">
              {searching && (
                <Loader2 className="w-3 h-3 animate-spin shrink-0" strokeWidth={1.5} />
              )}
              <span className="truncate tabular-nums" title={truncated ? 'Đã giới hạn số kết quả' : undefined}>
                {visibleMatches} in {visible.length} file{visible.length !== 1 ? 's' : ''}
                {truncated && !searching ? '+' : ''}
              </span>
            </div>
          )}
        </div>

        {showReplace && (
          <div className={INPUT_WRAP_CLASS}>
            <input
              type="text"
              placeholder="Replace"
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              className={INPUT_CLASS}
            />
            <button
              onClick={handleReplaceAllClick}
              disabled={!hasQuery || visible.length === 0}
              className="p-0.5 rounded text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Replace All"
            >
              <ReplaceAll className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        )}

        {showDetails && (
          <div className="space-y-1.5">
            <div className={INPUT_WRAP_CLASS}>
              <span className="w-12 shrink-0 text-[10px] text-text-secondary/60">Include</span>
              <input
                type="text"
                placeholder="*.ts, src/**"
                value={includePattern}
                onChange={(e) => setIncludePattern(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div className={INPUT_WRAP_CLASS}>
              <span className="w-12 shrink-0 text-[10px] text-text-secondary/60">Exclude</span>
              <input
                type="text"
                placeholder="*.test.ts, dist/**"
                value={excludePattern}
                onChange={(e) => setExcludePattern(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>
        )}
      </div>

      {errorText && (
        <div className="shrink-0 px-3 py-1.5 border-b border-divider text-[11px] flex items-center gap-2">
          <AlertCircle className="w-3 h-3 text-error shrink-0" strokeWidth={1.5} />
          <span className="truncate text-error">{errorText}</span>
        </div>
      )}

      {/* Results — flex column so the empty state can center vertically */}
      <div
        className={cn(
          'flex-1 min-h-0 flex flex-col overflow-y-auto',
          !emptyVariant && 'py-1 px-1',
        )}
      >
        {emptyVariant ? (
          <SearchEmptyState variant={emptyVariant} message={error} />
        ) : (
          <SearchResults
            files={visible}
            groups={groups}
            relPath={relPath}
            openOverrides={openOverrides}
            collapsedDirs={collapsedDirs}
            canReplace={canReplace}
            matcher={matcher}
            singleMatcher={singleMatcher}
            replacement={replacement}
            onToggleFile={toggleFile}
            onToggleDir={toggleDir}
            onDismiss={dismissFile}
            onReplaceFile={handleReplaceFile}
            onOpenMatch={handleOpenMatch}
          />
        )}
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