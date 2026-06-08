import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { cn } from '../../../../../../../shared/lib/utils';
import type { ReconData } from '../types/recon-data';

interface MatchResult {
  lineIndex: number;
  start: number;
  end: number;
  text: string;
}

interface LogProps {
  data: ReconData;
  searchQuery: string;
  matchCase: boolean;
  matchWholeWord: boolean;
  useRegex: boolean;
  currentMatchIndex: number;
  onMatchesFound: (matches: MatchResult[], total: number) => void;
  onNavigate: (index: number) => void;
}

export const Log = forwardRef<HTMLDivElement, LogProps>(({ 
  data, 
  searchQuery, 
  matchCase, 
  matchWholeWord, 
  useRegex,
  currentMatchIndex,
  onMatchesFound,
  onNavigate
}, ref) => {
  const [lines, setLines] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Forward ref to parent
  useImperativeHandle(ref, () => containerRef.current!);

  // Generate log lines based on data
  const LOG_LINES = [
    `[+] Resolving DNS: ${data.target} → ${data.targetIp}`,
    `[+] WHOIS lookup complete. Registrar: ${data.whoisData?.registrar ?? 'Unknown'}`,
    `[+] Subdomain brute-force: ${data.subdomains?.length ?? 0} found`,
    `[+] Reverse IP lookup: ${data.infrastructure?.reverseIp?.length ?? 0} domains hosted`,
    `[+] Email harvest: ${data.harvestedEmails?.length ?? 0} addresses found`,
    `[+] SSL/TLS certs: ${data.certTransparency?.length ?? 0} entries in CT logs`,
    `[+] Hosting: ${data.infrastructure?.hostingProvider || data.infrastructure?.cloudProvider || 'Unknown provider'}`,
    `[*] Scan complete. ${data.subdomains?.length ?? 0} subdomains, ${data.breaches?.length ?? 0} breaches found`,
  ];

  // Animation effect
  useEffect(() => {
    if (cursor >= LOG_LINES.length) return;
    const t = setTimeout(
      () => {
        setLines((prev) => [...prev, LOG_LINES[cursor]]);
        setCursor((c) => c + 1);
      },
      120 + Math.random() * 100,
    );
    return () => clearTimeout(t);
  }, [cursor]);

  // Auto-scroll
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  // Search function
  const performSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setMatches([]);
      onMatchesFound([], 0);
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
      onMatchesFound([], 0);
      return;
    }

    lines.forEach((line, lineIndex) => {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        let matchText = match[0];
        let start = match.index;
        let end = start + matchText.length;

        // Match whole word check
        if (matchWholeWord) {
          const before = line[start - 1] || '';
          const after = line[end] || '';
          const isWordBoundary = (c: string) => /[\s\W]/.test(c) || c === '';
          if (!isWordBoundary(before) || !isWordBoundary(after)) {
            continue;
          }
        }

        results.push({
          lineIndex,
          start,
          end,
          text: matchText,
        });

        // Reset lastIndex for next iteration when using regex with global flag
        if (pattern.lastIndex === match.index + matchText.length) {
          pattern.lastIndex++;
        }
      }
    });

    setMatches(results);
    onMatchesFound(results, results.length);
  }, [searchQuery, lines, matchCase, matchWholeWord, useRegex, onMatchesFound]);

  // Trigger search when dependencies change
  useEffect(() => {
    performSearch();
  }, [performSearch]);

  // Scroll to current match
  useEffect(() => {
    if (matches.length === 0 || currentMatchIndex < 0 || currentMatchIndex >= matches.length) return;
    
    const match = matches[currentMatchIndex];
    const lineElement = lineRefs.current[match.lineIndex];
    if (lineElement && containerRef.current) {
      const lineTop = lineElement.offsetTop;
      const containerTop = containerRef.current.scrollTop;
      const containerHeight = containerRef.current.clientHeight;
      const lineHeight = lineElement.clientHeight;

      if (lineTop < containerTop || lineTop + lineHeight > containerTop + containerHeight) {
        containerRef.current.scrollTop = lineTop - containerHeight / 2 + lineHeight / 2;
      }
    }
  }, [currentMatchIndex, matches]);

  // Highlight text in a line
  const highlightLine = (line: string, lineIndex: number): React.ReactNode => {
    if (!searchQuery.trim() || matches.length === 0) {
      return line;
    }

    const lineMatches = matches.filter(m => m.lineIndex === lineIndex);
    if (lineMatches.length === 0) return line;

    // Sort matches by start position
    lineMatches.sort((a, b) => a.start - b.start);

    const fragments: React.ReactNode[] = [];
    let lastEnd = 0;

    lineMatches.forEach((match, idx) => {
      // Add text before match
      if (match.start > lastEnd) {
        fragments.push(line.substring(lastEnd, match.start));
      }
      // Add highlighted match
      const isCurrentMatch = currentMatchIndex === matches.findIndex(m => m === match);
      fragments.push(
        <mark
          key={idx}
          className={cn(
            'bg-[#ffd966] text-[#0f1319] rounded px-0.5',
            isCurrentMatch && 'bg-[#f5a623] ring-2 ring-[#f5a623] ring-offset-1 ring-offset-[#0f1319]'
          )}
        >
          {line.substring(match.start, match.end)}
        </mark>
      );
      lastEnd = match.end;
    });

    // Add remaining text
    if (lastEnd < line.length) {
      fragments.push(line.substring(lastEnd));
    }

    return fragments;
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-3 font-mono text-[12px] leading-relaxed"
    >
      <div className="text-[#c8d6f0] mb-2">
        ghost-recon v2.0.0 — target: {data.target} — {data.scanTime}
      </div>
      {lines.map((line, i) => (
        <div
          key={i}
          ref={(el) => (lineRefs.current[i] = el)}
          className={cn(
            'mb-0.5',
            line.startsWith('[!]')
              ? 'text-[#ff2d55]'
              : line.startsWith('[*]')
                ? 'text-[#f5a623]'
                : 'text-[#30d158]',
          )}
        >
          {highlightLine(line, i)}
        </div>
      ))}
      {cursor < LOG_LINES.length && <span className="text-[#30d158] animate-pulse">█</span>}
    </div>
  );
});

Log.displayName = 'Log';