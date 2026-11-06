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
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, GitCommit, Search, X } from 'lucide-react';

import { cn } from '@renderer/utils/cn';
import { useCodeStore } from '../../../hooks/useCodeStore';
import { BranchSidebar } from './BranchSidebar';
import { CommitContextMenu } from './CommitContextMenu';
import { SyncBranchModal } from '../../modal/SyncBranchModal';
import { CommitDetail } from './CommitDetail';
import { DiffView } from './DiffView';
import {
  ConfirmFileChangeModal,
  type FileChangeAction,
} from '../../modal/ConfirmFileChangeModal';
import { GraphCell, RefPill } from './GraphCell';
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
} from './graph';

// ─── Virtual Row (local changes not on remote) ──────────────────────────
interface LocalChange {
  name: string;
  files: CommitFile[];
}

const VIRTUAL_PREFIX = 'virtual:';

interface VirtualRowProps {
  branch: string;
  fileCount: number;
  col: number;
  lines: number[];
  graphWidth: number;
  selected: boolean;
  dimmed: boolean;
  onSelect: (key: string) => void;
}

const VirtualRow = memo(function VirtualRow({
  branch,
  fileCount,
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
        background: selected
          ? `color-mix(in srgb, ${color} 20%, transparent)`
          : `linear-gradient(90deg, color-mix(in srgb, ${color} 7%, transparent), transparent 55%)`,
      }}
      className={cn(
        'flex items-center shrink-0 cursor-pointer transition-colors hover:brightness-125',
        dimmed && 'opacity-30',
      )}
    >
      <div className={'w-[200px] shrink-0 flex items-center justify-end gap-1 pl-3 pr-2 overflow-hidden'}>
        <RefPill chip={{ label: branch, kind: 'local' }} />
      </div>

      <div style={{ width: graphWidth }} className={'shrink-0 overflow-hidden'}>
        <svg width={graphWidth} height={ROW_HEIGHT}>
          {lines
            .filter((l) => l !== col)
            .map((l) => (
              <line key={l} x1={laneX(l)} x2={laneX(l)} y1={0} y2={ROW_HEIGHT} stroke={laneColor(l)} strokeWidth={2} />
            ))}
          <line x1={x} x2={x} y1={mid} y2={ROW_HEIGHT} stroke={color} strokeWidth={2} strokeDasharray={'3 3'} />
          <circle cx={x} cy={mid} r={7} fill={'none'} stroke={color} strokeWidth={2} strokeDasharray={'3 3'} />
        </svg>
      </div>

      <span className={'flex-1 min-w-0 truncate pl-2 text-[12.5px] italic text-text-secondary'}>
        {`Local changes not on remote · ${fileCount} files`}
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
  onSelect: (hash: string) => void;
  onContextMenu: (e: React.MouseEvent, commit: Commit) => void;
}

