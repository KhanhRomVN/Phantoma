import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, ChevronRight, Minus, Search, X } from 'lucide-react';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalHeader } from '@renderer/components/ui/Modal/ModalHeader';
import { Button } from '@renderer/components/ui/Button/Button';
import { cn } from '@renderer/utils/cn';
import { getFileIconPath, getFolderIconPath } from '@renderer/utils/file-icon';
import { codeApi } from '../../services/code-api.service';

const HIDDEN_NAMES = new Set(['.git', 'node_modules']);

interface Entry {
  name: string;
  type: 'file' | 'folder';
}

interface Row {
  rel: string;
  entry: Entry;
  depth: number;
  label: string;
  header?: boolean;
  open?: boolean;
}

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

const sortEntries = (list: Entry[]): Entry[] =>
  list
    .filter((e) => !HIDDEN_NAMES.has(e.name))
    .sort((a, b) =>
      a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1,
    );

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

const ScopeCheckbox = memo(function ScopeCheckbox({
  state,
  disabled,
  onClick,
}: {
  state: CheckState;
  disabled?: boolean;
  onClick: () => void;
}) {
  const active = state !== 'unchecked';
  return (
    <button
      type="button"
      role="checkbox"
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

interface BranchScopeModalProps {
  projectRoot: string;
  branchName: string;
  initial: string[];
  otherScopes?: { branch: string; paths: string[] }[];
  onSave: (paths: string[]) => void;
  onClose: () => void;
  closable?: boolean;
}

export const BranchScopeModal = memo(function BranchScopeModal({
  projectRoot,
  branchName,
  initial,
  otherScopes = [],
  onSave,
  onClose,
}: BranchScopeModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial));
  const [cache, setCache] = useState<Record<string, Entry[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [searchCollapsed, setSearchCollapsed] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');

  const branchColor = (branch: string) => {
    const palette = [
      { solid: 'bg-sky-500/15 text-sky-400', outline: 'border-sky-500/40 text-sky-400/80' },
      {
        solid: 'bg-emerald-500/15 text-emerald-400',
        outline: 'border-emerald-500/40 text-emerald-400/80',
      },
      {
        solid: 'bg-violet-500/15 text-violet-400',
        outline: 'border-violet-500/40 text-violet-400/80',
      },
      { solid: 'bg-rose-500/15 text-rose-400', outline: 'border-rose-500/40 text-rose-400/80' },
      { solid: 'bg-cyan-500/15 text-cyan-400', outline: 'border-cyan-500/40 text-cyan-400/80' },
      {
        solid: 'bg-fuchsia-500/15 text-fuchsia-400',
        outline: 'border-fuchsia-500/40 text-fuchsia-400/80',
      },
      { solid: 'bg-lime-500/15 text-lime-400', outline: 'border-lime-500/40 text-lime-400/80' },
      {
        solid: 'bg-orange-500/15 text-orange-400',
        outline: 'border-orange-500/40 text-orange-400/80',
      },
    ];
    let h = 0;
    for (let i = 0; i < branch.length; i++) h = (h * 31 + branch.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  };
  const ownersOf = (rel: string) =>
    otherScopes
      .filter((o) => o.paths.some((p) => rel === p || rel.startsWith(`${p}/`)))
      .map((o) => o.branch);
  const innerOwnersOf = (rel: string) =>
    otherScopes.filter((o) => o.paths.some((p) => p.startsWith(`${rel}/`))).map((o) => o.branch);
  const conflicts = useMemo(() => {
    const overlaps = (a: string, b: string) =>
      a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
    return otherScopes.flatMap((o) =>
      [...selected].flatMap((mine) =>
        o.paths
          .filter((theirs) => overlaps(mine, theirs))
          .map((theirs) => ({ branch: o.branch, mine, theirs })),
      ),
    );
  }, [otherScopes, selected]);

  const requestedDirs = useRef(new Set<string>()).current;
  const ignoredRef = useRef<Promise<string[]> | null>(null);
  const getIgnored = useCallback((): Promise<string[]> => {
    if (!ignoredRef.current) {
      const base = projectRoot.replace(/\/+$/, '');
      ignoredRef.current = codeApi.git
        .ignoredPaths(projectRoot)
        .then((res: unknown) =>
          Array.isArray(res) ? res.map((p) => String(p).slice(base.length + 1)) : [],
        )
        .catch(() => [] as string[]);
    }
    return ignoredRef.current;
  }, [projectRoot]);
  const pendingCache = useRef<Record<string, Entry[]>>({});
  const flushTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const loadDir = useCallback(
    async (rel: string) => {
      if (requestedDirs.has(rel)) return;
      requestedDirs.add(rel);
      let list: Entry[] = [];
      try {
        const res: Entry[] = await codeApi.fs.readDir(
          rel ? `${projectRoot}/${rel}` : projectRoot,
        );
        const ignored = await getIgnored();
        list = sortEntries(Array.isArray(res) ? res : []).filter((e) => {
          const child = rel ? `${rel}/${e.name}` : e.name;
          return !ignored.some((p) => child === p || child.startsWith(`${p}/`));
        });
      } catch {
        list = [];
      }
      pendingCache.current[rel] = list;
      if (!flushTimer.current) {
        flushTimer.current = setTimeout(() => {
          const batch = pendingCache.current;
          pendingCache.current = {};
          flushTimer.current = undefined;
          setCache((prev) => ({ ...prev, ...batch }));
        }, 80);
      }
    },
    [projectRoot, requestedDirs, getIgnored],
  );

  useEffect(() => {
    void loadDir('');
  }, [loadDir]);

  useEffect(() => {
    const dirs = new Set<string>();
    for (const o of otherScopes) {
      for (const p of o.paths) {
        const parts = p.split('/');
        for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join('/'));
      }
    }
    dirs.forEach((d) => void loadDir(d));
    setExpanded((prev) => new Set([...prev, ...dirs]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadDir]);

  const toggleExpand = useCallback(
    (rel: string) => {
      if (!cache[rel]) void loadDir(rel);
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(rel)) next.delete(rel);
        else next.add(rel);
        return next;
      });
    },
    [cache, loadDir],
  );

  const toggleSearchCollapse = useCallback((rel: string) => {
    setSearchCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(rel)) next.delete(rel);
      else next.add(rel);
      return next;
    });
  }, []);

  const toggle = useCallback((rel: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(rel)) next.delete(rel);
      else {
        for (const p of next) if (p.startsWith(`${rel}/`)) next.delete(p);
        next.add(rel);
      }
      return next;
    });
  }, []);

  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
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

  const rows = useMemo(() => {
    const matches = (rel: string, e: Entry): boolean =>
      e.name.toLowerCase().includes(q) ||
      (e.type === 'folder' && (cache[rel] ?? []).some((c) => matches(`${rel}/${c.name}`, c)));

    const out: Row[] = [];

    if (q) {
      const scoreOf = (name: string): number => {
        if (!matcher) return 0;
        const m = matcher.exec(name);
        if (!m || m[0].length === 0) return 0;
        const ratio = m[0].length / name.length;
        const dot = name.lastIndexOf('.');
        const baseLen = dot > 0 ? dot : name.length;
        if (m.index === 0 && m[0].length === name.length) return 1000;
        if (m.index === 0 && m[0].length === baseLen) return 900;
        if (m.index === 0) return 800 + ratio * 100;
        return (/[^a-zA-Z0-9]/.test(name[m.index - 1]) ? 600 : 400) + ratio * 100;
      };
      const scored: { row: Row; score: number; dir: string }[] = [];
      for (const [dir, list] of Object.entries(cache)) {
        for (const e of list) {
          const score = scoreOf(e.name);
          if (score <= 0) continue;
          const rel = dir ? `${dir}/${e.name}` : e.name;
          scored.push({ row: { rel, entry: e, depth: 0, label: e.name }, score, dir });
        }
      }
      type Scored = (typeof scored)[number];
      const byRel = new Map(scored.map((s) => [s.row.rel, s]));
      const folderAncestor = (rel: string): string | null => {
        let i = rel.lastIndexOf('/');
        while (i > 0) {
          const p = rel.slice(0, i);
          if (byRel.get(p)?.row.entry.type === 'folder') return p;
          i = p.lastIndexOf('/');
        }
        return null;
      };
      const kids = new Map<string, Scored[]>();
      const tops: Scored[] = [];
      for (const s of scored) {
        const p = folderAncestor(s.row.rel);
        if (p === null) tops.push(s);
        else kids.set(p, [...(kids.get(p) ?? []), s]);
      }
      const byScore = (a: Scored, b: Scored) =>
        b.score - a.score || a.row.entry.name.localeCompare(b.row.entry.name);
      const emit = (s: Scored, depth: number, label: string): Row[] => {
        const allChildren = (kids.get(s.row.rel) ?? []).sort(byScore);
        const children = searchCollapsed.has(s.row.rel) ? [] : allChildren;
        return [
          { ...s.row, depth, label, open: children.length > 0 },
          ...children.flatMap((c) => emit(c, depth + 1, c.row.rel.slice(s.row.rel.length + 1))),
        ];
      };
      const groups = new Map<string, { best: number; items: typeof scored }>();
      for (const s of tops) {
        const g: { best: number; items: typeof scored } = groups.get(s.dir) ?? {
          best: 0,
          items: [],
        };
        g.best = Math.max(g.best, s.score);
        g.items.push(s);
        groups.set(s.dir, g);
      }
      return [...groups.entries()]
        .sort((a, b) => b[1].best - a[1].best || a[0].localeCompare(b[0]))
        .flatMap(([dir, g]) => {
          g.items.sort(byScore);
          const header: Row[] = dir
            ? [
                {
                  rel: `__group:${dir}`,
                  entry: { name: dir, type: 'folder' },
                  depth: 0,
                  label: dir,
                  header: true,
                },
              ]
            : [];
          return [...header, ...g.items.flatMap((s) => emit(s, dir ? 1 : 0, s.row.entry.name))];
        })
        .slice(0, 300);
    }
    const walk = (dir: string, depth: number, inMatch: boolean) => {
      for (const first of cache[dir] ?? []) {
        let e = first;
        let rel = dir ? `${dir}/${e.name}` : e.name;
        let label = e.name;
        while (e.type === 'folder') {
          const kids = cache[rel];
          if (kids?.length === 1 && kids[0].type === 'folder') {
            e = kids[0];
            rel = `${rel}/${e.name}`;
            label = `${label}/${e.name}`;
          } else break;
        }
        const selfMatch = !!q && label.toLowerCase().includes(q);
        if (q && !inMatch && !selfMatch && !matches(rel, e)) continue;
        out.push({ rel, entry: e, depth, label });
        const hasChildMatch =
          !!q &&
          e.type === 'folder' &&
          (cache[rel] ?? []).some((c) => matches(`${rel}/${c.name}`, c));
        if (e.type === 'folder' && (expanded.has(rel) || hasChildMatch || selfMatch))
          walk(rel, depth + 1, inMatch || selfMatch);
      }
    };
    walk('', 0, false);
    return out;
  }, [cache, expanded, q, matcher, searchCollapsed]);

  useEffect(() => {
    for (const r of rows) {
      if (r.entry.type === 'folder' && !cache[r.rel]) void loadDir(r.rel);
    }
  }, [rows, cache, loadDir]);

  useEffect(() => {
    if (!q) return;
    for (const [dir, list] of Object.entries(cache)) {
      for (const e of list) {
        const rel = dir ? `${dir}/${e.name}` : e.name;
        if (e.type === 'folder' && !cache[rel]) void loadDir(rel);
      }
    }
  }, [q, cache, loadDir]);

  const selectedList = useMemo(() => [...selected].sort(), [selected]);

  const dirty = useMemo(
    () => selected.size !== initial.length || initial.some((p) => !selected.has(p)),
    [selected, initial],
  );

  const runInfo = (() => {
    const info = new Map<string, { owner: string; pos: 'single' | 'first' | 'mid' | 'last' }>();
    let i = 0;
    while (i < rows.length) {
      const owner = ownersOf(rows[i].rel)[0];
      if (!owner) {
        i++;
        continue;
      }
      let j = i;
      while (j + 1 < rows.length && ownersOf(rows[j + 1].rel)[0] === owner) j++;
      for (let k = i; k <= j; k++) {
        info.set(rows[k].rel, {
          owner,
          pos: i === j ? 'single' : k === i ? 'first' : k === j ? 'last' : 'mid',
        });
      }
      i = j + 1;
    }
    return info;
  })();

  return (
    <Modal
      isOpen
      onClose={onClose}
      closeOnBackdropClick
      className="w-[680px] max-w-[calc(100vw-2rem)] min-h-[40vh] max-h-[60vh]"
    >
      <ModalHeader
        title={
          <span className="flex items-center gap-2">
            <span>Scope of {projectRoot.split(/[\\/]/).filter(Boolean).pop()}</span>
            <span className="rounded bg-primary/10 px-1.5 font-mono text-[11px] font-normal leading-[18px] text-primary outline outline-1 -outline-offset-1 outline-dashed outline-primary">
              {branchName}
            </span>
          </span>
        }
        description="Choose the folders and files this branch is allowed to modify."
        onClose={onClose}
        showCloseButton
        className="px-5 py-4"
      />

      <div className="flex flex-col gap-3 px-5 pb-1 pt-4 min-h-0 flex-1">
        {conflicts.length > 0 && (
          <div className="flex max-h-24 shrink-0 flex-col gap-1 overflow-y-auto rounded-md border border-dashed border-warn/40 bg-warn/10 px-3 py-2 text-[12px] text-warn">
            <div className="flex items-center gap-1.5 font-medium">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Overlaps with other branches: both may modify the same files
            </div>
            {conflicts.map((c) => (
              <div key={`${c.branch}:${c.mine}:${c.theirs}`} className="font-mono text-[11.5px]">
                {c.branch} · {c.theirs}
                {c.theirs !== c.mine && ` (yours: ${c.mine})`}
              </div>
            ))}
          </div>
        )}

        <div className="relative shrink-0 rounded-lg bg-text-secondary/10">
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
        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-text-secondary/20 p-1.5">
          {rows.length === 0 && (
            <div className="py-8 text-center text-[12px] text-text-secondary">
              {q ? 'No matches in loaded folders' : 'Empty'}
            </div>
          )}
          {rows.map(({ rel, entry, depth, label, header, open: rowOpen }) => {
            if (header) {
              return (
                <div
                  key={rel}
                  title={label}
                  className="flex items-center gap-2 py-1 pr-2 text-[12.5px]"
                  style={{ paddingLeft: '6px' }}
                >
                  <ChevronRight className="w-3.5 h-3.5 shrink-0 rotate-90 text-text-secondary" />
                  <NodeIcon name={label.split('/').pop() ?? label} isFolder open />
                  <span className="truncate text-text-primary">{highlight(label, matcher)}</span>
                </div>
              );
            }
            const isFolder = entry.type === 'folder';
            const covered = [...selected].some((p) => rel.startsWith(`${p}/`));
            const direct = selected.has(rel);
            const partial =
              !direct && !covered && [...selected].some((p) => p.startsWith(`${rel}/`));
            const state: CheckState = direct || covered ? 'checked' : 'unchecked';
            const isOpen = isFolder && (q ? !!rowOpen : expanded.has(rel));
            const run = runInfo.get(rel);
            return (
              <div
                key={rel}
                onClick={() => {
                  if (isFolder && q) toggleSearchCollapse(rel);
                  else if (isFolder) toggleExpand(rel);
                  else if (!covered) toggle(rel);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!covered) toggle(rel);
                }}
                className={cn(
                  'relative flex items-center gap-2 py-1 pr-2 rounded-md border border-transparent text-[12.5px] cursor-pointer hover:bg-card-hover transition-colors',
                  run &&
                    run.pos !== 'single' &&
                    (state !== 'unchecked' || partial
                      ? 'border-dashed border-error'
                      : 'border-dashed border-warn'),
                  run?.pos === 'first' && 'rounded-b-none border-b-transparent',
                  run?.pos === 'mid' && 'rounded-none border-y-transparent',
                  run?.pos === 'last' && 'rounded-t-none border-t-transparent',
                )}
                style={{ paddingLeft: `${6 + depth * 16}px` }}
              >
                {run?.pos === 'first' && (
                  <span
                    className={cn(
                      'pointer-events-none absolute right-9 top-1/2 -translate-y-1/2 z-10 h-4 rounded-md px-1.5 font-mono text-[10px] leading-4',
                      branchColor(run.owner).solid,
                    )}
                  >
                    {run.owner}
                  </span>
                )}
                <ChevronRight
                  className={cn(
                    'w-3.5 h-3.5 shrink-0 text-text-secondary transition-transform',
                    isOpen && 'rotate-90',
                    !isFolder && 'invisible',
                  )}
                />
                <NodeIcon name={entry.name} isFolder={isFolder} open={isOpen} />
                <span
                  className={cn(
                    'truncate flex-1',
                    direct
                      ? 'text-primary font-medium'
                      : covered
                        ? 'text-text-secondary'
                        : 'text-text-primary',
                  )}
                >
                  {highlight(label, matcher)}
                </span>

                {(!run || run.pos === 'single') &&
                  ownersOf(rel).map((b) => (
                    <span
                      key={b}
                      className={cn(
                        'shrink-0 rounded px-1.5 py-[2px] font-mono text-[10.5px]',
                        branchColor(b).solid,
                      )}
                    >
                      {b}
                    </span>
                  ))}
                {isFolder &&
                  !isOpen &&
                  innerOwnersOf(rel).map((b) => (
                    <span
                      key={`in:${b}`}
                      title={`${b} has files selected inside this folder`}
                      className={cn(
                        'shrink-0 rounded border px-1.5 py-[1px] font-mono text-[10.5px]',
                        branchColor(b).outline,
                      )}
                    >
                      {b}
                    </span>
                  ))}
                {partial && !isOpen && (
                  <span
                    title="Has selected items inside"
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                  />
                )}
                <ScopeCheckbox state={state} disabled={covered} onClick={() => toggle(rel)} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 px-5 py-4 shrink-0">
        <div className="flex gap-2">
          <Button
            className="h-8 text-[12.5px] bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/20 hover:text-text-primary active:bg-text-secondary/30"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="h-8 gap-1.5 text-[12.5px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30"
            onClick={() => onSave(selectedList)}
            disabled={selected.size === 0 || !dirty}
          >
            Save scope
          </Button>
        </div>
      </div>
    </Modal>
  );
});
