import { useMemo } from 'react';
import { cn } from '../../../../shared/lib/utils';

interface HighlightTextProps {
  text: string;
  searchTerm: string;
  className?: string;
  highlightClassName?: string;
  caseSensitive?: boolean;
}

export function HighlightText({
  text,
  searchTerm,
  className,
  highlightClassName,
  caseSensitive = false,
}: HighlightTextProps) {
  // [DEBUG] HighlightText render
  const parts = useMemo(() => {
    if (!searchTerm || !text) return [{ text, highlight: false }];

    try {
      let regex: RegExp;
      try {
        const flags = caseSensitive ? 'g' : 'gi';
        regex = new RegExp(`(${searchTerm})`, flags);
      } catch {
        const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const flags = caseSensitive ? 'g' : 'gi';
        regex = new RegExp(`(${escaped})`, flags);
      }

      return text.split(regex).map((part) => {
        const isMatch = regex.test(part);
        return { text: part, highlight: isMatch };
      });
    } catch {
      return [{ text, highlight: false }];
    }
  }, [text, searchTerm, caseSensitive]);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.highlight ? (
          <mark
            key={i}
            className={cn(
              'bg-warning/30 text-text-primary rounded-sm px-0.5 mx-[-2px]',
              highlightClassName,
            )}
          >
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </span>
  );
}

export default HighlightText;
