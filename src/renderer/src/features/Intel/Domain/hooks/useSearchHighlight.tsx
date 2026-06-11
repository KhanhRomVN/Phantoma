import { useState, useEffect, useCallback } from 'react';

export interface MatchResult {
  id: string;
  field: string;
  start: number;
  end: number;
  text: string;
}

interface UseSearchHighlightProps {
  searchQuery: string;
  matchCase: boolean;
  matchWholeWord: boolean;
  useRegex: boolean;
  dataItems: Array<{ id: string; [key: string]: any }>;
  searchableFields: string[];
  onMatchesFound?: (matches: MatchResult[], total: number) => void;
}

export function useSearchHighlight({
  searchQuery,
  matchCase,
  matchWholeWord,
  useRegex,
  dataItems,
  searchableFields,
  onMatchesFound
}: UseSearchHighlightProps) {
  const [matches, setMatches] = useState<MatchResult[]>([]);

  const performSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setMatches([]);
      onMatchesFound?.([], 0);
      return;
    }

    const results: MatchResult[] = [];
    let pattern: RegExp;

    try {
      if (useRegex) {
        const flags = matchCase ? 'g' : 'gi';
        pattern = new RegExp(searchQuery, flags);
      } else {
        const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const flags = matchCase ? 'g' : 'gi';
        pattern = new RegExp(escaped, flags);
      }
    } catch (err) {
      console.error('Invalid regex:', err);
      setMatches([]);
      onMatchesFound?.([], 0);
      return;
    }

    dataItems.forEach((item) => {
      searchableFields.forEach((field) => {
        const value = item[field];
        if (!value || typeof value !== 'string') return;
        
        let match;
        while ((match = pattern.exec(value)) !== null) {
          let matchText = match[0];
          let start = match.index;
          let end = start + matchText.length;

          // Match whole word check
          if (matchWholeWord) {
            const before = value[start - 1] || '';
            const after = value[end] || '';
            const isWordBoundary = (c: string) => /[\s\W]/.test(c) || c === '';
            if (!isWordBoundary(before) || !isWordBoundary(after)) {
              continue;
            }
          }

          results.push({
            id: item.id,
            field,
            start,
            end,
            text: matchText,
          });

          if (pattern.lastIndex === match.index + matchText.length) {
            pattern.lastIndex++;
          }
        }
      });
    });

    setMatches(results);
    onMatchesFound?.(results, results.length);
  }, [searchQuery, matchCase, matchWholeWord, useRegex, dataItems, searchableFields, onMatchesFound]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  const highlightText = useCallback((text: string, itemId: string, field: string): React.ReactNode => {
    if (!searchQuery.trim() || matches.length === 0) {
      return text;
    }

    const itemMatches = matches.filter(m => m.id === itemId && m.field === field);
    if (itemMatches.length === 0) return text;

    itemMatches.sort((a, b) => a.start - b.start);

    const fragments: React.ReactNode[] = [];
    let lastEnd = 0;

    itemMatches.forEach((match, idx) => {
      if (match.start > lastEnd) {
        fragments.push(text.substring(lastEnd, match.start));
      }
      fragments.push(
        <mark
          key={idx}
          className="bg-[#ffd966] text-[#0f1319] rounded px-0.5"
        >
          {text.substring(match.start, match.end)}
        </mark>
      );
      lastEnd = match.end;
    });

    if (lastEnd < text.length) {
      fragments.push(text.substring(lastEnd));
    }

    return fragments;
  }, [searchQuery, matches]);

  const hasMatches = matches.length > 0;
  const totalMatches = matches.length;

  return {
    matches,
    totalMatches,
    hasMatches,
    highlightText,
  };
}