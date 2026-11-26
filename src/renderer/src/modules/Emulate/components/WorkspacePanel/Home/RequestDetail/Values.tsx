import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

/**
 * ------------------------------------------------------------------
 * Values Details
 * ------------------------------------------------------------------
 * Liệt kê các value của request đang chọn (header, cookie, query)
 * và với mỗi value hiển thị danh sách request HTTPS có cùng value.
 *
 * Các chức năng chính:
 * - Gom nhóm theo value, sắp xếp theo số request trùng
 * - Mở/đóng từng value để xem danh sách request
 * - Click vào request để chọn request đó
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Stores ──
import { useNetworkStore } from '../../../../stores/networkStore';

// ── Types ──
import { NetworkRequest } from '../FilterPanel';

// ── Utils ──
import { cn } from '@renderer/utils/cn';

// ─── Types ──────────────────────────────────────────────────────────────
interface ValuesDetailsProps {
  request: NetworkRequest;
  searchTerm: string;
  onSelectRequest?: (id: string) => void;
}

interface ValueEntry {
  value: string;
  location: string;
}

interface ValueMatch {
  request: NetworkRequest;
  location: string;
}

interface ValueGroup {
  value: string;
  matches: ValueMatch[];
}

// ASSUMED: bỏ qua value ngắn hơn 6 ký tự để tránh nhiễu (vd: "gzip", "en", "1")
const MIN_VALUE_LENGTH = 6;

// ─── Helpers ────────────────────────────────────────────────────────────
function parseCookiePairs(header: string, firstOnly: boolean): Array<[string, string]> {
  const segments = header.split(';');
  const pairs: Array<[string, string]> = [];
  for (const segment of firstOnly ? segments.slice(0, 1) : segments) {
    const index = segment.indexOf('=');
    if (index <= 0) continue;
    pairs.push([segment.slice(0, index).trim(), segment.slice(index + 1).trim()]);
  }
  return pairs;
}

function collectValues(r: NetworkRequest): ValueEntry[] {
  const entries: ValueEntry[] = [];
  const seen = new Set<string>();
  const push = (value: unknown, location: string) => {
    const text = typeof value === 'string' ? value.trim() : '';
    if (text.length < MIN_VALUE_LENGTH) return;
    const key = `${text}|${location}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({ value: text, location });
  };

  for (const [name, value] of Object.entries(r.requestHeaders || {})) {
    if (name.toLowerCase() === 'cookie') {
      parseCookiePairs(String(value), false).forEach(([k, v]) => push(v, `request cookie: ${k}`));
    } else {
      push(String(value), `request header: ${name}`);
    }
  }

  for (const [name, value] of Object.entries(r.responseHeaders || {})) {
    if (name.toLowerCase() === 'set-cookie') {
      String(value)
        .split('\n')
        .forEach((line) =>
          parseCookiePairs(line, true).forEach(([k, v]) => push(v, `response cookie: ${k}`)),
        );
    } else {
      push(String(value), `response header: ${name}`);
    }
  }

  for (const [name, value] of Object.entries(r.requestCookies || {})) {
    push(value, `request cookie: ${name}`);
  }
  for (const [name, value] of Object.entries(r.responseCookies || {})) {
    push(value, `response cookie: ${name}`);
  }

  try {
    new URL(r.url).searchParams.forEach((v, k) => push(v, `query: ${k}`));
  } catch {
    // URL không hợp lệ thì bỏ qua query
  }

  return entries;
}

// ─── Component ──────────────────────────────────────────────────────────
export function ValuesDetails({ request, searchTerm, onSelectRequest }: ValuesDetailsProps) {
  const requests = useNetworkStore((s) => s.requests);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const groups = useMemo<ValueGroup[]>(() => {
    const own = new Set(collectValues(request).map((e) => e.value));
    const map = new Map<string, ValueMatch[]>();

    for (const r of requests) {
      if (r.protocol !== 'https') continue;
      for (const { value, location } of collectValues(r)) {
        if (!own.has(value)) continue;
        const list = map.get(value);
        if (list) list.push({ request: r, location });
        else map.set(value, [{ request: r, location }]);
      }
    }

    return Array.from(map, ([value, matches]) => ({ value, matches }))
      .filter((g) => g.matches.some((m) => m.request.id !== request.id))
      .sort((a, b) => b.matches.length - a.matches.length);
  }, [request, requests]);

  const visibleGroups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return term ? groups.filter((g) => g.value.toLowerCase().includes(term)) : groups;
  }, [groups, searchTerm]);

  const toggle = (value: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });

  if (visibleGroups.length === 0) {
    return <div className="text-text-secondary italic text-xs">No shared values found</div>;
  }

  return (
    <div className="space-y-1.5">
      {visibleGroups.map((group) => {
        const isOpen = expanded.has(group.value);
        const Chevron = isOpen ? ChevronDown : ChevronRight;

        return (
          <div key={group.value} className="border border-border/40 rounded-md overflow-hidden">
            <button
              onClick={() => toggle(group.value)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-secondary/30 transition-colors"
            >
              <Chevron className="w-3 h-3 flex-shrink-0 text-text-secondary" />
              <span
                className="flex-1 min-w-0 font-mono text-xs text-text-primary/90 truncate"
                title={group.value}
              >
                {group.value}
              </span>
              <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-bold">
                {group.matches.length}
              </span>
            </button>

            {isOpen && (
              <div className="border-t border-border/40">
                {group.matches.map((m, i) => (
                  <button
                    key={`${m.request.id}-${m.location}-${i}`}
                    onClick={() => onSelectRequest?.(m.request.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1 text-left text-[11px] border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors',
                      m.request.id === request.id && 'bg-primary/5',
                    )}
                  >
                    <span className="font-bold text-text-secondary w-12 flex-shrink-0">
                      {m.request.method}
                    </span>
                    <span className="text-text-secondary w-8 flex-shrink-0">{m.request.status}</span>
                    <span
                      className="flex-1 min-w-0 truncate text-text-primary/80"
                      title={m.request.url}
                    >
                      {m.request.host}
                      {m.request.path}
                    </span>
                    <span className="text-text-secondary/70 truncate max-w-[40%]">{m.location}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ValuesDetails;