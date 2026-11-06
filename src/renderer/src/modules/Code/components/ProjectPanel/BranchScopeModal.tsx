import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, Minus, Search, X } from 'lucide-react';
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
  onSave: (paths: string[]) => void;
  onClose: () => void;
}

export const BranchScopeModal = memo(function BranchScopeModal({
  projectRoot,
  branchName,
  initial,
  onSave,
  onClose,
}: BranchScopeModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial));
  const [cache, setCache] = useState<Record<string, Entry[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');

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


  return (
    <Modal
      isOpen
      onClose={onClose}
      className="w-[680px] max-w-[calc(100vw-2rem)] min-h-[40vh] max-h-[60vh]"
    >
      <ModalHeader
        title={`Scope of ${branchName}`}
        description="Choose the folders and files this branch is allowed to modify."
        onClose={onClose}
        className="px-5 py-4"
      />

      <div className="flex flex-col gap-3 px-5 pb-1 pt-4 min-h-0 flex-1">

        <div className="flex flex-col min-h-0 flex-1 rounded-lg border border-text-secondary/20">
          <div className="relative shrink-0 border-b border-text-secondary/20">
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
          <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
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
              return (
                <div
                  key={rel}
                  onClick={() => (isFolder ? toggleExpand(rel) : !covered && toggle(rel))}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!covered) toggle(rel);
                  }}
                  className="flex items-center gap-2 py-1 pr-2 rounded-md text-[12.5px] cursor-pointer hover:bg-card-hover transition-colors"
                  style={{ paddingLeft: `${6 + depth * 16}px` }}
                >
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
                  {covered && <span className="text-[11px] text-text-secondary shrink-0">inherited</span>}
                  <ScopeCheckbox state={state} disabled={covered} onClick={() => toggle(rel)} />
                </div>
              );
            })}
          </div>
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
            variant="soft"
            size="sm"
            className="h-8 gap-1.5 font-semibold"
            onClick={() => onSave(selectedList)}
          >
            Save scope
          </Button>
        </div>
      </div>
    </Modal>
  );
});