const CommitRow = memo(function CommitRow({
  commit,
  row,
  laneCount,
  graphWidth,
  selected,
  dimmed,
  onSelect,
  onContextMenu,
}: CommitRowProps) {
  const color = laneColor(row.col);
  const chips = parseRefs(commit.refs);
  const shown = chips.slice(0, 2);
  const extra = chips.length - shown.length;
  const isMerge = commit.parents.length > 1;
  const isHead = commit.refs.some((r) => r.startsWith('HEAD'));

  return (
    <div
      id={`git-row-${commit.hash}`}
      onClick={() => onSelect(commit.hash)}
      onContextMenu={(e) => onContextMenu(e, commit)}
      style={{
        height: ROW_HEIGHT,
        background: selected
          ? `color-mix(in srgb, ${color} 20%, transparent)`
          : `linear-gradient(90deg, color-mix(in srgb, ${color} 7%, transparent), transparent 55%)`,
      }}
      className={cn(
        'flex items-center shrink-0 cursor-pointer transition-colors hover:brightness-125',
        dimmed && 'opacity-30',
      )}
    >
      <div className={'w-[200px] shrink-0 flex items-center justify-end gap-1 pl-3 pr-2 overflow-hidden'}>
        {shown.map((c) => (
          <RefPill key={c.kind + c.label} chip={c} color={color} />
        ))}
        {extra > 0 && (
          <span className={'font-mono text-[10px] text-text-secondary/60 shrink-0'}>{`+${extra}`}</span>
        )}
      </div>

      <div style={{ width: graphWidth }} className={'shrink-0 overflow-hidden'}>
        <GraphCell
          row={row}
          laneCount={laneCount}
          author={commit.author}
          email={commit.email}
          isMerge={isMerge}
          isHead={isHead}
        />
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
      <span className={'w-[130px] shrink-0 truncate px-2 text-[11.5px] text-text-secondary'}>
        {commit.author}
      </span>
      <span className={'w-[62px] shrink-0 font-mono text-[10.5px] text-text-secondary/50'}>
        {commit.hash.slice(0, 7)}
      </span>
      <span className={'w-[76px] shrink-0 pr-4 text-right font-mono text-[10.5px] text-text-secondary/60'}>
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

  useEffect(() => {
    setActiveFile(null);
    if (!selectedHash) setDiffOpen(false);
  }, [selectedHash]);

  const openDiff = useCallback((path: string) => {
    setActiveFile(path);
    setDiffOpen(true);
  }, []);

  const closeDiff = useCallback(() => setDiffOpen(false), []);

  const refresh = useCallback(async () => {
    if (!projectPath) return;
    setLoading(true);
    setError(null);
    try {
      const [logRes, branchRes, changeRes, tagRes] = await Promise.all([
        window.api.invoke('git:log', projectPath, 300),
        window.api.invoke('git:list-branches', projectPath),
        window.api.invoke('git:local-changes', projectPath),
        window.api.invoke('git:list-tags', projectPath),
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
  }, [projectPath]);

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
    window.api
      .invoke('git:commit-files', projectPath, selectedHash)
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

  const { rows, laneCount } = useMemo(() => buildGraph(commits), [commits]);
  const graphWidth = Math.min(Math.max(laneCount * LANE_WIDTH + 16, 72), 260);
  const selected = commits.find((c) => c.hash === selectedHash) ?? null;
  const selectedVirtual = localChanges.find((lc) => VIRTUAL_PREFIX + lc.name === selectedHash) ?? null;

  const virtualByHash = useMemo(() => {
    const map = new Map<string, LocalChange[]>();
    localChanges.forEach((lc) => {
      const tip = commits.find((c) => c.refs.some((r) => r === lc.name || r === `HEAD -> ${lc.name}`));
      if (!tip) return;
      map.set(tip.hash, [...(map.get(tip.hash) ?? []), lc]);
    });
    return map;
  }, [commits, localChanges]);

  const items = useMemo(() => {
    const list: (
      | { kind: 'commit'; commit: Commit; row: GraphRow }
      | { kind: 'virtual'; change: LocalChange; row: GraphRow }
    )[] = [];
    commits.forEach((c, idx) => {
      (virtualByHash.get(c.hash) ?? []).forEach((change) =>
        list.push({ kind: 'virtual', change, row: rows[idx] }),
      );
      list.push({ kind: 'commit', commit: c, row: rows[idx] });
    });
    return list;
  }, [commits, rows, virtualByHash]);

  useEffect(() => {
    if (items.length === 0) return;
    const keyOf = (it: (typeof items)[number]) =>
      it.kind === 'commit' ? it.commit.hash : VIRTUAL_PREFIX + it.change.name;
    if (selectedHash && items.some((it) => keyOf(it) === selectedHash)) return;
    setSelectedHash(keyOf(items[0]));
  }, [items, selectedHash]);

  const currentBranch = useMemo(() => {
    for (const c of commits) {
      const ref = c.refs.find((r) => r.startsWith('HEAD -> '));
      if (ref) return ref.slice(8);
    }
    return null;
  }, [commits]);

  const validBranches = useMemo(
    () => branches.filter((b) => b !== 'origin' && !b.endsWith('/HEAD')),
    [branches],
  );
  const localBranches = useMemo(() => validBranches.filter((b) => !b.startsWith('origin/')), [validBranches]);
  const remoteBranches = useMemo(() => validBranches.filter((b) => b.startsWith('origin/')), [validBranches]);

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
    Object.entries(worktreePaths).forEach(([name, path]) => list.push({ name, path }));
    return list;
  }, [currentBranch, projectPath, worktreePaths]);

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
        const res = await window.api.invoke('git:resolve-ref', projectPath, name);
        if (res?.error || !res?.hash) {
          showNotice(`Cannot resolve "${name}"`);
          return;
        }
        if (commits.some((c) => c.hash === res.hash)) {
          selectHash(res.hash, 'center');
          setActiveBranch(name);
        } else {
          showNotice(`Tip of "${name}" (${res.hash.slice(0, 7)}) is outside the loaded 300 commits`);
        }
      } finally {
        setBusyBranch(null);
      }
    },
    [commits, localChanges, projectPath, selectHash, showNotice],
  );

  const handleCheckout = useCallback(
    async (name: string) => {
      setBusyBranch(name);
      try {
        const res = await window.api.invoke('git:checkout', projectPath, name);
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

  const runFileOp = useCallback(
    async (channel: string, payload: unknown, okMsg: string, opts?: unknown) => {
      const res = await window.api.invoke(
        channel,
        projectPath,
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
    [selectedVirtual],
  );

  const confirmPendingOp = useCallback(() => {
    if (!pendingOp) return;
    const { action, file: f } = pendingOp;
    if (action === 'stage') void runFileOp('git:stage', [f.path], `Staged ${f.path}`);
    else if (action === 'unstage') void runFileOp('git:unstage', [f.path], `Unstaged ${f.path}`);
    else
      void runFileOp('git:discard', [f.path], `Discarded ${f.path}`, {
        untracked: !!f.untracked,
        staged: !f.untracked && !!f.staged,
      });
  }, [pendingOp, runFileOp]);

  const [commitMenu, setCommitMenu] = useState<{
    commit: Commit;
    pos: { top: number; left: number };
  } | null>(null);

  const openCommitMenu = useCallback((e: React.MouseEvent, commit: Commit) => {
    e.preventDefault();
    setSelectedHash(commit.hash);
    setCommitMenu({ commit, pos: { top: e.clientY, left: e.clientX } });
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const keyOf = (it: (typeof items)[number]) =>
      it.kind === 'commit' ? it.commit.hash : VIRTUAL_PREFIX + it.change.name;
    const idx = items.findIndex((it) => keyOf(it) === selectedHash);
    const next = items[e.key === 'ArrowDown' ? idx + 1 : idx - 1];
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
          subject={selected?.subject ?? 'Local changes not on remote'}
          activePath={activeFile}
          onClose={closeDiff}
        />
      ) : (
      <section className={'flex-1 min-w-0 flex flex-col'}>
        {/* ── Toolbar ── */}
        <div className={'h-11 shrink-0 px-4 flex items-center gap-3 border-b border-border'}>


          <div className={'relative ml-auto w-[260px]'}>
            <Search className={'absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary/60 pointer-events-none'} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={'Search message, author, hash, branch...'}
              className={'w-full pl-7 pr-7 h-7 text-xs bg-input-background border border-border rounded-md text-text-primary placeholder:text-text-secondary/50 focus:outline-none'}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className={'absolute right-1.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary cursor-pointer'}
              >
                <X className={'w-3.5 h-3.5'} />
              </button>
            )}
          </div>


        </div>

        {/* ── Column header ── */}
        <div className={'h-7 shrink-0 flex items-center border-b border-border text-[10px] font-semibold uppercase tracking-wider text-text-secondary/50'}>
          <span className={'w-[200px] shrink-0 pr-2 text-right'}>Branch / Tag</span>
          <span style={{ width: graphWidth }} className={'shrink-0 pl-2'}>Graph</span>
          <span className={'flex-1 pl-2'}>Commit message</span>
          <span className={'w-[130px] shrink-0 px-2'}>Author</span>
          <span className={'w-[62px] shrink-0'}>Sha</span>
          <span className={'w-[76px] shrink-0 pr-4 text-right'}>Date</span>
        </div>

        {/* ── Graph list ── */}
        {error ? (
          <div className={'flex-1 flex flex-col items-center justify-center gap-2 text-text-secondary/60 text-xs'}>
            <AlertCircle className={'w-5 h-5'} />
            {error}
          </div>
        ) : commits.length === 0 && !loading ? (
          <div className={'flex-1 flex flex-col items-center justify-center gap-2 text-text-secondary/40 text-xs'}>
            <GitCommit className={'w-8 h-8'} strokeWidth={1.2} />
            No commits yet
          </div>
        ) : (
          <div tabIndex={0} onKeyDown={handleKeyDown} className={'flex-1 overflow-y-auto outline-none'}>
            {items.map((it) =>
              it.kind === 'commit' ? (
                <CommitRow
                  key={it.commit.hash}
                  commit={it.commit}
                  row={it.row}
                  laneCount={laneCount}
                  graphWidth={graphWidth}
                  selected={it.commit.hash === selectedHash}
                  dimmed={matchSet !== null && !matchSet.has(it.commit.hash)}
                  onSelect={selectHash}
                  onContextMenu={openCommitMenu}
                />
              ) : (
                <VirtualRow
                  key={VIRTUAL_PREFIX + it.change.name}
                  branch={it.change.name}
                  fileCount={it.change.files.length}
                  col={it.row.col}
                  lines={[...it.row.incoming, ...it.row.passThrough]}
                  graphWidth={graphWidth}
                  selected={VIRTUAL_PREFIX + it.change.name === selectedHash}
                  dimmed={matchSet !== null && !it.change.name.toLowerCase().includes(query.trim().toLowerCase())}
                  onSelect={selectHash}
                />
              ),
            )}
          </div>
        )}
      </section>
      )}

      {notice && (
        <div className={'absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-3 py-2 rounded-lg border border-border bg-card-background text-xs text-text-primary shadow-lg'}>
          {notice}
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
        fileActions={fileActions}
        onSelectFile={openDiff}
      />
    </div>
  );
});

GitView.displayName = 'GitView';

export default GitView;