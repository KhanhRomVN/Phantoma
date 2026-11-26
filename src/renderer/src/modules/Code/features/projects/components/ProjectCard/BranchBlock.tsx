import { memo, useMemo, useState } from 'react';
import { useCodeStore } from '../../../../shared/stores/code.store';
import { codeApi } from '../../../../shared/api/code.api';
import { taskService, type StoredTask } from '../../../../shared/services/task.service';
import { GitBranch, Plus } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { SessionCard } from '../SessionCard/SessionCard';
import { getNewestSession } from '../../utils/session.util';
import { TASK_COLORS } from '../../constants/session.constants';
import { type BranchInfo, type TaskStatus } from '../../types/session.types';
import { ProjectExtended } from '../../types/project-card.types';
import { KebabButton } from './KebabButton';
import {
  DefaultBadge,
  NO_BRANCH_NAME,
  NO_GIT_NAME,
  TempBranchBadge,
  BusyBadge,
  RemoteGoneBadge,
} from './badges';
import { BranchScopeButton } from './BranchScopeButton';
import { ProjectCardProps } from '../../types/project-card.types';

/** Branch block inside expanded project */
export const BranchBlock = memo(function BranchBlock({
  project,
  branch,
  selectedSessionId,
  onSelectSession,
  onOpenDropdown,
  onOpenTaskMenu,
  onNewSession,
  onProcessInteract,
  onSessionContextMenu,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  busyElsewhere = false,
  onFocusElsewhere,
  onReleaseElsewhere,
  projectTasks,
  onOpenTaskStatusModal,
}: {
  project: ProjectExtended;
  branch: BranchInfo;
  selectedSessionId: string | null;
  onSelectSession: (id: string) => void;
  onOpenDropdown: ProjectCardProps['onOpenDropdown'];
  onOpenTaskMenu: ProjectCardProps['onOpenTaskMenu'];
  onNewSession: ProjectCardProps['onNewSession'];
  onProcessInteract: ProjectCardProps['onProcessInteract'];
  onSessionContextMenu?: ProjectCardProps['onSessionContextMenu'];
  onDragStart: ProjectCardProps['onDragStart'];
  onDragEnd: ProjectCardProps['onDragEnd'];
  onDragOver: ProjectCardProps['onDragOver'];
  onDrop: ProjectCardProps['onDrop'];
  busyElsewhere?: boolean;
  onFocusElsewhere?: ProjectCardProps['onFocusElsewhere'];
  onReleaseElsewhere?: ProjectCardProps['onReleaseElsewhere'];
  projectTasks?: StoredTask[];
  onOpenTaskStatusModal: (branchName: string) => void;
}) {
  const [gone, setGone] = useState<{ busy: boolean; error?: string }>({ busy: false });
  const newest = getNewestSession(branch);
  const busy = !!newest && ['running', 'queued', 'blocked', 'review'].includes(newest.status);

  // Calculate task counts for this specific branch
  const branchTaskCounts = useMemo(() => {
    const c: Record<TaskStatus, number> = { todo: 0, progress: 0, done: 0 };
    (projectTasks ?? []).forEach((t) => {
      if (!t.archived && t.branchName === branch.name) c[t.status]++;
    });
    return c;
  }, [projectTasks, branch.name]);

  const openAtCursor = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenDropdown('branch', project.id, branch.name, { top: e.clientY, left: e.clientX });
  };

  const isGone = !!branch.remoteGone && !!branch.path;

  const publishBranch = async () => {
    if (!branch.path) return;
    setGone({ busy: true });
    const res = await codeApi.git.publishBranch(branch.path).catch((e) => ({ error: String(e) }));
    if (res?.error) {
      setGone({ busy: false, error: res.error });
      return;
    }
    const state = useCodeStore.getState();
    const p = state.projects.find((x) => x.id === project.id);
    state.updateProject(project.id, {
      branches: (p?.branches ?? []).map((b) =>
        b.name === branch.name ? { ...b, remoteGone: false } : b,
      ),
    });
    setGone({ busy: false });
  };

  const deleteFolder = async () => {
    if (!branch.path) return;
    if (!window.confirm(`Delete folder ${branch.path} and all local changes? This cannot be undone.`)) return;
    setGone({ busy: true });
    const res = await codeApi.fs.removeDir(branch.path).catch((e) => ({ error: String(e) }));
    if (res && 'error' in res && res.error) {
      setGone({ busy: false, error: String(res.error) });
      return;
    }
    const state = useCodeStore.getState();
    const p = state.projects.find((x) => x.id === project.id);
    const unlinked = new Set<string>((p as any)?.unlinkedBranches ?? []);
    unlinked.add(branch.name);
    state.updateProject(project.id, {
      branches: (p?.branches ?? []).filter((b) => b.name !== branch.name),
      unlinkedBranches: Array.from(unlinked),
    } as any);
  };

  return (
    <div
      className="relative rounded-lg group/br [&:not(:last-child)]:pb-3"
      draggable
      data-pid={project.id}
      data-branch={branch.name}
      onDragStart={(e) => onDragStart(e, 'branch', project.id, branch.name)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Branch header */}
      <div
        className="flex items-center gap-1.5 px-0.5 py-1 font-mono text-[14px] font-medium text-text-secondary cursor-default"
        onContextMenu={openAtCursor}
      >
        <GitBranch className="w-[13px] h-[13px] shrink-0 text-text-secondary/70" />
        <span className="min-w-0 truncate">{branch.name}</span>

        {project.defaultBranch === branch.name && <DefaultBadge />}

        {(branch.name === NO_BRANCH_NAME || branch.name === NO_GIT_NAME) && (
                  <TempBranchBadge name={branch.name} />
                )}

        {isGone && <RemoteGoneBadge />}

        <span className="flex-1" />

        {/* Task status badge */}
        {(branchTaskCounts.todo > 0 || branchTaskCounts.progress > 0) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenTaskStatusModal(branch.name);
            }}
            className="flex items-center gap-1 px-1.5 h-[18px] rounded-md bg-card-hover hover:bg-card-hover/80 transition-colors cursor-pointer"
            title="View and link tasks"
          >
            {branchTaskCounts.todo > 0 && (
              <div className="flex items-center gap-0.5">
                <div
                  className="w-1.5 h-1.5 rounded-full border-[1.5px]"
                  style={{ borderColor: TASK_COLORS.todo }}
                />
                <span className="text-[10.5px] font-medium text-text-secondary">
                  {branchTaskCounts.todo}
                </span>
              </div>
            )}
            {branchTaskCounts.progress > 0 && (
              <div className="flex items-center gap-0.5">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: TASK_COLORS.progress }}
                />
                <span className="text-[10.5px] font-medium text-text-secondary">
                  {branchTaskCounts.progress}
                </span>
              </div>
            )}
          </button>
        )}

        {project.defaultBranch !== branch.name && (
          <BranchScopeButton projectId={project.id} branchName={branch.name} />
        )}

        {busyElsewhere && (
          <BusyBadge
            projectId={project.id}
            branchName={branch.name}
            onFocus={() => onFocusElsewhere?.(project.id, branch.name)}
            onRelease={() => onReleaseElsewhere?.(project.id, branch.name)}
          />
        )}

        {/* New session button — hidden if there's already a session */}
        {!newest && (
          <button
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              onNewSession(project.id, branch.name);
            }}
            className={cn(
              'h-5 min-w-[20px] px-1 rounded-[5px] flex items-center justify-center transition-colors',
              busy
                ? 'text-text-secondary/50 cursor-not-allowed'
                : 'text-text-secondary hover:text-text-primary hover:bg-card-hover cursor-pointer',
            )}
            title={busy ? 'This branch already has an active session' : 'New session'}
          >
            <Plus className="w-[11px] h-[11px]" />
          </button>
        )}

        <KebabButton onClick={openAtCursor} />
      </div>

      {isGone && (
        <div className="mb-1.5 rounded-lg px-2.5 py-2 bg-red-500/10 text-[11px] text-red-500 flex flex-col gap-1.5">
          <span>Remote branch was deleted. Local changes are still in this folder.</span>
          {gone.error && <span className="text-red-500/80 break-words">{gone.error}</span>}
          <div className="flex gap-1.5">
            <button
              disabled={gone.busy}
              onClick={publishBranch}
              className="h-5 px-2 rounded-[5px] bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30 disabled:opacity-50 cursor-pointer"
              title="Push local branch to create the remote branch (requires no uncommitted changes)"
            >
              Recreate remote
            </button>
            <button
              disabled={gone.busy}
              onClick={deleteFolder}
              className="h-5 px-2 rounded-[5px] bg-red-500/10 text-red-500 hover:bg-red-500/20 active:bg-red-500/30 disabled:opacity-50 cursor-pointer"
              title="Delete this folder from disk"
            >
              Delete folder
            </button>
          </div>
        </div>
      )}

      {/* Newest session card or empty state */}
      {newest ? (
        <SessionCard
          session={newest}
          selectedSessionId={selectedSessionId}
          onSelect={onSelectSession}
          onOpenTaskMenu={onOpenTaskMenu}
          onProcessInteract={onProcessInteract}
          onContextMenu={onSessionContextMenu}
          projectId={project.id}
          projectName={project.name}
          branchName={branch.name}
          branchPath={
            branch.path ?? useCodeStore.getState().projects.find((p) => p.id === project.id)?.path
          }
          onDropTask={(taskId, sessionId) => {
            const path = useCodeStore.getState().projects.find((p) => p.id === project.id)?.path;
            if (!path) return;
            const task = projectTasks?.find((t) => t.id === taskId);
            if (!task) return;
            const newStatus = task.status === 'todo' ? 'progress' : task.status;
            void taskService.update(path, taskId, {
              sessionId,
              branchName: branch.name,
              status: newStatus,
            });
          }}
          // Explicitly disable drag on SessionCard to prevent accidental loss of parent Branch context
          draggable={false}
        />
      ) : (
        <div
          className="rounded-lg px-2.5 py-[9px] flex justify-center items-center text-[11px] text-text-secondary/40 cursor-default"
          style={{
            borderStyle: 'dashed',
            borderWidth: '1.5px',
            borderColor: 'var(--color-border)',
          }}
        >
          No sessions yet
        </div>
      )}
    </div>
  );
});
