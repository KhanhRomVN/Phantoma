// ─── Imports ────────────────────────────────────────────────────────────
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, GitCommit, Loader2, RefreshCw, Search, X } from 'lucide-react';

import { useCodeStore } from '../../../shared/stores/code.store';
import { BranchSidebar } from './BranchSidebar';
import { CommitContextMenu } from './CommitContextMenu';
import { ExportCommitModal } from './modals/ExportCommitModal';
import { SyncBranchModal } from './modals/SyncBranchModal';
import { CommitDetail } from './CommitDetail';
import { EmptyState } from './EmptyState';
import { DiffView } from './DiffView';
import { ConfirmFileChangeModal } from './modals/ConfirmFileChangeModal';
import type { Commit } from '../utils/graph.util';
import { VIRTUAL_PREFIX } from '../constants/git-view.constants';
import { VirtualRow } from './graph/VirtualRow';
import { CommitRow } from './graph/CommitRow';
import {
  useGitData,
  useGitSelection,
  useGitGraph,
  useGitActions,
  useGitUI,
  useGitBranches,
  useGitLocalCommit,
} from '../hooks';
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

  const [syncCommit, setSyncCommit] = useState<Commit | null>(null);
  const [exportCommit, setExportCommit] = useState<Commit | null>(null);

  // Use hooks
  const {
    commits,
    branches,
    tags,
    worktreePaths,
    localChanges,
    loading,
    error,
    defaultBranch,
    unpushedHashes,
    cloneUnpushed,
    refresh,
  } = useGitData({ projectPath, projectBranches });

  const {
    selectedHash,
    files,
    filesLoading,
    activeFile,
    diffOpen,
    setSelectedHash,
    openDiff,
    closeDiff,
  } = useGitSelection({ projectPath });

  const { query, setQuery, showNotice, hover, handleHover, matchSet, searchRef } =
    useGitUI({ commits });

  const mainTip = useMemo(() => {
    if (!defaultBranch) return null;
    const names = [defaultBranch, `HEAD -> ${defaultBranch}`, `origin/${defaultBranch}`];
    return commits.find((c) => c.refs.some((r) => names.includes(r)))?.hash ?? null;
  }, [commits, defaultBranch]);

  const { items, graphWidth, laneCount, allVirtualNames } = useGitGraph({
    commits,
    localChanges,
    mainTip,
  });

  const navItems = useMemo(() => items, [items]);

  const selected = commits.find((c) => c.hash === selectedHash) ?? null;
  const selectedVirtual =
    localChanges.find((lc) => VIRTUAL_PREFIX + lc.name === selectedHash) ?? null;

  const selectHash = useCallback((hash: string, block: ScrollLogicalPosition = 'nearest') => {
    setSelectedHash(hash);
    document.getElementById(`git-row-${hash}`)?.scrollIntoView({ block });
  }, [setSelectedHash]);

  const {
    currentBranch,
    cloneBranchPaths,
    localBranches,
    remoteBranches,
    syncTargets,
    syncSourceLabel,
  } = useGitBranches({
    branches,
    commits,
    projectBranches,
    projectPath,
    worktreePaths,
    activeBranch: null,
    currentBranch: null,
  });

  const {
    busyBranch,
    pushing,
    activeBranch,
    jumpToBranch,
    handleCheckout,
    handlePush,
    runFileOp,
  } = useGitActions({
    projectPath,
    commits,
    localChanges,
    cloneBranchPaths,
    refresh,
    showNotice,
    selectHash,
  });

  useEffect(() => {
    if (navItems.length === 0) return;
    const keyOf = (it: (typeof navItems)[number]) =>
      it.kind === 'commit' ? it.commit.hash : VIRTUAL_PREFIX + it.change.name;
    if (selectedHash && navItems.some((it) => keyOf(it) === selectedHash)) return;
    setSelectedHash(keyOf(navItems[0]));
  }, [navItems, selectedHash]);



  const localRoot = selectedVirtual
    ? (cloneBranchPaths[selectedVirtual.name] ?? worktreePaths[selectedVirtual.name] ?? projectPath)
    : projectPath;

  const { pendingOp, setPendingOp, fileActions, localCommit, confirmPendingOp } =
    useGitLocalCommit({
      localRoot,
      selectedVirtual,
      refresh,
      showNotice,
      runFileOp,
    });

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
                  it.kind === 'commit' ? (
                    <CommitRow
                      key={it.commit.hash}
                      commit={it.commit}
                      row={it.row}
                      laneCount={laneCount}
                      graphWidth={graphWidth}
                      selected={it.commit.hash === selectedHash}
                      dimmed={matchSet !== null && !matchSet.has(it.commit.hash)}
                      hideLocals={[...allVirtualNames]}
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
                      col={it.col}
                      hangCol={it.hangCol}
                      hangFull={it.hangFull}
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
          onExportSource={setExportCommit}
        />
      )}

      <ExportCommitModal
        isOpen={!!exportCommit}
        onClose={() => setExportCommit(null)}
        projectPath={projectPath}
        commit={exportCommit}
        onDone={showNotice}
      />

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
          showNotice('Applied files', 'success', `${count} file${count === 1 ? '' : 's'} from ${source}`);
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
