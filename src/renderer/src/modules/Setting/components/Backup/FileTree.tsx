import React, { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, EyeOff, Minus, Plus, RotateCcw, Search, X } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { getFileIconPath, getFolderIconPath } from '@renderer/utils/file-icon';
import { Badge } from '../shared';
import FilePreview, { formatBytes } from './FilePreview';

interface Entry {
  name: string;
  rel: string;
  type: 'file' | 'folder';
  size?: number;
  ignored: boolean;
  explicit: boolean;
}

interface Row {
  entry: Entry;
  depth: number;
  label: string;
  dir?: string;
}

type CheckState = 'checked' | 'indeterminate' | 'unchecked';
type View = 'tree' | 'ignored';

const invoke = <T,>(channel: string, ...args: unknown[]): Promise<T> =>
  window.api.invoke(channel, ...args);

const fetchDir = async (rel: string): Promise<Entry[]> => {
  try {
    const res = await invoke<Entry[]>('backup:list-dir', rel);
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
};

const highlight = (text: string, re: RegExp | null): React.ReactNode => {
  if (!re) return text;
  const g = new RegExp(re.source, `${re.flags}g`);
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = g.exec(text)) !== null) {
    if (m[0].length === 0) {
      g.lastIndex++;
      continue;
    }
    parts.push(text.slice(last, m.index));
    parts.push(
      <span key={m.index} className="rounded-sm bg-warn/20 text-warn">
        {m[0]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
};

const NodeIcon = memo(function NodeIcon({
  name,
  isFolder,
  open = false,
}: {
  name: string;
  isFolder: boolean;
  open?: boolean;
}) {
  return (
    <img
      src={isFolder ? getFolderIconPath(name, open) : getFileIconPath(name)}
      alt=""
      draggable={false}
      className="h-4 w-4 shrink-0"
    />
  );
});

const IgnoreCheckbox = memo(function IgnoreCheckbox({
  state,
  disabled,
  title,
  onClick,
}: {
  state: CheckState;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}) {
  const active = state !== 'unchecked';
  return (
    <button
      type="button"
      role="checkbox"
      title={title}
      aria-checked={state === 'indeterminate' ? 'mixed' : state === 'checked'}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border outline-none transition-all duration-100',
        active
          ? 'border-warn bg-warn text-white'
          : 'border-text-secondary/40 bg-transparent hover:border-warn',
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer active:scale-90',
      )}
    >
      {state === 'checked' && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
      {state === 'indeterminate' && <Minus className="h-2.5 w-2.5" strokeWidth={3} />}
    </button>
  );
});

const FileTree: React.FC<{ root: string; version: number; onChange: () => void }> = ({
  root,
  version,
  onChange,
}) => {
  const view: View = 'tree';
  const [selected, setSelected] = useState<string | null>(null);
  const [ignoredPaths, setIgnoredPaths] = useState<string[]>([]);
  const [cache, setCache] = useState<Record<string, Entry[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);

  const requested = useRef(new Set<string>()).current;
  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  const loadDir = useCallback(
    async (rel: string) => {
      if (requested.has(rel)) return;
      requested.add(rel);
      const list = await fetchDir(rel);
      setCache((prev) => ({ ...prev, [rel]: list }));
    },
    [requested],
  );

  useEffect(() => {
    let off = false;
    requested.add('');
    const keys = ['', ...Object.keys(cacheRef.current).filter(Boolean)];
    void Promise.all(keys.map(fetchDir)).then((lists) => {
      if (!off) setCache(Object.fromEntries(keys.map((k, i) => [k, lists[i]])));
    });
    const fromGit = invoke<string[]>('backup:ignored-paths')
      .then((r) => (Array.isArray(r) ? r : []))
      .catch(() => [] as string[]);
    const fromFile = invoke<string>('fs:read-file', `${root}/.gitignore`)
      .then((raw) =>
        String(raw)
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.startsWith('/') && !/[*?[\]!]/.test(l))
          .map((l) => l.replace(/^\/+|\/+$/g, '')),
      )
      .catch(() => [] as string[]);
    void Promise.all([fromGit, fromFile]).then(([a, b]) => {
      if (!off) setIgnoredPaths([...new Set([...a, ...b])].sort((x, y) => x.localeCompare(y)));
    });
    return () => {
      off = true;
    };
  }, [root, version, requested]);

  const toggleExpand = useCallback(
    (rel: string) => {
      void loadDir(rel);
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(rel)) next.delete(rel);
        else next.add(rel);
        return next;
      });
    },
    [loadDir],
  );

  const setIgnore = useCallback(
    async (rel: string, ignored: boolean) => {
      await invoke('backup:set-ignore', rel, ignored);
      onChange();
    },
    [onChange],
  );

  const deferredQuery = useDeferredValue(query);
  const q = deferredQuery.trim();
  const matcher = useMemo(() => {
    if (!q) return null;
    try {
      const body = useRegex ? q : q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(wholeWord ? `\\b(?:${body})\\b` : body, matchCase ? '' : 'i');
    } catch {
      return null;
    }
  }, [q, matchCase, wholeWord, useRegex]);

  useEffect(() => {
    if (!q) return;
    for (const list of Object.values(cache)) {
      for (const e of list) if (e.type === 'folder' && !e.ignored) void loadDir(e.rel);
    }
  }, [q, cache, loadDir]);

  const rows = useMemo<Row[]>(() => {
    if (q) {
      if (!matcher) return [];
      const scoreOf = (name: string): number => {
        const m = matcher.exec(name);
        if (!m || m[0].length === 0) return 0;
        const ratio = m[0].length / name.length;
        if (m.index === 0 && m[0].length === name.length) return 1000;
        if (m.index === 0) return 800 + ratio * 100;
        return (/[^a-zA-Z0-9]/.test(name[m.index - 1]) ? 600 : 400) + ratio * 100;
      };
      const scored: { row: Row; score: number }[] = [];
      for (const [dir, list] of Object.entries(cache)) {
        for (const e of list) {
          const score = scoreOf(e.name);
          if (score > 0) scored.push({ row: { entry: e, depth: 0, label: e.name, dir }, score });
        }
      }
      return scored
        .sort((a, b) => b.score - a.score || a.row.entry.rel.localeCompare(b.row.entry.rel))
        .slice(0, 300)
        .map((s) => s.row);
    }
    const out: Row[] = [];
    const walk = (dir: string, depth: number) => {
      for (const e of cache[dir] ?? []) {
        out.push({ entry: e, depth, label: e.name });
        if (e.type === 'folder' && expanded.has(e.rel)) walk(e.rel, depth + 1);
      }
    };
    walk('', 0);
    return out;
  }, [cache, expanded, q, matcher]);

  const suggestions = useMemo(
    () => (cache[''] ?? []).filter((e) => e.type === 'folder' && !e.ignored),
    [cache],
  );

  const [folderSizes, setFolderSizes] = useState<Record<string, number>>({});
  const sizeQueue = useRef<string[]>([]).current;
  const sizeSeen = useRef(new Set<string>()).current;
  const sizeRunning = useRef(false);

  const pumpSizes = useCallback(async () => {
    if (sizeRunning.current) return;
    sizeRunning.current = true;
    while (sizeQueue.length) {
      const rel = sizeQueue.shift() as string;
      try {
        const n = await invoke<number>('backup:folder-size', rel);
        setFolderSizes((p) => ({ ...p, [rel]: typeof n === 'number' ? n : 0 }));
      } catch {
        // skip
      }
    }
    sizeRunning.current = false;
  }, [sizeQueue]);

  useEffect(() => {
    for (const { entry } of rows) {
      if (entry.type !== 'folder' || sizeSeen.has(entry.rel)) continue;
      sizeSeen.add(entry.rel);
      sizeQueue.push(entry.rel);
    }
    void pumpSizes();
  }, [rows, sizeSeen, sizeQueue, pumpSizes]);

  const sizeLabel = (e: Entry, open: boolean): React.ReactNode => {
    const sz = e.type === 'folder' ? (open ? undefined : folderSizes[e.rel]) : e.size;
    if (sz === undefined) return null;
    return (
      <Badge tone="muted" className="shrink-0 px-1 py-0 font-mono text-[10px]">
        {formatBytes(sz)}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">

        {view === 'tree' && (
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files and folders..."
              className={cn(
                'h-8 w-full rounded-md bg-text-secondary/10 pl-8 pr-28 text-[12.5px] outline-none placeholder:text-text-secondary',
                useRegex && q && !matcher ? 'text-error' : 'text-text-primary',
              )}
            />
            <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
              {(
                [
                  ['Aa', 'Match case', matchCase, setMatchCase],
                  ['ab', 'Match whole word', wholeWord, setWholeWord],
                  ['.*', 'Use regular expression', useRegex, setUseRegex],
                ] as const
              ).map(([label, title, on, set]) => (
                <button
                  key={title}
                  type="button"
                  title={title}
                  aria-pressed={on}
                  onClick={() => set((v) => !v)}
                  className={cn(
                    'h-6 min-w-6 cursor-pointer rounded px-1 font-mono text-[11px] outline-none transition-colors',
                    on
                      ? 'bg-warn/20 text-warn'
                      : 'text-text-secondary hover:bg-card-hover hover:text-text-primary',
                  )}
                >
                  {label}
                </button>
              ))}
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="ml-1 cursor-pointer text-text-secondary hover:text-text-primary"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {view === 'tree' ? (
        <div className="flex h-[52vh] min-h-[260px]">
        <div className="h-full w-1/2 shrink-0 overflow-y-auto border-r border-border p-1.5">
          {rows.length === 0 && (
            <div className="py-10 text-center text-[12px] text-text-secondary">
              {q ? 'No matches in loaded folders' : 'Empty'}
            </div>
          )}
          {rows.map(({ entry, depth, label, dir }) => {
            const isFolder = entry.type === 'folder';
            const isOpen = isFolder && !q && expanded.has(entry.rel);
            const inherited = entry.ignored && !entry.explicit;
            const ignoredInside =
              isFolder && !entry.ignored
                ? ignoredPaths.filter((p) => p.startsWith(`${entry.rel}/`)).length
                : 0;
            const state: CheckState = entry.ignored
              ? 'checked'
              : ignoredInside > 0
                ? 'indeterminate'
                : 'unchecked';
            return (
              <div
                key={entry.rel}
                onClick={() => {
                  if (isFolder && !q) toggleExpand(entry.rel);
                  else if (!isFolder) setSelected(entry.rel);
                  else if (!inherited) void setIgnore(entry.rel, !entry.ignored);
                }}
                onContextMenu={(ev) => {
                  ev.preventDefault();
                  if (!inherited) void setIgnore(entry.rel, !entry.ignored);
                }}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md py-1 pr-2 text-[12.5px] transition-colors hover:bg-card-hover',
                  !isFolder && selected === entry.rel && 'bg-card-hover',
                )}
                style={{ paddingLeft: `${6 + depth * 16}px` }}
              >
                <ChevronRight
                  className={cn(
                    'h-3.5 w-3.5 shrink-0 text-text-secondary transition-transform',
                    isOpen && 'rotate-90',
                    (!isFolder || q) && 'invisible',
                  )}
                />
                <NodeIcon name={entry.name} isFolder={isFolder} open={isOpen} />
                <span
                  className={cn(
                    'truncate',
                    entry.ignored ? 'text-text-secondary line-through' : 'text-text-primary',
                  )}
                >
                  {highlight(label, matcher)}
                </span>
                {q && dir ? (
                  <span className="flex-1 truncate text-[11px] text-text-secondary">{dir}</span>
                ) : (
                  <span className="flex-1" />
                )}
                {sizeLabel(entry, isOpen)}
                {entry.ignored && (
                  <Badge tone={inherited ? 'muted' : 'warn'} className="shrink-0 px-1 py-0 text-[10px]">
                    {inherited ? 'inherited' : 'ignored'}
                  </Badge>
                )}
                {ignoredInside > 0 && !isOpen && (
                  <span
                    title={`${ignoredInside} ignored item(s) inside`}
                    className="inline-flex shrink-0 items-center gap-1 rounded border border-dashed border-warn/50 bg-warn/10 px-1.5 py-[1px] font-mono text-[10.5px] text-warn"
                  >
                    <EyeOff className="h-3 w-3" />
                    {ignoredInside}
                  </span>
                )}
                <IgnoreCheckbox
                  state={state}
                  disabled={inherited}
                  title={
                    inherited
                      ? 'Ignored by a parent folder or pattern'
                      : entry.ignored
                        ? 'Ignored — uncheck to include in backup'
                        : 'Check to add to .gitignore'
                  }
                  onClick={() => void setIgnore(entry.rel, !entry.ignored)}
                />
              </div>
            );
          })}
        </div>
        <FilePreview rel={selected} className="h-full w-1/2" />
        </div>
      ) : (
        <div className="max-h-[52vh] min-h-[220px] overflow-y-auto">
          {suggestions.length > 0 && (
            <div className="border-b border-border px-4 py-3">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                Quick ignore
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((e) => (
                  <button
                    key={e.rel}
                    type="button"
                    onClick={() => void setIgnore(e.rel, true)}
                    className="inline-flex h-6 items-center gap-1 rounded-md bg-teal/10 px-2 text-[11.5px] font-medium text-teal outline-none transition-colors hover:brightness-125"
                  >
                    <Plus className="h-3 w-3" />
                    {e.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {ignoredPaths.length === 0 ? (
            <div className="py-10 text-center text-[12px] text-text-secondary">
              Nothing is ignored. Everything under the folder is backed up.
            </div>
          ) : (
            ignoredPaths.map((p) => (
              <div
                key={p}
                className="flex items-center gap-2 border-b border-border/50 px-4 py-2 text-[12.5px] last:border-b-0 hover:bg-card-hover"
              >
                <NodeIcon name={p.split('/').pop() ?? p} isFolder={!/\.[^/]+$/.test(p)} />
                <span className="truncate font-mono text-text-primary">{p}</span>
                <span className="flex-1" />
                <button
                  type="button"
                  onClick={() => void setIgnore(p, false)}
                  className="inline-flex h-6 items-center gap-1 rounded-md bg-success/10 px-2 text-[11.5px] font-medium text-success outline-none transition-colors hover:brightness-125"
                >
                  <RotateCcw className="h-3 w-3" />
                  Restore
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default FileTree;