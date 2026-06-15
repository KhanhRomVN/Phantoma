import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from 'use-debounce';

interface UseDebouncedSearchOptions {
  delay?: number;
  matchCase?: boolean;
  matchWholeWord?: boolean;
  useRegex?: boolean;
}

interface UseDebouncedSearchReturn {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  debouncedTerm: string;
  matchCase: boolean;
  setMatchCase: (value: boolean) => void;
  matchWholeWord: boolean;
  setMatchWholeWord: (value: boolean) => void;
  useRegex: boolean;
  setUseRegex: (value: boolean) => void;
  searchRegex: RegExp | null;
}

export function useDebouncedSearch(
  initialTerm = '',
  options: UseDebouncedSearchOptions = {},
): UseDebouncedSearchReturn {
  const { delay = 300, matchCase: initialMatchCase = false, matchWholeWord: initialMatchWholeWord = false, useRegex: initialUseRegex = false } = options;

  const [searchTerm, setSearchTerm] = useState(initialTerm);
  const [matchCase, setMatchCase] = useState(initialMatchCase);
  const [matchWholeWord, setMatchWholeWord] = useState(initialMatchWholeWord);
  const [useRegex, setUseRegex] = useState(initialUseRegex);
  const [debouncedTerm] = useDebounce(searchTerm, delay);

  const [searchRegex, setSearchRegex] = useState<RegExp | null>(null);

  useEffect(() => {
    if (!debouncedTerm) {
      setSearchRegex(null);
      return;
    }

    try {
      let pattern = debouncedTerm;
      const flags = matchCase ? 'g' : 'gi';

      if (!useRegex) {
        pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      if (matchWholeWord) {
        pattern = `\\b${pattern}\\b`;
      }

      setSearchRegex(new RegExp(pattern, flags));
    } catch {
      setSearchRegex(null);
    }
  }, [debouncedTerm, matchCase, matchWholeWord, useRegex]);

  return {
    searchTerm,
    setSearchTerm,
    debouncedTerm,
    matchCase,
    setMatchCase,
    matchWholeWord,
    setMatchWholeWord,
    useRegex,
    setUseRegex,
    searchRegex,
  };
}

export default useDebouncedSearch;