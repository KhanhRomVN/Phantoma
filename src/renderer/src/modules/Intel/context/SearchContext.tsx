import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface MatchResult {
  id: string;
  field: string;
  start: number;
  end: number;
  text: string;
}

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  matchCase: boolean;
  setMatchCase: (enabled: boolean) => void;
  matchWholeWord: boolean;
  setMatchWholeWord: (enabled: boolean) => void;
  useRegex: boolean;
  setUseRegex: (enabled: boolean) => void;
  currentMatchIndex: number;
  setCurrentMatchIndex: (index: number) => void;
  totalMatches: number;
  setTotalMatches: (total: number) => void;
  matches: MatchResult[];
  setMatches: (matches: MatchResult[]) => void;
  registerComponent: (
    componentId: string,
    onMatchesFound: (matches: MatchResult[], total: number) => void,
  ) => void;
  unregisterComponent: (componentId: string) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [components, setComponents] = useState<
    Map<string, (matches: MatchResult[], total: number) => void>
  >(new Map());

  const registerComponent = useCallback(
    (componentId: string, onMatchesFound: (matches: MatchResult[], total: number) => void) => {
      setComponents((prev) => {
        const newMap = new Map(prev);
        newMap.set(componentId, onMatchesFound);
        return newMap;
      });
    },
    [],
  );

  const unregisterComponent = useCallback((componentId: string) => {
    setComponents((prev) => {
      const newMap = new Map(prev);
      newMap.delete(componentId);
      return newMap;
    });
  }, []);

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        matchCase,
        setMatchCase,
        matchWholeWord,
        setMatchWholeWord,
        useRegex,
        setUseRegex,
        currentMatchIndex,
        setCurrentMatchIndex,
        totalMatches,
        setTotalMatches,
        matches,
        setMatches,
        registerComponent,
        unregisterComponent,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}
