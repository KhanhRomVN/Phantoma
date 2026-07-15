import React, { useState, useEffect, useRef, useCallback } from 'react';
import { $ } from '@renderer/utils/color';

export interface SearchBarProps {
  searchQuery: string;
  onSearchQueryChange?: (q: string) => void;
  onCloseSearch?: () => void;
  bodyRef: React.RefObject<HTMLDivElement>;
}

type SearchFlag = 'matchCase' | 'wholeWord' | 'regex';

const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery: initialQuery,
  onSearchQueryChange,
  onCloseSearch,
  bodyRef,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localQuery, setLocalQuery] = useState(initialQuery || '');
  const [flags, setFlags] = useState<Set<SearchFlag>>(new Set<SearchFlag>(['regex']));
  const [matchCount, setMatchCount] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleQueryChange = (q: string) => {
    setLocalQuery(q);
    onSearchQueryChange?.(q);
  };

  const toggleFlag = (f: SearchFlag) => {
    setFlags((prev) => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
  };

  const buildRegex = useCallback(
    (q: string): RegExp | null => {
      if (!q) return null;
      try {
        const isRegex = flags.has('regex');
        const pattern = isRegex
          ? q
          : flags.has('wholeWord')
            ? `\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`
            : q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regexFlags = flags.has('matchCase') ? 'g' : 'gi';
        return new RegExp(pattern, regexFlags);
      } catch {
        return null;
      }
    },
    [flags],
  );

  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;
    const prev = root.querySelectorAll('mark.zen-search-hl');
    prev.forEach((el) => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ''), el);
        parent.normalize();
      }
    });
    const regex = buildRegex(localQuery);
    if (!regex) {
      setMatchCount(0);
      setCurrentIdx(0);
      return;
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        const tag = p.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'script' || tag === 'style')
          return NodeFilter.FILTER_REJECT;
        if (p.closest('mark.zen-search-hl')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes: Text[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) nodes.push(n as Text);
    let total = 0;
    nodes.forEach((textNode) => {
      const text = textNode.textContent || '';
      regex.lastIndex = 0;
      if (!regex.test(text)) return;
      regex.lastIndex = 0;
      const parent = textNode.parentNode;
      if (!parent) return;
      const frag = document.createDocumentFragment();
      let last = 0;
      let m: RegExpExecArray | null;
      regex.lastIndex = 0;
      while ((m = regex.exec(text)) !== null) {
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const mark = document.createElement('mark');
        mark.className = 'zen-search-hl';
        mark.dataset.matchIdx = String(total++);
        mark.textContent = m[0];
        mark.style.cssText =
          'background:' +
          ($('--vscode-editor-findMatchHighlightBackground') || 'rgba(255,255,0,0.35)') +
          ';color:inherit;border-radius:2px;padding:0 1px;';
        frag.appendChild(mark);
        last = m.index + m[0].length;
        if (m[0].length === 0) regex.lastIndex++;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      parent.replaceChild(frag, textNode);
    });
    setMatchCount(total);
    setCurrentIdx(total > 0 ? 1 : 0);
  }, [localQuery, flags, buildRegex, bodyRef]);

  const navigate = (dir: 1 | -1) => {
    if (matchCount === 0) return;
    const root = bodyRef.current;
    if (!root) return;
    const marks = root.querySelectorAll('mark.zen-search-hl');
    marks.forEach((m) => {
      (m as HTMLElement).style.background =
        $('--vscode-editor-findMatchHighlightBackground') || 'rgba(255,255,0,0.35)';
      (m as HTMLElement).style.outline = '';
    });
    const next = ((currentIdx - 1 + dir + matchCount) % matchCount) + 1;
    setCurrentIdx(next);
    const target = marks[next - 1] as HTMLElement | undefined;
    if (target) {
      target.style.background = $('--vscode-editor-findMatchBackground') || 'rgba(255,165,0,0.6)';
      target.style.outline = '1px solid ' + ($('--vscode-editor-findMatchBorder') || 'orange');
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  };

  const iconBtn = (
    active: boolean,
    title: string,
    onClick: () => void,
    children: React.ReactNode,
  ) => (
    <button
      title={title}
      onClick={onClick}
      className="cursor-pointer px-1 py-0.5 rounded-sm flex items-center justify-center transition-all duration-150 shrink-0"
      style={{
        background: active
          ? `color-mix(in srgb, ${$('--vscode-button-background')} 20%, transparent)`
          : 'transparent',
        border: active
          ? `1px solid color-mix(in srgb, ${$('--vscode-button-background')} 45%, transparent)`
          : '1px solid transparent',
        color: active ? $('--vscode-button-background') : $('--vscode-icon-foreground'),
        opacity: active ? 1 : 0.6,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.opacity = '1';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.opacity = '0.6';
      }}
    >
      {children}
    </button>
  );

  const inputBorderStyle = '1px solid ' + ($('--vscode-input-border') || $('--border-color'));
  const inputBg = $('--vscode-input-background') || $('--primary-bg');
  return (
    <div
      className="sticky top-0 z-[100] self-end inline-flex items-center gap-1 shadow-[0_2px_10px_rgba(0,0,0,0.32)] mb-1.5 rounded-md p-[3px_4px]"
      style={{
        backgroundColor:
          $('--vscode-editorWidget-background') ||
          $('--vscode-input-background') ||
          $('--primary-bg'),
        border:
          '1px solid ' +
          ($('--vscode-editorWidget-border') || $('--vscode-input-border') || $('--border-color')),
      }}
    >
      <div
        className="flex items-stretch overflow-hidden rounded-sm"
        style={{ backgroundColor: inputBg }}
      >
        <input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onCloseSearch?.();
            } else if (e.key === 'Enter') {
              navigate(e.shiftKey ? -1 : 1);
            }
          }}
          style={{
            background: inputBg,
            color: $('--vscode-input-foreground'),
          }}
          className="border-none outline-none text-xs px-1.5 py-1 w-[180px] bg-transparent"
        />
        <div
          className="flex items-center gap-px px-1 py-0.5"
          style={{
            borderLeft: inputBorderStyle,
            backgroundColor: inputBg,
          }}
        >
          {iconBtn(
            flags.has('matchCase'),
            'Match Case (Alt+C)',
            () => toggleFlag('matchCase'),
            <span className="text-[11px] font-bold font-mono leading-none">Aa</span>,
          )}
          {iconBtn(
            flags.has('wholeWord'),
            'Match Whole Word (Alt+W)',
            () => toggleFlag('wholeWord'),
            <span className="text-[10px] font-bold font-mono tracking-[-0.5px] leading-none">ab</span>,
          )}
          {iconBtn(
            flags.has('regex'),
            'Use Regular Expression (Alt+R)',
            () => toggleFlag('regex'),
            <span className="text-[10px] font-bold font-mono leading-none">.*</span>,
          )}
        </div>
      </div>

      <span
        className="text-[11px] whitespace-nowrap min-w-[72px] text-center select-none"
        style={{ color: $('--vscode-descriptionForeground') }}
      >
        {localQuery
          ? matchCount === 0
            ? 'No results'
            : `${currentIdx} of ${matchCount}`
          : '\u00A0'}
      </span>

      <button
        title="Previous match (Shift+Enter)"
        onClick={() => navigate(-1)}
        disabled={matchCount === 0}
        className="bg-transparent border-none px-[3px] py-0.5 flex items-center"
        style={{
          cursor: matchCount > 0 ? 'pointer' : 'default',
          color: $('--vscode-icon-foreground'),
          opacity: matchCount > 0 ? 0.7 : 0.3,
        }}
        onMouseEnter={(e) => {
          if (matchCount > 0) e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          if (matchCount > 0) e.currentTarget.style.opacity = '0.7';
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m18 15-6-6-6 6" />
        </svg>
      </button>

      <button
        title="Next match (Enter)"
        onClick={() => navigate(1)}
        disabled={matchCount === 0}
        className="bg-transparent border-none px-[3px] py-0.5 flex items-center"
        style={{
          cursor: matchCount > 0 ? 'pointer' : 'default',
          color: $('--vscode-icon-foreground'),
          opacity: matchCount > 0 ? 0.7 : 0.3,
        }}
        onMouseEnter={(e) => {
          if (matchCount > 0) e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          if (matchCount > 0) e.currentTarget.style.opacity = '0.7';
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <button
        title="Close (Esc)"
        onClick={() => {
          handleQueryChange('');
          onCloseSearch?.();
        }}
        className="bg-transparent border-none px-[3px] py-0.5 flex items-center transition-opacity duration-150"
        style={{
          cursor: 'pointer',
          color: $('--vscode-icon-foreground'),
          opacity: 0.55,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.55';
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  );
};

export default SearchBar;