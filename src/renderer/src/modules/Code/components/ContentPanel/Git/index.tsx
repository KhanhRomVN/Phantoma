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
import { AlertCircle, GitBranch, GitCommit, Loader2, RefreshCw, Search, X } from 'lucide-react';

import { cn } from '@renderer/shared/utils/cn';
import { useCodeStore } from '../../../hooks/useCodeStore';
import { BranchSidebar } from './BranchSidebar';
import { CommitDetail } from './CommitDetail';
import { DiffView } from './DiffView';
import { GraphCell, RefPill } from './GraphCell';
import {
  ROW_HEIGHT,
  LANE_WIDTH,
  buildGraph,
  formatRelative,
  laneColor,
  parseRefs,
  type Commit,
  type CommitFile,
  type GraphRow,
} from './graph';

// ─── Commit Row ─────────────────────────────────────────────────────────
interface CommitRowProps {
  commit: Commit;
  row: GraphRow;
  laneCount: number;
  graphWidth: number;
  selected: boolean;
  dimmed: boolean;
  onSelect: (hash: string) => void;
}

const CommitRow = memo(function CommitRow({
  commit,
  row,
  laneCount,
  graphWidth,
  selected,
  dimmed,
  onSelect,
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
          <RefPill key={c.kind + c.label} chip={c} />
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
      const [logRes, branchRes] = await Promise.all([
        window.api.invoke('git:log', projectPath, 300),
        window.api.invoke('git:list-branches', projectPath),
      ]);
      if (logRes?.error) {
        setError(logRes.error);
        setCommits([]);
      } else {
        const list: Commit[] = logRes?.commits ?? [];
        setCommits(list);
        setSelectedHash((prev) => prev ?? list[0]?.hash ?? null);
      }
      setBranches(branchRes?.branches ?? []);
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
    if (!selectedHash || !projectPath) {
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
    document.getElementById(`git-row-${hash}`)?.scrollIntoView({ block });
  }, []);

  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  }, []);

  const jumpToBranch = useCallback(
    async (name: string) => {
      setBusyBranch(name);
      try {
        const res = await window.api.invoke('git:resolve-ref', projectPath, name);
        if (res?.error || !res?.hash) {
          showNotice(`Cannot resolve "${name}"`);
          return;
        }
        if (commits.some((c) => c.hash === res.hash)) {
          selectHash(res.hash, 'center');
        } else {
          showNotice(`Tip of "${name}" (${res.hash.slice(0, 7)}) is outside the loaded 300 commits`);
        }
      } finally {
        setBusyBranch(null);
      }
    },
    [commits, projectPath, selectHash, showNotice],
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const idx = commits.findIndex((c) => c.hash === selectedHash);
    const next = commits[e.key === 'ArrowDown' ? idx + 1 : idx - 1];
    if (next) selectHash(next.hash);
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
        local={localBranches}
        remote={remoteBranches}
        current={currentBranch}
        busy={busyBranch}
        onJump={(n) => void jumpToBranch(n)}
        onCheckout={(n) => void handleCheckout(n)}
      />

      {diffOpen && selected ? (
        <DiffView
          projectPath={projectPath}
          hash={selected.hash}
          subject={selected.subject}
          activePath={activeFile}
          onClose={closeDiff}
        />
      ) : (
      <section className={'flex-1 min-w-0 flex flex-col'}>
        {/* ── Toolbar ── */}
        <div className={'h-11 shrink-0 px-4 flex items-center gap-3 border-b border-border'}>
          <GitCommit className={'w-4 h-4 text-text-secondary'} />
          <span className={'text-[13px] font-semibold text-text-primary truncate'}>{projectName}</span>
          {currentBranch && (
            <span className={'inline-flex items-center gap-1 h-[22px] px-2 rounded-md bg-primary/15 text-primary border border-primary/30 font-mono text-[11px]'}>
              <GitBranch className={'w-3 h-3'} />
              {currentBranch}
            </span>
          )}

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

          <span className={'font-mono text-[11px] text-text-secondary/60 shrink-0'}>
            {matchSet ? `${matchSet.size} / ${commits.length}` : `${commits.length} commits`}
          </span>
          <button
            onClick={() => void refresh()}
            title={'Refresh'}
            className={'w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors cursor-pointer'}
          >
            {loading ? (
              <Loader2 className={'w-3.5 h-3.5 animate-spin'} />
            ) : (
              <RefreshCw className={'w-3.5 h-3.5'} />
            )}
          </button>
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
            {commits.map((c, idx) => (
              <CommitRow
                key={c.hash}
                commit={c}
                row={rows[idx]}
                laneCount={laneCount}
                graphWidth={graphWidth}
                selected={c.hash === selectedHash}
                dimmed={matchSet !== null && !matchSet.has(c.hash)}
                onSelect={selectHash}
              />
            ))}
          </div>
        )}
      </section>
      )}

      {notice && (
        <div className={'absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-3 py-2 rounded-lg border border-border bg-card-background text-xs text-text-primary shadow-lg'}>
          {notice}
        </div>
      )}

      <CommitDetail
        commit={selected}
        files={files}
        loading={filesLoading}
        selectedFile={diffOpen ? activeFile : null}
        onSelectHash={(h) => selectHash(h, 'center')}
        onSelectFile={openDiff}
      />
    </div>
  );
});

GitView.displayName = 'GitView';

export default GitView;