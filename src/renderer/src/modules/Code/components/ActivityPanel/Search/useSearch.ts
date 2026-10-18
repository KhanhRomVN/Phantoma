import { useEffect, useState, startTransition } from 'react';

export interface SearchMatch {
  lineNumber: number;
  lineContent: string;
  column: number;
}

export interface FileResult {
  file: string;
  matches: SearchMatch[];
}

export interface SearchOptions {
  matchCase: boolean;
  wholeWord: boolean;
  isRegex: boolean;
  include: string;
  exclude: string;
}

export type SearchStatus = 'idle' | 'searching' | 'done' | 'error';

interface ChunkPayload {
  searchId: string;
  results: FileResult[];
}

interface DonePayload {
  searchId: string;
  totalMatches: number;
  totalFiles: number;
  truncated: boolean;
  error?: string;
}

const DEBOUNCE_MS = 120;
let searchCounter = 0;

export function useSearch(
  projectPath: string | undefined,
  query: string,
  options: SearchOptions,
  refreshKey: number,
) {
  const [results, setResults] = useState<FileResult[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [session, setSession] = useState(0);

  const { matchCase, wholeWord, isRegex, include, exclude } = options;

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || !projectPath) {
      setResults([]);
      setStatus('idle');
      setError(null);
      setTruncated(false);
      return;
    }

    const api = (window as any).api;
    const searchId = `s${++searchCounter}`;
    let active = true;
    let gotChunk = false;

    setStatus('searching');
    setError(null);
    setTruncated(false);

    const offChunk = api.on('fs:search-chunk', (_e: unknown, p: ChunkPayload) => {
      if (!active || p.searchId !== searchId) return;
      const first = !gotChunk;
      gotChunk = true;
      startTransition(() => {
        if (first) setSession((s) => s + 1);
        setResults((prev) => (first ? p.results : prev.concat(p.results)));
      });
    });

    const offDone = api.on('fs:search-done', (_e: unknown, p: DonePayload) => {
      if (!active || p.searchId !== searchId) return;
      startTransition(() => {
        if (!gotChunk) {
          setSession((s) => s + 1);
          setResults([]);
        }
        setTruncated(p.truncated);
        setError(p.error ?? null);
        setStatus(p.error ? 'error' : 'done');
      });
    });

    const timer = setTimeout(() => {
      api
        .invoke('fs:search-start', searchId, projectPath, trimmed, {
          caseSensitive: matchCase,
          wholeWord,
          isRegex,
          includePattern: include.trim() || undefined,
          excludePattern: exclude.trim() || undefined,
        })
        .catch((e: any) => {
          if (!active) return;
          setError(e?.message || 'Search failed');
          setStatus('error');
        });
    }, DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timer);
      offChunk?.();
      offDone?.();
      api.invoke('fs:search-cancel', searchId);
    };
  }, [projectPath, query, matchCase, wholeWord, isRegex, include, exclude, refreshKey]);

  return { results, status, error, truncated, session };
}