/**
 * ------------------------------------------------------------------
 * Search
 * ------------------------------------------------------------------
 * VS Code-style search panel in the Activity sidebar. Searches file
 * content within the current project, with match-case / whole-word /
 * regex toggles, include / exclude pattern filters, a collapsible
 * replace row, and grouped results.
 *
 * Main features:
 * - Debounced content search via `fs:search` IPC
 * - Toggle icons: match case, whole word, regex
 * - Collapsible replace row with replace-all confirmation
 * - Include / exclude file path patterns
 * - Grouped results (per file, expandable to individual matches)
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useState, useEffect } from 'react';

// ── UI ──
import {
  Search as SearchIcon,
  ChevronRight,
  ChevronDown,
  CaseSensitive,
  WholeWord,
  Regex,
  ReplaceAll,
  RefreshCw,
  Eraser,
  ListTree,
  ChevronsDownUp,
  Loader2,
  AlertCircle,
  FileText,
  AlertTriangle,
} from 'lucide-react';

// ── Components ──
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@renderer/components/ui/Modal';

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

// ─── Component ──────────────────────────────────────────────────────────
export function Search() {
  // ── Store ──
  const projectPath = useCodeStore(
    (s) => s.projects.find((p) => p.id === s.currentProjectId)?.path,
  );

  // ── State — query & options ──
  const [query, setQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [includePattern, setIncludePattern] = useState('');
  const [excludePattern, setExcludePattern] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [viewAsTree, setViewAsTree] = useState(false);

  // ── State — results ──
  const [results, setResults] = useState<FileResult[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);

  // ── Effect — debounced search ──
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || !projectPath) {
      setResults([]);
      setTotalMatches(0);
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
        setTotalMatches(res?.totalMatches || 0);
        setExpandedFiles(new Set(list.slice(0, 20).map((r) => r.file)));
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || 'Search failed');
        setResults([]);
        setTotalMatches(0);
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

  // ── Handlers ──
  const handleRefresh = () => setRefreshKey((k) => k + 1);

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setTotalMatches(0);
    setError(null);
  };

  const handleReplaceAllClick = () => {
    if (!query.trim() || results.length === 0) return;
    setIsReplaceModalOpen(true);
  };

  const handleConfirmReplaceAll = async () => {
    if (!projectPath || results.length === 0) return;
    try {
      const files = results.map((r) => r.file);
      await (window as any).api.invoke('fs:replace-all', files, query.trim(), replaceQuery, {
        caseSensitive: matchCase,
        wholeWord: matchWholeWord,
        isRegex: useRegex,
      });
      setIsReplaceModalOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      setError(e?.message || 'Replace failed');
      setIsReplaceModalOpen(false);
    }
  };

  const handleCollapseAll = () => {
    setExpandedFiles(new Set());
  };

  const toggleFile = (file: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(file)) next.delete(file);
      else next.add(file);
      return next;
    });
  };

  // ── Helpers ──
  const toggleClass = (active: boolean) =>
    'p-1 rounded transition-colors ' +
    (active
      ? 'text-accent bg-accent/10'
      : 'text-text-secondary/60 hover:text-text-primary hover:bg-card-hover');

  const relPath = (abs: string) =>
    projectPath && abs.startsWith(projectPath) ? abs.slice(projectPath.length + 1) : abs;

  // ── Render ──
  return (
    <div className="flex flex-col h-full bg-sidebar-background">
      {/* HeaderBar — đồng bộ với FileExplore */}
      <div className="flex items-center justify-between h-9 px-2 border-b border-divider flex-shrink-0 bg-sidebar-background">
        <span className="text-[13px] text-text-secondary truncate">Search</span>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={handleRefresh}
            className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button
            onClick={handleClear}
            className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors"
            title="Clear search"
          >
            <Eraser className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setViewAsTree((v) => !v)}
            className={toggleClass(viewAsTree)}
            title="View as Tree"
          >
            <ListTree className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button
            onClick={handleCollapseAll}
            className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors"
            title="Collapse All"
          >
            <ChevronsDownUp className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* Primary search row: [chevron] [input w/ toggles] */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsExpanded((v) => !v)}
            className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors shrink-0"
            title={isExpanded ? 'Hide replace' : 'Show replace'}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.5} />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            )}
          </button>

          <div className="flex-1 flex items-center gap-1 px-2 py-1 bg-input-background border border-border rounded-md focus-within:border-accent/50 min-w-0">
            <SearchIcon className="w-3.5 h-3.5 text-text-secondary/40 shrink-0" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 min-w-0 bg-transparent outline-none text-xs text-text-primary placeholder:text-text-secondary/40"
            />
            <button
              onClick={() => setMatchCase((v) => !v)}
              className={toggleClass(matchCase)}
              title="Match Case"
            >
              <CaseSensitive className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setMatchWholeWord((v) => !v)}
              className={toggleClass(matchWholeWord)}
              title="Match Whole Word"
            >
              <WholeWord className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setUseRegex((v) => !v)}
              className={toggleClass(useRegex)}
              title="Use Regular Expression"
            >
              <Regex className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Replace row (visible when expanded) */}
        {isExpanded && (
          <div className="mt-1.5 flex items-center gap-1.5 pl-6">
            <div className="flex-1 flex items-center px-2 py-1 bg-input-background border border-border rounded-md focus-within:border-accent/50 min-w-0">
              <input
                type="text"
                placeholder="Replace"
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                className="flex-1 min-w-0 bg-transparent outline-none text-xs text-text-primary placeholder:text-text-secondary/40"
              />
            </div>
            <button
              onClick={handleReplaceAllClick}
              disabled={!query.trim() || results.length === 0}
              className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Replace All"
            >
              <ReplaceAll className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        )}

        {/* Include pattern (visible when expanded) */}
        {isExpanded && (
          <div className="mt-1.5 pl-6">
            <div className="flex items-center px-2 py-1 bg-input-background border border-border rounded-md focus-within:border-accent/50">
              <input
                type="text"
                placeholder="files to include"
                value={includePattern}
                onChange={(e) => setIncludePattern(e.target.value)}
                className="flex-1 min-w-0 bg-transparent outline-none text-xs text-text-primary placeholder:text-text-secondary/40"
              />
            </div>
          </div>
        )}

        {/* Exclude pattern (visible when expanded) */}
        {isExpanded && (
          <div className="mt-1.5 pl-6">
            <div className="flex items-center px-2 py-1 bg-input-background border border-border rounded-md focus-within:border-accent/50">
              <input
                type="text"
                placeholder="files to exclude"
                value={excludePattern}
                onChange={(e) => setExcludePattern(e.target.value)}
                className="flex-1 min-w-0 bg-transparent outline-none text-xs text-text-primary placeholder:text-text-secondary/40"
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-md flex items-center gap-2 text-xs text-red-500">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-3 flex items-center gap-2 text-xs text-text-secondary/60">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Searching…</span>
          </div>
        )}

        {/* Results summary */}
        {!loading && query.trim() && !error && results.length > 0 && (
          <div className="mt-3 text-[11px] text-text-secondary/60">
            {totalMatches} result{totalMatches !== 1 ? 's' : ''} in {results.length} file
            {results.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Empty state */}
        {!loading && query.trim() && !error && results.length === 0 && (
          <div className="mt-3 text-xs text-text-secondary/40">No results found</div>
        )}

        {/* Result list */}
        {results.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {results.map((r) => {
              const rel = relPath(r.file);
              const fileName = rel.split('/').pop() || rel;
              const isOpen = expandedFiles.has(r.file);
              return (
                <div key={r.file}>
                  <button
                    onClick={() => toggleFile(r.file)}
                    className="w-full flex items-center gap-1.5 px-1 py-1 rounded hover:bg-card-hover text-left transition-colors"
                    title={rel}
                  >
                    {isOpen ? (
                      <ChevronDown className="w-3 h-3 shrink-0 text-text-secondary" />
                    ) : (
                      <ChevronRight className="w-3 h-3 shrink-0 text-text-secondary" />
                    )}
                    <FileText className="w-3 h-3 shrink-0 text-text-secondary/60" strokeWidth={1.5} />
                    <span className="text-xs text-text-primary truncate">{fileName}</span>
                    <span className="text-[10px] text-text-secondary/50 truncate ml-1">{rel}</span>
                    <span className="ml-auto text-[10px] text-text-secondary/70 bg-card-background rounded-full px-1.5 shrink-0 tabular-nums">
                      {r.matches.length}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="ml-4">
                      {r.matches.map((m, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 px-2 py-0.5 rounded hover:bg-card-hover cursor-pointer"
                        >
                          <span className="text-[10px] text-text-secondary/40 tabular-nums shrink-0 w-8 text-right">
                            {m.lineNumber}
                          </span>
                          <span className="text-[11px] text-text-secondary truncate">
                            {m.lineContent.trim()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
          description={`Thay thế "${query}" bằng "${replaceQuery}" trong ${results.length} file (${totalMatches} kết quả).`}
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