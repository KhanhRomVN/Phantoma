import React, { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, EyeOff, Loader2, Minus, Plus, RefreshCw, Search, X } from 'lucide-react';
import { Button } from '@renderer/components/ui/Button/Button';
import { cn } from '@renderer/utils/cn';
import { getFileIconPath, getFolderIconPath } from '@renderer/utils/file-icon';

interface Status {
  root: string;
  enabled: boolean;
  remoteUrl?: string;
  branch?: string;
  changes?: number;
  unpushed?: number;
}

interface Entry {
  name: string;
  rel: string;
  type: 'file' | 'folder';
  ignored: boolean;
  explicit: boolean;
}

interface Result {
  error?: string;
  ok?: boolean;
}

interface Row {
  entry: Entry;
  depth: number;
  label: string;
  dir?: string;
}

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
      <span key={m.index} className="text-primary">
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
      className="w-4 h-4 shrink-0"
    />
  );
});

type CheckState = 'checked' | 'indeterminate' | 'unchecked';

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
        'w-4 h-4 shrink-0 rounded-[4px] border flex items-center justify-center outline-none transition-all duration-100',
        active
          ? 'bg-primary border-primary text-white'
          : 'border-text-secondary/40 bg-transparent hover:border-primary',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-90',
      )}
    >
      {state === 'checked' && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
      {state === 'indeterminate' && <Minus className="w-2.5 h-2.5" strokeWidth={3} />}
    </button>
  );
});

const Backup: React.FC = () => {
  const [status, setStatus] = useState<Status | null>(null);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [version, setVersion] = useState(0);
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

  const refresh = useCallback(async () => {
    setStatus(await invoke<Status>('backup:status'));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
    if (!status?.enabled) return;
    let off = false;
    requested.add('');
    const keys = ['', ...Object.keys(cacheRef.current).filter(Boolean)];
    void Promise.all(keys.map(fetchDir)).then((lists) => {
      if (!off) setCache(Object.fromEntries(keys.map((k, i) => [k, lists[i]])));
    });
    const fromGit = invoke<string[]>('backup:ignored-paths')
      .then((r) => (Array.isArray(r) ? r : []))
      .catch(() => [] as string[]);
    const fromFile = invoke<string>('fs:read-file', `${status.root}/.gitignore`)
      .then((raw) =>
        String(raw)
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.startsWith('/') && !/[*?[\]!]/.test(l))
          .map((l) => l.replace(/^\/+|\/+$/g, '')),
      )
      .catch(() => [] as string[]);
    void Promise.all([fromGit, fromFile]).then(([a, b]) => {
      if (!off) setIgnoredPaths([...new Set([...a, ...b])]);
    });
    return () => {
      off = true;
    };
  }, [status?.enabled, status?.root, version, requested]);

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

  const toggleIgnore = useCallback(async (e: Entry) => {
    await invoke('backup:set-ignore', e.rel, !e.ignored);
    setVersion((v) => v + 1);
    void refresh();
  }, [refresh]);

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

  const run = async (label: string, fn: () => Promise<Result>) => {
    setBusy(label);
    setMessage(null);
    try {
      const res = await fn();
      setMessage(
        res?.error ? { kind: 'error', text: res.error } : { kind: 'ok', text: `${label}: done` },
      );
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
      await refresh();
      setVersion((v) => v + 1);
    }
  };

  const root = status?.root ?? '';
  const enable = () => run('Enable backup', () => invoke<Result>('backup:enable', url));
  const syncAll = () =>
    run('Sync', async () => {
      const ai = await invoke<Result>('backup:auto-ignore');
      if (ai.error) return ai;
      const a = await invoke<Result>('git:stage-all', root);
      if (a.error) return a;
      if ((status?.changes ?? 0) > 0) {
        const c = await invoke<Result>('git:commit', root, `Backup ${new Date().toISOString()}`);
        if (c.error) return c;
      }
      return invoke<Result>('backup:push');
    });

  if (!status) {
    return <div className="text-sm text-text-secondary">Loading...</div>;
  }

  return (
    <div className="max-w-3xl">
      <h3 className="text-base text-primary m-0 mb-1">Backup</h3>
      <p className="text-[11px] text-text-secondary mt-0 mb-4 font-mono">{status.root}</p>

      {!status.enabled ? (
        <div>
          <label className="block text-sm font-medium text-text-primary tracking-wide mb-1.5">
            GitHub repository URL
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/you/phantoma-backup"
            className="w-full max-w-md px-4 py-3 bg-input-background border border-border rounded-md text-text-primary text-[13px] font-mono outline-none"
          />
          <p className="text-[10px] text-text-secondary mt-2 mb-3">
            Use a private repository of your own account. The remote .git is downloaded and a
            .gitignore is created if missing.
          </p>
          <Button
            className="h-8 gap-1.5 text-[12.5px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30"
            disabled={!url.trim() || busy !== null}
            onClick={() => void enable()}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Enable backup
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
            <span className="font-mono text-text-primary">{status.remoteUrl}</span>
            <span>branch: {status.branch || '-'}</span>
            <span>{status.changes ?? 0} changes</span>
            <span>{status.unpushed ?? 0} unpushed</span>
          </div>

          {message && (
            <div
              className={`p-3 rounded-md text-xs break-words ${message.kind === 'error' ? 'bg-error/20 border border-error/30 text-error' : 'bg-primary/10 text-primary'}`}
            >
              {message.text}
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="relative flex-1 rounded-lg bg-text-secondary/10">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search files and folders..."
                className={cn(
                  'w-full h-9 pl-9 pr-28 text-[12.5px] bg-transparent placeholder:text-text-secondary outline-none',
                  useRegex && q && !matcher ? 'text-error' : 'text-text-primary',
                )}
              />
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
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
                        ? 'bg-primary/20 text-primary'
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
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <Button
              className="h-9 gap-1.5 text-[12.5px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30"
              disabled={busy !== null}
              onClick={() => void syncAll()}
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Sync all
            </Button>
          </div>

          <div className="max-h-[60vh] min-h-[200px] overflow-y-auto rounded-lg border border-text-secondary/20 p-1.5">
            {rows.length === 0 && (
              <div className="py-8 text-center text-[12px] text-text-secondary">
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
                    else if (!inherited) void toggleIgnore(entry);
                  }}
                  onContextMenu={(ev) => {
                    ev.preventDefault();
                    if (!inherited) void toggleIgnore(entry);
                  }}
                  className="relative flex items-center gap-2 py-1 pr-2 rounded-md border border-transparent text-[12.5px] cursor-pointer hover:bg-card-hover transition-colors"
                  style={{ paddingLeft: `${6 + depth * 16}px` }}
                >
                  <ChevronRight
                    className={cn(
                      'w-3.5 h-3.5 shrink-0 text-text-secondary transition-transform',
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
                  {q && dir && (
                    <span className="truncate flex-1 text-[11px] text-text-secondary">{dir}</span>
                  )}
                  {!(q && dir) && <span className="flex-1" />}
                  {entry.ignored && (
                    <span className="shrink-0 text-[10px] text-text-secondary">
                      {inherited ? 'inherited' : 'ignored'}
                    </span>
                  )}
                  {ignoredInside > 0 && !isOpen && (
                    <span
                      title={`${ignoredInside} ignored item(s) inside`}
                      className="shrink-0 inline-flex items-center gap-1 rounded px-1.5 py-[1px] font-mono text-[10.5px] bg-text-secondary/10 text-text-secondary border border-dashed border-text-secondary/40"
                    >
                      <EyeOff className="w-3 h-3" />
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
                    onClick={() => void toggleIgnore(entry)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Backup;