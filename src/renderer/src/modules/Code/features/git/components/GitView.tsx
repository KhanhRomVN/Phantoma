/**
 * ------------------------------------------------------------------
 * Git View
 * ------------------------------------------------------------------
 * GitKraken-style Git client rendered in the ContentPanel when
 * contentViewMode === 'git'.
 *
 * Main features:
 * - Toolbar: project, current branch, commit search, refresh
 * - Left: local / remote branches (click to jump to the tip)
 * - Center: commit graph with avatar nodes, ref labels, lane-tinted
 *   rows, column header and keyboard navigation (Up / Down)
 * - Right: commit detail with changed files and stats
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, GitCommit, Loader2, RefreshCw, Search, X } from 'lucide-react';

import { cn } from '@renderer/utils/cn';
import { useCodeStore } from '../../../shared/stores/code.store';
import { codeApi } from '../../../shared/api/code.api';
import { BranchSidebar } from './BranchSidebar';
import { CommitContextMenu } from './CommitContextMenu';
import { SyncBranchModal } from './modals/SyncBranchModal';
import { CommitDetail } from './CommitDetail';
import { EmptyState } from './EmptyState';
import { DiffView } from './DiffView';
import { ConfirmFileChangeModal, type FileChangeAction } from './modals/ConfirmFileChangeModal';
import { GraphCell, GraphFill, RefPill, useRemoteAccents } from './GraphCell';
import {
  ROW_HEIGHT,
  LANE_WIDTH,
  buildGraph,
  laneX,
  formatRelative,
  laneColor,
  parseRefs,
  type Commit,
  type CommitFile,
  type GraphRow,
} from '../utils/graph.util';

// ─── Virtual Row (local changes not on remote) ──────────────────────────
interface LocalChange {
  name: string;
  files: CommitFile[];
}

const VIRTUAL_PREFIX = 'virtual:';

interface VirtualRowProps {
  branch: string;
  unstagedCount: number;
  stagedCount: number;
  unpushedCount: number;
  col: number;
  lines: number[];
  graphWidth: number;
  selected: boolean;
  dimmed: boolean;
  onSelect: (key: string) => void;
}

const VirtualRow = memo(function VirtualRow({
  branch,
  unstagedCount,
  stagedCount,
  unpushedCount,
  col,
  lines,
  graphWidth,
  selected,
  dimmed,
  onSelect,
}: VirtualRowProps) {
  const color = laneColor(col);
  const x = laneX(col);
  const mid = ROW_HEIGHT / 2;
  const key = VIRTUAL_PREFIX + branch;

  return (
    <div
      id={`git-row-${key}`}
      onClick={() => onSelect(key)}
      style={{
        height: ROW_HEIGHT,
        background: selected ? `color-mix(in srgb, ${color} 20%, transparent)` : undefined,
      }}
      className={cn(
        'flex items-center shrink-0 cursor-pointer transition-colors hover:brightness-125',
        dimmed && 'opacity-30',
      )}
    >
      <div
        className={
          'w-[200px] shrink-0 flex items-center justify-end gap-1 pl-3 pr-2 overflow-hidden'
        }
      >
        <RefPill chip={{ label: branch, kind: 'local' }} />
      </div>

      <div style={{ width: graphWidth }} className={'shrink-0 overflow-hidden'}>
        <svg width={graphWidth} height={ROW_HEIGHT}>
          {lines
            .filter((l) => l !== col)
            .map((l) => (
              <line
                key={l}
                x1={laneX(l)}
                x2={laneX(l)}
                y1={0}
                y2={ROW_HEIGHT}
                stroke={laneColor(l)}
                strokeWidth={2}
              />
            ))}
          <line
            x1={x}
            x2={x}
            y1={mid}
            y2={ROW_HEIGHT}
            stroke={color}
            strokeWidth={2}
            strokeDasharray={'3 3'}
          />
          <circle
            cx={x}
            cy={mid}
            r={7}
            fill={'none'}
            stroke={color}
            strokeWidth={2}
            strokeDasharray={'3 3'}
          />
        </svg>
      </div>

      <span className={'flex-1 min-w-0 flex items-center gap-1.5 pl-2'}>
        {unstagedCount > 0 && (
          <span
            className={
              'h-5 shrink-0 inline-flex items-center rounded-md px-2 text-[11px] font-medium bg-warn/10 text-warn'
            }
          >
            {`${unstagedCount} ${unstagedCount === 1 ? 'file' : 'files'} not added`}
          </span>
        )}
        {stagedCount > 0 && (
          <span
            className={
              'h-5 shrink-0 inline-flex items-center rounded-md px-2 text-[11px] font-medium bg-green/10 text-green'
            }
          >
            {`${stagedCount} ${stagedCount === 1 ? 'file' : 'files'} not committed`}
          </span>
        )}
        {unpushedCount > 0 && (
          <span
            className={
              'h-5 shrink-0 inline-flex items-center rounded-md px-2 text-[11px] font-medium bg-primary/10 text-primary'
            }
          >
            {`${unpushedCount} ${unpushedCount === 1 ? 'commit' : 'commits'} not pushed`}
          </span>
        )}
      </span>
      <span className={'w-[268px] shrink-0'} />
    </div>
  );
});

// ─── Branch Row (local branch in sync with remote) ──────────────────────
interface BranchRowProps {
  hash: string;
  names: string[];
  col: number;
  lines: number[];
  graphWidth: number;
  dimmed: boolean;
  onSelect: (hash: string) => void;
}

const BranchRow = memo(function BranchRow({
  hash,
  names,
  col,
  lines,
  graphWidth,
  dimmed,
  onSelect,
}: BranchRowProps) {
  const color = laneColor(col);
  const x = laneX(col);
  const mid = ROW_HEIGHT / 2;

  return (
    <div
      id={`git-row-branch:${hash}`}
      onClick={() => onSelect(hash)}
      style={{ height: ROW_HEIGHT }}
      className={cn(
        'flex items-center shrink-0 cursor-pointer transition-colors hover:brightness-125',
        dimmed && 'opacity-30',
      )}
    >
      <div
        className={
          'w-[200px] shrink-0 flex items-center justify-end gap-1 pl-3 pr-2 overflow-hidden'
        }
      >
        {names.map((n) => (
          <RefPill key={n} chip={{ label: n, kind: 'local' }} />
        ))}
      </div>

      <div style={{ width: graphWidth }} className={'shrink-0 overflow-hidden'}>
        <svg width={graphWidth} height={ROW_HEIGHT}>
          {lines
            .filter((l) => l !== col)
            .map((l) => (
              <line
                key={l}
                x1={laneX(l)}
                x2={laneX(l)}
                y1={0}
                y2={ROW_HEIGHT}
                stroke={laneColor(l)}
                strokeWidth={2}
              />
            ))}
          <line x1={x} x2={x} y1={mid} y2={ROW_HEIGHT} stroke={color} strokeWidth={2} />
          <circle cx={x} cy={mid} r={4} fill={color} />
        </svg>
      </div>

      <span className={'flex-1 min-w-0 truncate pl-2 text-[12.5px] italic text-text-secondary'}>
        {'Local branch · same commit as remote'}
      </span>
      <span className={'w-[268px] shrink-0'} />
    </div>
  );
});

// ─── Commit Row ─────────────────────────────────────────────────────────
interface CommitRowProps {
  commit: Commit;
  row: GraphRow;
  laneCount: number;
  graphWidth: number;
  selected: boolean;
  dimmed: boolean;
  hideLocals?: string[];
  unpushed?: boolean;
  pushing?: boolean;
  onPush?: () => void;
  onSelect: (hash: string) => void;
  onContextMenu: (e: React.MouseEvent, commit: Commit) => void;
  onHover: (e: React.MouseEvent | null, commit?: Commit) => void;
}

const CommitRow = memo(function CommitRow({
  commit,
  row,
  laneCount,
  graphWidth,
  selected,
  dimmed,
  hideLocals,
  unpushed,
  pushing,
  onPush,
  onSelect,
  onContextMenu,
  onHover,
}: CommitRowProps) {
  const color = laneColor(row.col);
  const chips = parseRefs(commit.refs).filter(
    (c) =>
      !(hideLocals && (c.kind === 'head' || c.kind === 'local') && hideLocals.includes(c.label)),
  );
  const remoteAccents = useRemoteAccents(chips);
  const topLanes = [...new Set([...row.incoming, ...row.passThrough])];
  const bottomLanes = [...new Set([...row.parentLanes, ...row.passThrough])];
  const isMerge = commit.parents.length > 1;
  const isHead = commit.refs.some((r) => r.startsWith('HEAD'));

  return (
    <div
      id={`git-row-${commit.hash}`}
      onClick={() => onSelect(commit.hash)}
      onContextMenu={(e) => onContextMenu(e, commit)}
      onMouseEnter={(e) => onHover(e, commit)}
      onMouseMove={(e) => onHover(e, commit)}
      onMouseLeave={() => onHover(null)}
      style={{
        minHeight: ROW_HEIGHT,
        background: selected ? `color-mix(in srgb, ${color} 20%, transparent)` : undefined,
      }}
      className={cn(
        'flex items-center shrink-0 cursor-pointer transition-colors hover:brightness-125',
        dimmed && 'opacity-30',
      )}
    >
      <div
        className={'w-[200px] shrink-0 flex flex-col items-end justify-center gap-1 pl-3 pr-2 py-1'}
      >
        {[false, true].map((remote) => {
          // ASSUMED: tách nhãn local và remote thành 2 dòng riêng để 'main' không dính chung dòng với origin/*
          const group = chips
            .map((c, i) => ({ c, i }))
            .filter(({ c }) => (c.kind === 'remote') === remote);
          return group.length > 0 ? (
            <div key={String(remote)} className={'flex flex-wrap items-center justify-end gap-1'}>
              {group.map(({ c, i }) => (
                <RefPill key={c.kind + c.label} chip={c} color={remoteAccents[i]} />
              ))}
            </div>
          ) : null;
        })}
      </div>

      <div
        style={{ width: graphWidth }}
        className={'shrink-0 overflow-hidden self-stretch flex flex-col'}
      >
        <GraphFill lanes={topLanes} laneCount={laneCount} />
        <GraphCell
          row={row}
          laneCount={laneCount}
          author={commit.author}
          email={commit.email}
          isMerge={isMerge}
          isHead={isHead}
        />
        <GraphFill lanes={bottomLanes} laneCount={laneCount} />
      </div>

      <span
        title={commit.subject}
        className={cn(
          'flex-1 min-w-0 truncate pl-2 text-[12.5px]',
          isMerge ? 'text-text-secondary' : 'text-text-primary',
        )}
      >
        {commit.subject}
      </span>
      {unpushed && (
        <button
          type={'button'}
          disabled={pushing}
          title={'Committed but not pushed yet'}
          onClick={(e) => {
            e.stopPropagation();
            onPush?.();
          }}
          className={
            'mr-2 h-5 shrink-0 cursor-pointer rounded-md px-2 text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30 disabled:cursor-not-allowed disabled:opacity-50 transition-colors outline-dashed outline-1 -outline-offset-1 outline-primary/50'
          }
        >
          {pushing ? 'Pushing…' : 'Push'}
        </button>
      )}
      <span className={'w-[130px] shrink-0 truncate px-2 text-[11.5px] text-text-secondary'}>
        {commit.author}
      </span>
      <span className={'w-[62px] shrink-0 font-mono text-[10.5px] text-text-secondary/50'}>
        {commit.hash.slice(0, 7)}
      </span>
      <span
        className={
          'w-[76px] shrink-0 pr-4 text-right font-mono text-[10.5px] text-text-secondary/60'
        }
      >
        {formatRelative(commit.date)}
      </span>
    </div>
  );
});

// ─── Main Component ─────────────────────────────────────────────────────
export const GitView = memo(function GitView() {
  const projectPath = useCodeStore((s) => {
    const p = s.projects.find((p) => p.id === s.currentProjectId);
    return p?.path ?? '';
  });
  const projectName = useCodeStore((s) => {
    const p = s.projects.find((p) => p.id === s.currentProjectId);
    return p?.name ?? '';
  });
  const projectBranches = useCodeStore(
    (s) => s.projects.find((p) => p.id === s.currentProjectId)?.branches,
  );

  const [commits, setCommits] = useState<Commit[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [worktreePaths, setWorktreePaths] = useState<Record<string, string>>({});
  const [syncCommit, setSyncCommit] = useState<Commit | null>(null);
  const [localChanges, setLocalChanges] = useState<LocalChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedHash, setSelectedHash] = useState<string | null>(null);
  const [files, setFiles] = useState<CommitFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [busyBranch, setBusyBranch] = useState<string | null>(null);
  const [diffOpen, setDiffOpen] = useState(false);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [activeBranch, setActiveBranch] = useState<string | null>(null);

  const [defaultBranch, setDefaultBranch] = useState('');
  const [unpushedHashes, setUnpushedHashes] = useState<Set<string>>(new Set());
  const [cloneUnpushed, setCloneUnpushed] = useState<Record<string, Commit[]>>({});
  const [pushing, setPushing] = useState(false);
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    title: string;
    lines: string[];
  } | null>(null);

  useEffect(() => {
    if (!projectPath) return;
    codeApi.git
      .defaultBranch(projectPath)
      .then((def: { name?: string }) => {
        setDefaultBranch(def?.name ?? '');
      })
      .catch(() => undefined);
  }, [projectPath]);

  useEffect(() => {
    setActiveFile(null);
    if (!selectedHash) setDiffOpen(false);
  }, [selectedHash]);

  const openDiff = useCallback((path: string) => {
    setActiveFile(path);
    setDiffOpen(true);
  }, []);

  const closeDiff = useCallback(() => setDiffOpen(false), []);

  const searchRef = useRef<HTMLInputElement>(null);

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

  const refresh = useCallback(async () => {
    if (!projectPath) return;
    setLoading(true);
    setError(null);
    try {
      codeApi.git
        .unpushed(projectPath)
        .then((r: { hashes?: string[] }) => {
          setUnpushedHashes(new Set(r?.hashes ?? []));
        })
        .catch((e) => {
          setUnpushedHashes(new Set());
        });
      Promise.all(
        (projectBranches ?? [])
          .filter((b) => b.path && b.path !== projectPath)
          .map(async (b) => {
            const u: { hashes?: string[] } = await codeApi.git.unpushed(b.path as string);
            const hashes = new Set(u?.hashes ?? []);
            if (hashes.size === 0) return [b.name, [] as Commit[]] as const;
            const l: { commits?: Commit[] } = await codeApi.git.log(b.path as string, 300);
            return [b.name, (l?.commits ?? []).filter((c) => hashes.has(c.hash))] as const;
          }),
      )
        .then((entries) => {
          setCloneUnpushed(Object.fromEntries(entries));
        })
        .catch(() => setCloneUnpushed({}));
      const [logRes, branchRes, changeRes, tagRes] = await Promise.all([
        codeApi.git.log(projectPath, 300),
        codeApi.git.branches(projectPath),
        codeApi.git.localChanges(
          projectPath,
          Object.fromEntries(
            (projectBranches ?? []).filter((b) => b.path).map((b) => [b.name, b.path as string]),
          ),
        ),
        codeApi.git.tags(projectPath),
      ]);
      setLocalChanges(changeRes?.branches ?? []);
      setTags(tagRes?.tags ?? []);
      if (logRes?.error) {
        setError(logRes.error);
        setCommits([]);
      } else {
        const list: Commit[] = logRes?.commits ?? [];
        setCommits(list);
        setSelectedHash((prev) => prev ?? list[0]?.hash ?? null);
      }
      setBranches(branchRes?.branches ?? []);
      setWorktreePaths(branchRes?.worktreePaths ?? {});
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [projectPath, projectBranches]);

  useEffect(() => {
    setSelectedHash(null);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onRefresh = () => void refresh();
    window.addEventListener('phantoma:git-refresh', onRefresh);
    return () => window.removeEventListener('phantoma:git-refresh', onRefresh);
  }, [refresh]);

  useEffect(() => {
    if (!selectedHash || !projectPath || selectedHash.startsWith(VIRTUAL_PREFIX)) {
      setFiles([]);
      return;
    }
    let cancelled = false;
    setFilesLoading(true);
    codeApi.git
      .commitFiles(projectPath, selectedHash)
      .then((res: { files?: CommitFile[] }) => {
        if (!cancelled) setFiles(res?.files ?? []);
      })
      .catch(() => {
        if (!cancelled) setFiles([]);
      })
      .finally(() => {
        if (!cancelled) setFilesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedHash, projectPath]);

  const mainTip = useMemo(() => {
    if (!defaultBranch) return null;
    const names = [defaultBranch, `HEAD -> ${defaultBranch}`, `origin/${defaultBranch}`];
    return commits.find((c) => c.refs.some((r) => names.includes(r)))?.hash ?? null;
  }, [commits, defaultBranch]);
  const { rows, laneCount } = useMemo(() => buildGraph(commits, mainTip), [commits, mainTip]);
  const graphWidth = Math.min(Math.max(laneCount * LANE_WIDTH + 16, 72), 260);
  const selected = commits.find((c) => c.hash === selectedHash) ?? null;
  const selectedVirtual =
    localChanges.find((lc) => VIRTUAL_PREFIX + lc.name === selectedHash) ?? null;

  const virtualByHash = useMemo(() => {
    const map = new Map<string, LocalChange[]>();
    localChanges.forEach((lc) => {
      const tip = commits.find((c) =>
        c.refs.some((r) => r === lc.name || r === `HEAD -> ${lc.name}`),
      );
      if (!tip) return;
      map.set(tip.hash, [...(map.get(tip.hash) ?? []), lc]);
    });
    return map;
  }, [commits, localChanges]);

  const virtualNamesByHash = useMemo(() => {
    const map = new Map<string, string[]>();
    virtualByHash.forEach((list, hash) =>
      map.set(
        hash,
        list.map((lc) => lc.name),
      ),
    );
    return map;
  }, [virtualByHash]);

  const branchRowsByHash = useMemo(() => {
    const map = new Map<string, string[]>();
    commits.forEach((c) => {
      const chips = parseRefs(c.refs);
      if (!chips.some((x) => x.kind === 'remote')) return;
      const virtual = virtualNamesByHash.get(c.hash) ?? [];
      const names = chips
        .filter((x) => (x.kind === 'head' || x.kind === 'local') && !virtual.includes(x.label))
        .map((x) => x.label);
      if (names.length > 0) map.set(c.hash, names);
    });
    return map;
  }, [commits, virtualNamesByHash]);

  const items = useMemo(() => {
    const list: (
      | { kind: 'commit'; commit: Commit; row: GraphRow }
      | { kind: 'virtual'; change: LocalChange; row: GraphRow }
      | { kind: 'branch'; hash: string; names: string[]; row: GraphRow }
    )[] = [];
    commits.forEach((c, idx) => {
      (virtualByHash.get(c.hash) ?? []).forEach((change) =>
        list.push({ kind: 'virtual', change, row: rows[idx] }),
      );
      const names = branchRowsByHash.get(c.hash);
      if (names) list.push({ kind: 'branch', hash: c.hash, names, row: rows[idx] });
      list.push({ kind: 'commit', commit: c, row: rows[idx] });
    });
    return list;
  }, [commits, rows, virtualByHash, branchRowsByHash]);

  const navItems = useMemo(
    () =>
      items.filter(
        (it): it is Exclude<(typeof items)[number], { kind: 'branch' }> => it.kind !== 'branch',
      ),
    [items],
  );

  useEffect(() => {
    if (navItems.length === 0) return;
    const keyOf = (it: (typeof navItems)[number]) =>
      it.kind === 'commit' ? it.commit.hash : VIRTUAL_PREFIX + it.change.name;
    if (selectedHash && navItems.some((it) => keyOf(it) === selectedHash)) return;
    setSelectedHash(keyOf(navItems[0]));
  }, [navItems, selectedHash]);

  const currentBranch = useMemo(() => {
    for (const c of commits) {
      const ref = c.refs.find((r) => r.startsWith('HEAD -> '));
      if (ref) return ref.slice(8);
    }
    return null;
  }, [commits]);

  const cloneBranchPaths = useMemo(() => {
    const map: Record<string, string> = {};
    for (const b of projectBranches ?? []) {
      if (b.path && b.path !== projectPath) map[b.name] = b.path;
    }
    return map;
  }, [projectBranches, projectPath]);

  const validBranches = useMemo(() => {
    const base = branches.filter((b) => b !== 'origin' && !b.endsWith('/HEAD'));
    const extra = Object.keys(cloneBranchPaths).filter((n) => !base.includes(n));
    return [...base, ...extra];
  }, [branches, cloneBranchPaths]);
  const localBranches = useMemo(
    () => validBranches.filter((b) => !b.startsWith('origin/')),
    [validBranches],
  );
  const remoteBranches = useMemo(
    () => validBranches.filter((b) => b.startsWith('origin/')),
    [validBranches],
  );

  const syncSourceLabel = useCallback(
    (commit: Commit) => {
      const chips = parseRefs(commit.refs);
      const remote = chips.find((c) => c.kind === 'remote');
      const local = chips.find((c) => c.kind === 'head' || c.kind === 'local');
      const branch = remote
        ? remote.label
        : `origin/${local?.label ?? activeBranch ?? currentBranch ?? 'HEAD'}`;
      return `${branch} - ${commit.hash.slice(0, 7)}`;
    },
    [activeBranch, currentBranch],
  );

  const syncTargets = useMemo(() => {
    const list = currentBranch ? [{ name: currentBranch, path: projectPath }] : [];
    Object.entries({ ...cloneBranchPaths, ...worktreePaths }).forEach(([name, path]) =>
      list.push({ name, path }),
    );
    return list;
  }, [currentBranch, projectPath, worktreePaths, cloneBranchPaths]);

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

  const selectHash = useCallback((hash: string, block: ScrollLogicalPosition = 'nearest') => {
    setSelectedHash(hash);
    setActiveBranch(null);
    document.getElementById(`git-row-${hash}`)?.scrollIntoView({ block });
  }, []);

  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  }, []);

  const jumpToBranch = useCallback(
    async (name: string) => {
      if (localChanges.some((lc) => lc.name === name)) {
        selectHash(VIRTUAL_PREFIX + name, 'center');
        setActiveBranch(name);
        return;
      }
      setBusyBranch(name);
      try {
        const clonePath = cloneBranchPaths[name];
        let res: any = await codeApi.git.resolveRef(
          clonePath ?? projectPath,
          clonePath ? 'HEAD' : name,
        );
        if (clonePath && !commits.some((c) => c.hash === res?.hash)) {
          const remote: any = await codeApi.git.resolveRef(projectPath, `origin/${name}`);
          if (remote?.hash) res = remote;
        }
        if (res?.error || !res?.hash) {
          showNotice(`Cannot resolve "${name}"`);
          return;
        }
        if (commits.some((c) => c.hash === res.hash)) {
          selectHash(res.hash, 'center');
          setActiveBranch(name);
        } else {
          showNotice(
            `Tip of "${name}" (${res.hash.slice(0, 7)}) is outside the loaded 300 commits`,
          );
        }
      } finally {
        setBusyBranch(null);
      }
    },
    [commits, localChanges, projectPath, cloneBranchPaths, selectHash, showNotice],
  );

  const handleCheckout = useCallback(
    async (name: string) => {
      setBusyBranch(name);
      try {
        const res = await codeApi.git
          .checkout(projectPath, name)
          .catch((e: any) => ({ error: e?.message || String(e) }));
        if (res?.error) {
          showNotice(String(res.error).split('\n')[0]);
        } else {
          showNotice(`Checked out "${name}"`);
          await refresh();
        }
      } finally {
        setBusyBranch(null);
      }
    },
    [projectPath, refresh, showNotice],
  );

  const handlePush = useCallback(async (root?: string) => {
    setPushing(true);
    try {
      const res = await codeApi.git
        .push(root ?? projectPath)
        .catch((e: any) => ({ error: e?.message || String(e) }));
      showNotice(res?.error ? String(res.error).split('\n')[0] : 'Pushed');
      await refresh();
    } finally {
      setPushing(false);
    }
  }, [projectPath, refresh, showNotice]);

  const runFileOp = useCallback(
    async (channel: string, payload: unknown, okMsg: string, opts?: unknown, root?: string) => {
      const res = await window.api.invoke(
        channel,
        root ?? projectPath,
        payload,
        ...(opts === undefined ? [] : [opts]),
      );
      showNotice(res?.error ? String(res.error).split('\n')[0] : okMsg);
      await refresh();
    },
    [projectPath, refresh, showNotice],
  );

  const [pendingOp, setPendingOp] = useState<{ action: FileChangeAction; file: CommitFile } | null>(
    null,
  );

  const fileActions = useMemo(
    () =>
      selectedVirtual
        ? {
            onStage: (f: CommitFile) => setPendingOp({ action: 'stage', file: f }),
            onUnstage: (f: CommitFile) => setPendingOp({ action: 'unstage', file: f }),
            onDiscard: (f: CommitFile) => setPendingOp({ action: 'discard', file: f }),
          }
        : undefined,
    [selectedVirtual, runFileOp],
  );

  const [localBusy, setLocalBusy] = useState(false);
  const localRoot = selectedVirtual
    ? (cloneBranchPaths[selectedVirtual.name] ?? worktreePaths[selectedVirtual.name] ?? projectPath)
    : projectPath;

  const localCommit = useMemo(
    () => ({
      busy: localBusy,
      onNotice: showNotice,
      onStage: async (paths: string[]) => {
        setLocalBusy(true);
        try {
          const res = await codeApi.git
            .stage(localRoot, paths)
            .catch((e: any) => ({ error: e?.message || String(e) }));
          showNotice(
            res?.error ? String(res.error).split('\n')[0] : `Staged ${paths.length} files`,
          );
          await refresh();
        } finally {
          setLocalBusy(false);
        }
      },
      onCommit: async (message: string) => {
        setLocalBusy(true);
        try {
          const res = await codeApi.git
            .commit(localRoot, message)
            .catch((e: any) => ({ error: e?.message || String(e) }));
          const failed = !!res?.error;
          showNotice(failed ? String(res.error).split('\n')[0] : 'Committed');
          if (!failed) await refresh();
          return !failed;
        } finally {
          setLocalBusy(false);
        }
      },
    }),
    [localBusy, localRoot, refresh, showNotice],
  );

  const confirmPendingOp = useCallback(() => {
    if (!pendingOp) return;
    const { action, file: f } = pendingOp;
    if (action === 'stage')
      void runFileOp('git:stage', [f.path], `Staged ${f.path}`, undefined, localRoot);
    else if (action === 'unstage')
      void runFileOp('git:unstage', [f.path], `Unstaged ${f.path}`, undefined, localRoot);
    else
      void runFileOp(
        'git:discard',
        [f.path],
        `Discarded ${f.path}`,
        {
          untracked: !!f.untracked,
          staged: !f.untracked && !!f.staged,
        },
        localRoot,
      );
  }, [pendingOp, runFileOp, localRoot]);

  const [commitMenu, setCommitMenu] = useState<{
    commit: Commit;
    pos: { top: number; left: number };
  } | null>(null);

  const openCommitMenu = useCallback((e: React.MouseEvent, commit: Commit) => {
    e.preventDefault();
    setSelectedHash(commit.hash);
    setCommitMenu({ commit, pos: { top: e.clientY, left: e.clientX } });
  }, []);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const keyOf = (it: (typeof navItems)[number]) =>
      it.kind === 'commit' ? it.commit.hash : VIRTUAL_PREFIX + it.change.name;
    const idx = navItems.findIndex((it) => keyOf(it) === selectedHash);
    const next = navItems[e.key === 'ArrowDown' ? idx + 1 : idx - 1];
    if (next) selectHash(keyOf(next));
  };

  if (!projectPath) {
    return (
      <div className={'flex-1 flex items-center justify-center text-sm text-text-secondary/40'}>
        No project selected
      </div>
    );
  }

  return (
    <div className={'relative flex-1 flex min-h-0 bg-background'}>
      <BranchSidebar
        title={projectName}
        local={localBranches}
        remote={remoteBranches}
        tags={tags}
        current={currentBranch}
        selected={activeBranch ?? currentBranch}
        busy={busyBranch}
        onJump={(n) => void jumpToBranch(n)}
        onCheckout={(n) => void handleCheckout(n)}
      />

      {diffOpen && (selected || selectedVirtual) ? (
        <DiffView
          projectPath={projectPath}
          hash={selected?.hash}
          localBranch={selectedVirtual?.name ?? null}
          branchRoot={
            selectedVirtual
              ? (cloneBranchPaths[selectedVirtual.name] ??
                worktreePaths[selectedVirtual.name] ??
                (selectedVirtual.name === currentBranch ? projectPath : undefined))
              : undefined
          }
          file={
            (selectedVirtual ? selectedVirtual.files : files).find((f) => f.path === activeFile) ??
            null
          }
          actions={fileActions}
          activePath={activeFile}
          onClose={closeDiff}
        />
      ) : (
        <section className={'flex-1 min-w-0 flex flex-col'}>
          {/* ── Toolbar ── */}
          <div
            className={
              'h-11 shrink-0 px-4 flex items-center gap-3 border-b border-border bg-gradient-to-b from-card-background/40 to-transparent'
            }
          >
            <span className={'text-[13px] font-semibold text-text-primary'}>Graph</span>

            <div className={'ml-auto flex items-center gap-2'}>
              <div
                className={
                  'flex items-center gap-2 w-[320px] h-8 px-2.5 rounded-lg bg-input-background'
                }
              >
                <Search className={'w-3.5 h-3.5 shrink-0 text-text-secondary/60'} />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setQuery('');
                      e.currentTarget.blur();
                    }
                  }}
                  placeholder={'Search message, author, hash, branch'}
                  className={
                    'flex-1 min-w-0 bg-transparent text-xs text-text-primary placeholder:text-text-secondary/50 focus:outline-none'
                  }
                />
                {query ? (
                  <>
                    <span className={'shrink-0 font-mono text-[10.5px] text-text-secondary'}>
                      {`${matchSet?.size ?? 0}/${commits.length}`}
                    </span>
                    <button
                      onClick={() => setQuery('')}
                      className={
                        'shrink-0 w-4 h-4 rounded flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-card-hover cursor-pointer'
                      }
                    >
                      <X className={'w-3 h-3'} />
                    </button>
                  </>
                ) : (
                  <kbd
                    className={
                      'shrink-0 px-1.5 h-[18px] rounded bg-text-secondary/10 flex items-center font-mono text-[10px] text-text-secondary/70'
                    }
                  >
                    Ctrl F
                  </kbd>
                )}
              </div>
              <button
                onClick={() => void refresh()}
                disabled={loading}
                title={'Refresh'}
                className={
                  'w-8 h-8 rounded-lg flex items-center justify-center bg-card-background text-text-secondary hover:text-text-primary transition-colors cursor-pointer disabled:cursor-not-allowed'
                }
              >
                {loading ? (
                  <Loader2 className={'w-3.5 h-3.5 animate-spin'} />
                ) : (
                  <RefreshCw className={'w-3.5 h-3.5'} />
                )}
              </button>
            </div>
          </div>

          <>
            {/* ── Column header ── */}
            <div
              className={
                'h-9 shrink-0 flex items-center border-b border-border text-[10px] font-semibold uppercase tracking-wider text-text-secondary/50'
              }
            >
              <span className={'w-[200px] shrink-0 pr-2 text-right'}>Branch / Tag</span>
              <span style={{ width: graphWidth }} className={'shrink-0 pl-2'}>
                Graph
              </span>
              <span className={'flex-1 pl-2'}>Commit message</span>
              <span className={'w-[130px] shrink-0 px-2'}>Author</span>
              <span className={'w-[62px] shrink-0'}>Sha</span>
              <span className={'w-[76px] shrink-0 pr-4 text-right'}>Date</span>
            </div>

            {/* ── Graph list ── */}
            {error ? (
              <div className={'flex-1 min-h-0'}>
                <EmptyState icon={AlertCircle} text={'Cannot load commits'} desc={error} />
              </div>
            ) : commits.length === 0 && !loading ? (
              <div className={'flex-1 min-h-0'}>
                <EmptyState
                  icon={GitCommit}
                  text={'No commits yet'}
                  desc={'Commits will appear here once you make your first commit.'}
                />
              </div>
            ) : (
              <div
                tabIndex={0}
                onKeyDown={handleKeyDown}
                className={'flex-1 overflow-y-auto outline-none'}
              >
                {items.map((it) =>
                  it.kind === 'branch' ? (
                    <BranchRow
                      key={`branch:${it.hash}`}
                      hash={it.hash}
                      names={it.names}
                      col={it.row.col}
                      lines={[...it.row.incoming, ...it.row.passThrough]}
                      graphWidth={graphWidth}
                      dimmed={matchSet !== null && !matchSet.has(it.hash)}
                      onSelect={selectHash}
                    />
                  ) : it.kind === 'commit' ? (
                    <CommitRow
                      key={it.commit.hash}
                      commit={it.commit}
                      row={it.row}
                      laneCount={laneCount}
                      graphWidth={graphWidth}
                      selected={it.commit.hash === selectedHash}
                      dimmed={matchSet !== null && !matchSet.has(it.commit.hash)}
                      hideLocals={[
                        ...(virtualNamesByHash.get(it.commit.hash) ?? []),
                        ...(branchRowsByHash.get(it.commit.hash) ?? []),
                      ]}
                      unpushed={unpushedHashes.has(it.commit.hash)}
                      pushing={pushing}
                      onPush={handlePush}
                      onSelect={selectHash}
                      onContextMenu={openCommitMenu}
                      onHover={handleHover}
                    />
                  ) : (
                    <VirtualRow
                      key={VIRTUAL_PREFIX + it.change.name}
                      branch={it.change.name}
                      unstagedCount={
                        it.change.files.filter((f) => f.unstaged || f.untracked).length
                      }
                      stagedCount={it.change.files.filter((f) => f.staged).length}
                      unpushedCount={
                        cloneUnpushed[it.change.name]
                          ? cloneUnpushed[it.change.name].length
                          : it.change.name === currentBranch
                            ? unpushedHashes.size
                            : 0
                      }
                      col={it.row.col}
                      lines={[...it.row.incoming, ...it.row.passThrough]}
                      graphWidth={graphWidth}
                      selected={VIRTUAL_PREFIX + it.change.name === selectedHash}
                      dimmed={
                        matchSet !== null &&
                        !it.change.name.toLowerCase().includes(query.trim().toLowerCase())
                      }
                      onSelect={selectHash}
                    />
                  ),
                )}
              </div>
            )}
          </>
        </section>
      )}

      {notice && (
        <div
          className={
            'absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-3 py-2 rounded-lg border border-border bg-card-background text-xs text-text-primary shadow-lg'
          }
        >
          {notice}
        </div>
      )}

      {hover && !commitMenu && (
        <div
          style={{ top: hover.y + 14, left: Math.min(hover.x + 14, window.innerWidth - 380) }}
          className={
            'fixed z-50 max-w-[360px] pointer-events-none px-3 py-2 rounded-lg border border-border bg-card-background shadow-lg'
          }
        >
          <div className={'text-xs font-medium text-text-primary break-words'}>{hover.title}</div>
          {hover.lines.map((l) => (
            <div key={l} className={'mt-0.5 text-[11px] text-text-secondary break-words'}>
              {l}
            </div>
          ))}
        </div>
      )}

      {commitMenu && (
        <CommitContextMenu
          key={commitMenu.commit.hash}
          commit={commitMenu.commit}
          projectPath={projectPath}
          position={commitMenu.pos}
          onClose={() => setCommitMenu(null)}
          onNotice={showNotice}
          onApplyToBranch={setSyncCommit}
        />
      )}

      <SyncBranchModal
        isOpen={!!syncCommit}
        onClose={() => setSyncCommit(null)}
        targetPath={projectPath}
        projectName={projectName}
        currentBranch={currentBranch ?? ''}
        branches={localBranches}
        fixedSource={
          syncCommit ? { ref: syncCommit.hash, label: syncSourceLabel(syncCommit) } : undefined
        }
        targets={syncTargets}
        onApplied={(count, source) => {
          showNotice(`Applied ${count} file${count === 1 ? '' : 's'} from ${source}`);
          void refresh();
        }}
      />

      <ConfirmFileChangeModal
        isOpen={!!pendingOp}
        action={pendingOp?.action ?? 'discard'}
        fileName={pendingOp?.file.path ?? ''}
        onClose={() => setPendingOp(null)}
        onConfirm={confirmPendingOp}
      />

      <CommitDetail
        commit={selected}
        files={selectedVirtual ? selectedVirtual.files : files}
        loading={selectedVirtual ? false : filesLoading}
        localBranch={selectedVirtual?.name ?? null}
        selectedFile={diffOpen ? activeFile : null}
        projectPath={projectPath}
        defaultBranch={defaultBranch}
        fileActions={fileActions}
        unpushedCommits={
          selectedVirtual
            ? (cloneUnpushed[selectedVirtual.name] ??
              (selectedVirtual.name === currentBranch
                ? commits.filter((c) => unpushedHashes.has(c.hash))
                : undefined))
            : undefined
        }
        unpushedRoot={localRoot}
        onPush={() => handlePush(localRoot)}
        pushing={pushing}
        localCommit={selectedVirtual ? localCommit : undefined}
        onSelectFile={openDiff}
      />
    </div>
  );
});

GitView.displayName = 'GitView';

export default GitView;
