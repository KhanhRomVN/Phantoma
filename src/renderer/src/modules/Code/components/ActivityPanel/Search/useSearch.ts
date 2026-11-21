import { useEffect, useState, startTransition } from 'react';
import { codeApi } from '../../../services/code-api.service';

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

    const searchId = `s${++searchCounter}`;
    let active = true;
    let gotChunk = false;

    setStatus('searching');
    setError(null);
    setTruncated(false);

    const timer = setTimeout(() => {
      codeApi.search
        .stream(
          searchId,
          projectPath,
          trimmed,
          {
            caseSensitive: matchCase,
            wholeWord,
            isRegex,
            includePattern: include.trim() || undefined,
            excludePattern: exclude.trim() || undefined,
          },
          (chunk) => {
            if (!active) return;
            const first = !gotChunk;
            gotChunk = true;
            startTransition(() => {
              if (first) setSession((s) => s + 1);
              setResults((prev) => {
                const byFile = new Map((first ? [] : prev).map((r) => [r.file, r]));
                for (const r of chunk) {
                  const existing = byFile.get(r.file);
                  byFile.set(
                    r.file,
                    existing ? { ...existing, matches: existing.matches.concat(r.matches) } : r,
                  );
                }
                return Array.from(byFile.values());
              });
            });
          },
          (done) => {
            if (!active) return;
            startTransition(() => {
              if (!gotChunk) {
                setSession((s) => s + 1);
                setResults([]);
              }
              setTruncated(done.truncated);
              setError(done.error ?? null);
              setStatus(done.error ? 'error' : 'done');
            });
          },
        )
        .catch((e: any) => {
          if (!active) return;
          setError(e?.message || 'Search failed');
          setStatus('error');
        });
    }, DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timer);
      codeApi.search.cancel(searchId).catch(() => {});
    };
  }, [projectPath, query, matchCase, wholeWord, isRegex, include, exclude, refreshKey]);

  return { results, status, error, truncated, session };
}