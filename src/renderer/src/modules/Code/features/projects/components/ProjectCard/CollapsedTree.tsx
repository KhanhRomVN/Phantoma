import { useState } from 'react';
import { type StoredTask } from '../../../../shared/services/task.service';
import { GitBranch } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { SessionHoverTooltip } from '../SessionCard/SessionHoverTooltip';
import { AgentAvatar, ProcessPill } from '../SessionCard/SessionBadges';
import { getNewestSession, getBranchStatus, sortAgentsByState } from '../../utils/session.util';
import { TASK_COLORS } from '../../constants/session.constants';
import { type TaskStatus } from '../../types/session.types';
import { ProjectExtended } from '../../types/project-card.types';
import {
  ACTIVE_STATUSES,
  MAX_COLLAPSED_ROWS,
  getVisibleBranches,
  rankBranch,
  stripPrefix,
} from '../../utils/project-card.util';
import { DefaultBadge, NO_BRANCH_NAME, NO_GIT_NAME, TempBranchBadge, BusyBadge } from './badges';
import { BranchScopeButton } from './BranchScopeButton';
import { ProjectCardProps } from '../../types/project-card.types';
import { BranchBlock } from './BranchBlock';

/** Collapsed view: compact branch tree with inline session display */
export function CollapsedTree({
  project,
  selectedSessionId,
  onSelectSession,
  onOpenTaskMenu,
  onProcessInteract,
  onSessionContextMenu,
  onOpenDropdown,
  onNewSession,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onExpandProject,
  busyBranchNames,
  onFocusElsewhere,
  onReleaseElsewhere,
  projectTasks,
  onOpenTaskStatusModal,
}: {
  project: ProjectExtended;
  selectedSessionId: string | null;
  onSelectSession: (id: string) => void;
  onOpenTaskMenu: ProjectCardProps['onOpenTaskMenu'];
  onProcessInteract: ProjectCardProps['onProcessInteract'];
  onSessionContextMenu?: ProjectCardProps['onSessionContextMenu'];
  onOpenDropdown: ProjectCardProps['onOpenDropdown'];
  onNewSession: ProjectCardProps['onNewSession'];
  onDragStart: ProjectCardProps['onDragStart'];
  onDragEnd: ProjectCardProps['onDragEnd'];
  onDragOver: ProjectCardProps['onDragOver'];
  onDrop: ProjectCardProps['onDrop'];
  onExpandProject: () => void;
  busyBranchNames?: ReadonlySet<string>;
  onFocusElsewhere?: ProjectCardProps['onFocusElsewhere'];
  onReleaseElsewhere?: ProjectCardProps['onReleaseElsewhere'];
  projectTasks?: StoredTask[];
  onOpenTaskStatusModal: (branchName: string) => void;
}) {
  const [expandedBranchName, setExpandedBranchName] = useState<string | null>(null);

  const footerCls = 'pt-[5px] pl-[18px] text-[10.5px] text-text-secondary/50';
  const vb = getVisibleBranches(project);
  if (!vb.length) return <div className={footerCls}>No branches shown</div>;

  const hiddenActive = (project.branches ?? []).filter(
    (b) => !b.visible && ACTIVE_STATUSES.includes(getBranchStatus(b)),
  ).length;

  let pick = vb.map((b, i) => ({ b, i, r: rankBranch(b) }));
  if (pick.length > MAX_COLLAPSED_ROWS) {
    pick = [...pick]
      .sort((x, y) => x.r - y.r || x.i - y.i)
      .slice(0, MAX_COLLAPSED_ROWS)
      .sort((x, y) => x.i - y.i);
  }
  const rest = vb.length - pick.length;

  const foot: string[] = [];
  if (rest > 0) foot.push(`+${rest} more branch${rest > 1 ? 'es' : ''}`);
  if (hiddenActive)
    foot.push(`${hiddenActive} hidden branch${hiddenActive > 1 ? 'es' : ''} active`);

  return (
    <>
      {pick.map(({ b }) => {
        const n = getNewestSession(b);
        const st = getBranchStatus(b);
        const live = !!n && st !== 'done' && st !== 'idle';
        const agents = n && live ? sortAgentsByState(n.agents, n.status) : [];
        const procs = n?.procs ?? [];
        const dim = !live && procs.length === 0;

        // Calculate task counts for this specific branch
        const branchTaskCounts: Record<TaskStatus, number> = { todo: 0, progress: 0, done: 0 };
        (projectTasks ?? []).forEach((t) => {
          if (!t.archived && t.branchName === b.name) branchTaskCounts[t.status]++;
        });
        const wrap = (row: React.ReactNode) =>
          n ? (
            <SessionHoverTooltip
              session={n}
              projectId={project.id}
              projectName={project.name}
              branchName={b.name}
              branchPath={b.path ?? ''}
              className="block w-full"
            >
              {row}
            </SessionHoverTooltip>
          ) : (
            row
          );

        // Determine if this specific branch is currently expanded inline
        const isBranchExpanded = expandedBranchName === b.name;

        // If expanded, render the full BranchBlock component for consistent UI
        if (isBranchExpanded) {
          return (
            <div key={b.name} className="mb-1 last:mb-0">
              <BranchBlock
                project={project}
                branch={b}
                selectedSessionId={selectedSessionId}
                onSelectSession={onSelectSession}
                onOpenDropdown={onOpenDropdown}
                onOpenTaskMenu={onOpenTaskMenu}
                onNewSession={onNewSession}
                onProcessInteract={onProcessInteract}
                onSessionContextMenu={onSessionContextMenu}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
                onDrop={onDrop}
                busyElsewhere={busyBranchNames?.has(b.name)}
                onFocusElsewhere={onFocusElsewhere}
                onReleaseElsewhere={onReleaseElsewhere}
                projectTasks={projectTasks}
                onOpenTaskStatusModal={onOpenTaskStatusModal}
              />
            </div>
          );
        }

        // Otherwise, render the compact row
        return (
          <div key={b.name} className="flex flex-col gap-1">
            {/* Branch Row */}
            {wrap(
              <div
                title={n ? undefined : b.name}
                className={cn(
                  'flex items-center gap-2 min-w-0 px-1.5 py-[6px] rounded-md transition-colors cursor-pointer hover:bg-card-hover',
                )}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenDropdown('branch', project.id, b.name, { top: e.clientY, left: e.clientX });
                }}
                onClick={(e) => {
                  e.stopPropagation();

                  const newestSession = getNewestSession(b);

                  // Priority 1: If there is a session, expand the project AND select the session.
                  // Expanding ensures the BranchBlock (which renders the SessionCard) becomes visible.
                  if (newestSession) {
                    onExpandProject();
                    onSelectSession(newestSession.id);
                    return;
                  }

                  // Priority 2: If the project has exactly 2 visible branches and this branch has no session,
                  // select the FIRST idle branch that has a session instead of expanding.
                  if (vb.length === 2) {
                    const firstIdleBranchWithSession = vb.find(
                      (br) => br.name !== b.name && getNewestSession(br) !== null,
                    );
                    if (firstIdleBranchWithSession) {
                      const session = getNewestSession(firstIdleBranchWithSession);
                      if (session) {
                        onExpandProject();
                        onSelectSession(session.id);
                        return;
                      }
                    }
                  }

                  // Priority 3: No session yet -> fallback to expansion logic
                  // If the project has only ONE visible branch, expanding the whole card makes more sense
                  if (vb.length === 1) {
                    onExpandProject();
                    return;
                  }

                  // Otherwise, toggle inline expansion for this specific branch to allow creating a new session
                  if (isBranchExpanded) {
                    setExpandedBranchName(null);
                  } else {
                    setExpandedBranchName(b.name);
                  }
                }}
              >
                <GitBranch className="w-[13px] h-[13px] shrink-0 text-text-secondary/70" />
                <span
                  className={cn(
                    'min-w-0 truncate font-mono text-[14px] font-medium',
                    dim ? 'text-text-secondary/50' : 'text-text-primary',
                  )}
                >
                  {stripPrefix(b.name)}
                </span>
                {project.defaultBranch === b.name && <DefaultBadge />}
                {(b.name === NO_BRANCH_NAME || b.name === NO_GIT_NAME) && <TempBranchBadge name={b.name} />}
                <span className="flex-1" />
                {/* Task status badge */}
                {(branchTaskCounts.todo > 0 || branchTaskCounts.progress > 0) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenTaskStatusModal(b.name);
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
                {project.defaultBranch !== b.name && (
                  <BranchScopeButton projectId={project.id} branchName={b.name} />
                )}
                {busyBranchNames?.has(b.name) && (
                  <BusyBadge
                    projectId={project.id}
                    branchName={b.name}
                    onFocus={() => onFocusElsewhere?.(project.id, b.name)}
                    onRelease={() => onReleaseElsewhere?.(project.id, b.name)}
                  />
                )}
                <span className="flex items-center gap-[5px] shrink-0">
                  {n &&
                    agents
                      .slice(0, 4)
                      .map((a, i) => (
                        <AgentAvatar key={i} agent={a} sessionStatus={n.status} size="sm" />
                      ))}
                  {agents.length > 4 && (
                    <span className="font-mono text-[10px] text-text-secondary/50">
                      +{agents.length - 4}
                    </span>
                  )}
                  <ProcessPill procs={procs} />
                </span>
              </div>,
            )}
          </div>
        );
      })}
      {foot.length > 0 && <div className={footerCls}>{foot.join(' · ')}</div>}
    </>
  );
}
