import { useMemo } from 'react';
import { useSearch } from '../../context/SearchContext';
import { cn } from '../../../../../../../shared/lib/utils';

interface HighlightedTextProps {
  text: string;
  itemId: string;
  field: string;
  className?: string;
  title?: string;
}

export function HighlightedText({ text, itemId, field, className, title }: HighlightedTextProps) {
  const { searchQuery, matchCase, matchWholeWord, useRegex, matches, currentMatchIndex } = useSearch();

  const highlightedContent = useMemo(() => {
    if (!searchQuery.trim() || matches.length === 0) {
      return text;
    }

    const itemMatches = matches.filter(m => m.id === itemId && m.field === field);
    if (itemMatches.length === 0) return text;

    itemMatches.sort((a, b) => a.start - b.start);

    const fragments: React.ReactNode[] = [];
    let lastEnd = 0;

    itemMatches.forEach((match, idx) => {
      const isCurrentMatch = matches.findIndex(m => m === match) === currentMatchIndex;
      
      if (match.start > lastEnd) {
        fragments.push(text.substring(lastEnd, match.start));
      }
      fragments.push(
        <mark
          key={idx}
          className={cn(
            'bg-[#ffd966] text-[#0f1319] rounded px-0.5 transition-all',
            isCurrentMatch && 'bg-[#f5a623] ring-2 ring-[#f5a623] ring-offset-1 ring-offset-[#0f1319]'
          )}
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
  }, [text, itemId, field, searchQuery, matches, currentMatchIndex]);

  return (
    <span className={className} title={title}>
      {highlightedContent}
    </span>
  );
}