// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ── UI ──
import { toastService, type ToastVariant } from '@renderer/components/ui/Toast';

// ── Utils ──
import { parseRefs, formatRelative, type Commit } from '../utils/graph.util';

// ─── Types ───────────────────────────────────────────────────────────────────
interface UseGitUIProps {
  commits: Commit[];
}

interface HoverState {
  x: number;
  y: number;
  title: string;
  lines: string[];
}

interface UseGitUIReturn {
  query: string;
  setQuery: (q: string) => void;
  showNotice: (title: string, variant?: ToastVariant, description?: string) => void;
  hover: HoverState | null;
  handleHover: (e: React.MouseEvent | null, commit?: Commit) => void;
  matchSet: Set<string> | null;
  searchRef: React.RefObject<HTMLInputElement | null>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useGitUI({ commits }: UseGitUIProps): UseGitUIReturn {
  // ── State ──
  const [query, setQuery] = useState('');
  const [hover, setHover] = useState<HoverState | null>(null);

  // ── Refs ──
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Callbacks ──
  const showNotice = useCallback(
    (title: string, variant: ToastVariant = 'info', description?: string) => {
      toastService.show({ variant, title, description });
    },
    [],
  );

  const handleHover = useCallback((e: React.MouseEvent | null, commit?: Commit) => {
    if (!e || !commit) {
      setHover(null);
      return;
    }
    const chips = parseRefs(commit.refs).map((c) => c.label);
    setHover({
      x: e.clientX,
      y: e.clientY,
      title: commit.subject,
      lines: [
        `${commit.author} · ${commit.hash.slice(0, 7)} · ${formatRelative(commit.date)}`,
        ...(chips.length ? [`Refs: ${chips.join(', ')}`] : []),
        ...(commit.parents.length > 1
          ? [`Merge of ${commit.parents.map((p) => p.slice(0, 7)).join(' + ')}`]
          : []),
      ],
    });
  }, []);

  // ── Derived ──
  const matchSet = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const set = new Set<string>();
    commits.forEach((c) => {
      if (
        c.subject.toLowerCase().includes(q) ||
        c.author.toLowerCase().includes(q) ||
        c.hash.startsWith(q) ||
        c.refs.some((r) => r.toLowerCase().includes(q))
      ) {
        set.add(c.hash);
      }
    });
    return set;
  }, [commits, query]);

  // ── Effects ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return {
    query,
    setQuery,
    showNotice,
    hover,
    handleHover,
    matchSet,
    searchRef,
  };
}