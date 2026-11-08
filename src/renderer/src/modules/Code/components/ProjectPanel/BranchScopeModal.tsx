import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, ChevronRight, Minus, Search, X } from 'lucide-react';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalHeader } from '@renderer/components/ui/Modal/ModalHeader';
import { Button } from '@renderer/components/ui/Button/Button';
import { cn } from '@renderer/utils/cn';
import { getFileIconPath, getFolderIconPath } from '@renderer/utils/file-icon';

const HIDDEN_NAMES = new Set(['.git', 'node_modules']);

interface Entry {
  name: string;
  type: 'file' | 'folder';
}

interface Row {
  rel: string;
  entry: Entry;
  depth: number;
}

const sortEntries = (list: Entry[]): Entry[] =>
  list
    .filter((e) => !HIDDEN_NAMES.has(e.name))
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1));


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
  const [query, setQuery] = useState('');
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
        o.paths.filter((theirs) => overlaps(mine, theirs)).map((theirs) => ({ branch: o.branch, mine, theirs })),
      ),
    );
  }, [otherScopes, selected]);

  const loadDir = useCallback(
    async (rel: string) => {
      try {
        const res: Entry[] = await window.api.invoke(
          'fs:read-dir',
          rel ? `${projectRoot}/${rel}` : projectRoot,
        );
        setCache((prev) => ({ ...prev, [rel]: sortEntries(Array.isArray(res) ? res : []) }));
      } catch {
        setCache((prev) => ({ ...prev, [rel]: [] }));
      }
    },
    [projectRoot],
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

  const q = query.trim().toLowerCase();

  const rows = useMemo(() => {
    const matches = (rel: string, e: Entry): boolean =>
      e.name.toLowerCase().includes(q) ||
      (e.type === 'folder' && (cache[rel] ?? []).some((c) => matches(`${rel}/${c.name}`, c)));

    const out: Row[] = [];
    const walk = (dir: string, depth: number) => {
      for (const e of cache[dir] ?? []) {
        const rel = dir ? `${dir}/${e.name}` : e.name;
        if (q && !matches(rel, e)) continue;
        out.push({ rel, entry: e, depth });
        const hasChildMatch =
          !!q && e.type === 'folder' && (cache[rel] ?? []).some((c) => matches(`${rel}/${c.name}`, c));
        if (e.type === 'folder' && (expanded.has(rel) || hasChildMatch)) walk(rel, depth + 1);
      }
    };
    walk('', 0);
    return out;
  }, [cache, expanded, q]);

  const selectedList = useMemo(() => [...selected].sort(), [selected]);

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
      className="w-[680px] max-w-[calc(100vw-2rem)] min-h-[40vh] max-h-[60vh]"
    >
      <ModalHeader
        title={
          <span className="flex items-center gap-2">
            <span>Scope of {projectRoot.split(/[\\/]/).filter(Boolean).pop()}</span>
            <span className="rounded bg-warn/15 px-1.5 font-mono text-[11px] font-normal leading-[18px] text-warn">
              {branchName}
            </span>
          </span>
        }
        description="Choose the folders and files this branch is allowed to modify."
        onClose={onClose}
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


          <div className="relative shrink-0 rounded-lg border border-text-secondary/20">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search in expanded folders..."
              className="w-full h-9 pl-9 pr-9 text-[12.5px] bg-transparent text-text-primary placeholder:text-text-secondary outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-text-secondary/20 p-1.5">
            {rows.length === 0 && (
              <div className="py-8 text-center text-[12px] text-text-secondary">
                {q ? 'No matches in loaded folders' : 'Empty'}
              </div>
            )}
            {rows.map(({ rel, entry, depth }) => {
              const isFolder = entry.type === 'folder';
              const covered = [...selected].some((p) => rel.startsWith(`${p}/`));
              const direct = selected.has(rel);
              const partial = !direct && !covered && [...selected].some((p) => p.startsWith(`${rel}/`));
              const state: CheckState = direct || covered ? 'checked' : partial ? 'indeterminate' : 'unchecked';
              const isOpen = isFolder && (expanded.has(rel) || (!!q && (cache[rel] ?? []).length > 0));
              const run = runInfo.get(rel);
              return (
                <div
                  key={rel}
                  onClick={() => (isFolder ? toggleExpand(rel) : !covered && toggle(rel))}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!covered) toggle(rel);
                  }}
                  className={cn(
                    'relative flex items-center gap-2 py-1 pr-2 rounded-md border border-transparent text-[12.5px] cursor-pointer hover:bg-card-hover transition-colors',
                    run && run.pos !== 'single' && (state !== 'unchecked' ? 'border-dashed border-error' : 'border-dashed border-warn'),
                    run?.pos === 'first' && 'rounded-b-none border-b-transparent',
                    run?.pos === 'mid' && 'rounded-none border-y-transparent',
                    run?.pos === 'last' && 'rounded-t-none border-t-transparent',
                  )}
                  style={{ paddingLeft: `${6 + depth * 16}px` }}
                >
                  {run?.pos === 'first' && (
                    <span className="pointer-events-none absolute right-9 top-1/2 -translate-y-1/2 z-10 h-4 rounded-md bg-warn/15 px-1.5 font-mono text-[10px] leading-4 text-warn">
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
                      direct ? 'text-primary font-medium' : covered ? 'text-text-secondary' : 'text-text-primary',
                    )}
                  >
                    {entry.name}
                  </span>

                  {(!run || run.pos === 'single') && ownersOf(rel).map((b) => (
                    <span
                      key={b}
                      className="shrink-0 rounded bg-warn/15 px-1.5 py-[2px] font-mono text-[10.5px] text-warn"
                    >
                      {b}
                    </span>
                  ))}
                  {isFolder && !isOpen &&
                    innerOwnersOf(rel).map((b) => (
                      <span
                        key={`in:${b}`}
                        title={`${b} has files selected inside this folder`}
                        className="shrink-0 rounded border border-warn/40 px-1.5 py-[1px] font-mono text-[10.5px] text-warn/80"
                      >
                        {b}
                      </span>
                    ))}
                  <ScopeCheckbox state={state} disabled={covered} onClick={() => toggle(rel)} />
                </div>
              );
            })}
          </div>
      </div>

      <div className="flex items-center justify-end gap-2 px-5 py-4 shrink-0">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-8 cursor-pointer rounded-lg bg-button-soft-background px-3 text-[12.5px] font-medium text-text-secondary outline-none transition-colors hover:bg-button-soft-background/80 hover:text-text-primary active:bg-button-soft-background/70"
          >
            Cancel
          </button>
          <Button
            className="h-8 gap-1.5 font-semibold bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70"
            onClick={() => onSave(selectedList)}
          >
            Save scope
          </Button>
        </div>
      </div>
    </Modal>
  );
});