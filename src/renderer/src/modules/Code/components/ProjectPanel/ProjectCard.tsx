/**
 * ------------------------------------------------------------------
 * Project Card — aligned with ProjectPanel.html mockup
 * ------------------------------------------------------------------
 * Renders a single project item in the sidebar list:
 *  - Top row: colored project icon, name, hidden tag, kebab,
 *    Task Manager button, chevron + task-status count chips
 *  - Collapsed view: compact branch tree (max 5 rows, ranked by
 *    urgency) with agent avatars / process pill + footer summary
 *  - Expanded view: branch blocks with session cards
 * Includes drag-and-drop handlers and context menu triggers.
 * ------------------------------------------------------------------
 */

import { memo, useCallback, useEffect, useState, useMemo } from 'react';
import { useCodeStore } from '../../hooks/useCodeStore';
import { ProjectLogoImage } from '../ProjectLogo';
import { useSessionTasks } from '../../hooks/useSessionTasks';
import { taskService, type StoredTask } from '../../services/task.service';
import {
  GitBranch,
  GitPullRequest,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Plus,
  Kanban,
  GitGraph,
  MonitorUp,
  PowerOff,
  Unlink,
  Circle,
  Square,
  Triangle,
  Diamond,
  Pentagon,
  Hexagon,
  Octagon,
  Star,
  Heart,
  Moon,
  Sun,
  Cloud,
  Zap,
  Flame,
  Droplet,
  Leaf,
  Bookmark,
  Flag,
  CircleCheckBig,
  type LucideIcon,
} from 'lucide-react';

// ── Utils ─
import { cn } from '@renderer/utils/cn';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from '@renderer/components/ui/Dropdown';

// ── Local modals ──
import { TaskStatusModal } from './TaskStatusModal';
import { ConfirmUnlinkTaskModal } from './ConfirmUnlinkTaskModal';
import { closeTargetOwner } from '@renderer/hooks/useTargetLock';
import { toBranchTargetId } from './ProjectConflictModal';
import { BranchScopeButton } from './BranchScopeButton';
import { SessionHoverTooltip } from './SessionCard';

// ── Types & Constants ──
import {
  type SessionStatus,
  type BranchInfo,
  type TaskStatus,
  type MenuPosition,
  type ProcessInteractHandler,
  STATUS_ORDER,
  TASK_COLORS,
  getNewestSession,
  getBranchStatus,
  sortAgentsByState,
  AgentAvatar,
  ProcessPill,
  SessionCard,
} from './SessionCard';

// ─── Types ──────────────────────────────────────────────────────────────

export interface ProjectExtended {
  id: string;
  name: string;
  /** Ảnh vuông user chọn làm logo (đường dẫn tuyệt đối) */
  logoPath?: string | null;
  hidden: boolean;
  /** Accent color of the project icon (hex) */
  color: string;
  /** Group the project belongs to (null = ungrouped) */
  groupId: string | null;
  branches: BranchInfo[];
  /** Branch 'default' duy nhất của repo */
  defaultBranch?: string;
}

interface ProjectCardProps {
  project: ProjectExtended;
  /** Whether the project card is expanded (shows branch blocks) */
  isSelected: boolean;
  /** Whether this project is the CURRENTLY ACTIVE project in the store */
  isProjectSelected?: boolean;
  /** Tên các branch của project đang được một cửa sổ KHÁC thao tác */
  busyBranchNames?: ReadonlySet<string>;
  /** Yêu cầu cửa sổ khác bỏ chọn branch này */
  onReleaseElsewhere?: (projectId: string, branchName: string) => void;
  /** Chuyển focus sang cửa sổ đang giữ branch này */
  onFocusElsewhere?: (projectId: string, branchName: string) => void;
  /** Select this project as active (without toggling expansion) */
  onSelectProject?: (projectId: string) => void;
  selectedSessionId: string | null;
  /** Whether the Task Manager view is currently active for THIS project */
  isTaskManagerActive: boolean;
  /** Whether the Git view is currently active for THIS project */
  isGitActive?: boolean;
  /** Whether the project folder has a .git repo (undefined = still checking) */
  hasGit?: boolean;
  /** Toggle Git view for this project */
  onToggleGit?: (projectId: string) => void;
  /** Whether the Pull Request view is currently active for THIS project */
  isPullRequestActive?: boolean;
  /** Toggle Pull Request view for this project */
  onTogglePullRequest?: (projectId: string) => void;
  /** Project drag is only enabled with Manual sort */
  draggable: boolean;
  /** True if ANY item in the list is being dragged — forces visual collapse */
  isGlobalDragging?: boolean;
  /** Click on the top row: toggle expand/collapse */
  onToggleProject: (projectId: string) => void;
  /** Click on the collapsed tree: expand only */
  onOpenProject: (projectId: string) => void;
  onSelectSession: (sessionId: string) => void;
  onOpenDropdown: (
    kind: 'project' | 'branch',
    projectId: string,
    branchName?: string,
    pos?: MenuPosition,
  ) => void;
  onOpenTaskMenu: (sessionId: string, pos: MenuPosition) => void;
  /** Toggle Task Manager view for this project */
  onToggleTaskManager: (projectId: string) => void;
  onNewSession: (projectId: string, branchName: string) => void;
  onProcessInteract: ProcessInteractHandler;
  onSessionContextMenu?: (e: React.MouseEvent, sessionId: string) => void;
  // Drag & Drop Handlers passed from Parent
  onDragStart: (
    e: React.DragEvent,
    type: 'project' | 'branch',
    projectId: string,
    branchName?: string,
  ) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

// ─── Helpers (shared with ProjectPanel) ─────────────────────────────────

const ACTIVE_STATUSES: SessionStatus[] = ['blocked', 'running', 'review', 'queued'];
const MAX_COLLAPSED_ROWS = 5;

export function getVisibleBranches(project: ProjectExtended): BranchInfo[] {
  return (project.branches ?? []).filter((b) => b.visible);
}

export function getProjectStatus(project: ProjectExtended): SessionStatus {
  const statuses = getVisibleBranches(project).map(getBranchStatus);
  return STATUS_ORDER.find((o) => statuses.includes(o)) ?? 'idle';
}

/** Total tokens (k) of visible branches — used by "Token usage" sort */
export function getProjectTokens(project: ProjectExtended): number {
  return getVisibleBranches(project).reduce(
    (a, b) => a + (b.sessions ?? []).reduce((x, s) => x + (s.summary?.tokens ?? 0), 0),
    0,
  );
}

/** Task counts per status across ALL branches */
export function getTaskCounts(
  project: ProjectExtended,
  bySession: Record<string, StoredTask>,
): Record<TaskStatus, number> {
  const c: Record<TaskStatus, number> = { todo: 0, progress: 0, done: 0 };
  project.branches?.forEach((b) =>
    b.sessions?.forEach((s) => {
      const t = bySession[s.id];
      if (t) c[t.status]++;
    }),
  );
  return c;
}

/** Lower rank = more urgent → shown first in the collapsed tree */
function rankBranch(b: BranchInfo): number {
  const n = getNewestSession(b);
  const procs = n?.procs ?? [];
  if (procs.some((p) => p.status === 'crashed')) return -1;
  if (procs.length && n?.status === 'done') return 3.5;
  return STATUS_ORDER.indexOf(getBranchStatus(b));
}

const stripPrefix = (name: string) => name.replace(/^(feature|fix|hotfix|release)\//, '');

// ─── Sub-components ─────────────────────────────────────────────────────

/** Kebab button (3 vertical dots). Parent passes the hover-reveal classes. */
export const KebabButton = memo(function KebabButton({
  onClick,
  className,
}: {
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        'w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-text-secondary hover:bg-card-hover hover:text-text-primary transition-opacity cursor-pointer',
        className,
      )}
      title="More actions"
    >
      <MoreVertical className="w-3 h-3" />
    </button>
  );
});

const PROJECT_ICONS: LucideIcon[] = [
  Circle,
  Square,
  Triangle,
  Diamond,
  Pentagon,
  Hexagon,
  Octagon,
  Star,
  Heart,
  Moon,
  Sun,
  Cloud,
  Zap,
  Flame,
  Droplet,
  Leaf,
  Bookmark,
  Flag,
  CircleCheckBig,
];

const PROJECT_COLORS = [
  '#f97316',
  '#3b82f6',
  '#22c55e',
  '#a855f7',
  '#ec4899',
  '#eab308',
  '#06b6d4',
  '#ef4444',
];

/** Stable pseudo-random icon + color per project (same seed → same result). */
export function getProjectIdentity(seed: string): { color: string; Icon: LucideIcon } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const abs = Math.abs(hash);
  return {
    color: PROJECT_COLORS[abs % PROJECT_COLORS.length],
    Icon: PROJECT_ICONS[Math.floor(abs / PROJECT_COLORS.length) % PROJECT_ICONS.length],
  };
}

/** Colored project icon (color-mix tinted background) */
export function ProjectIcon({
  color,
  Icon,
  logoPath,
}: {
  color: string;
  Icon: LucideIcon;
  logoPath?: string | null;
}) {
  const fallback = (
    <span
      className="w-[26px] h-[26px] rounded-[8px] flex items-center justify-center shrink-0 self-center"
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
    >
      <Icon className="w-[15px] h-[15px]" />
    </span>
  );
  if (!logoPath) return fallback;
  return (
    <span className="w-[26px] h-[26px] rounded-[8px] overflow-hidden flex items-center justify-center shrink-0 self-center">
      <ProjectLogoImage
        path={logoPath}
        side={52}
        className="w-full h-full object-contain"
        fallback={fallback}
      />
    </span>
  );
}

/** Badge: branch là default của repo */
const DefaultBadge = memo(function DefaultBadge() {
  return (
    <span className="inline-flex items-center h-[18px] px-1.5 rounded-[5px] shrink-0 text-[9.5px] font-medium text-primary bg-primary/10">
      default
    </span>
  );
});

const NO_BRANCH_NAME = 'no-branch';

const NoGitBadge = memo(function NoGitBadge() {
  return (
    <span className="inline-flex items-center h-[18px] px-1.5 rounded-[5px] shrink-0 text-[9.5px] font-medium text-text-secondary bg-button-soft-background">
      no git
    </span>
  );
});

/** Badge: branch đang được một cửa sổ KHÁC mở */
const BusyBadge = memo(function BusyBadge({
  projectId,
  branchName,
  onFocus,
  onRelease,
}: {
  projectId: string;
  branchName: string;
  onFocus: () => void;
  onRelease: () => void;
}) {
  return (
    <div className="inline-flex items-center h-[18px] rounded-[5px] shrink-0 text-[9.5px] font-medium text-amber-500 bg-amber-500/10">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onFocus();
        }}
        className="inline-flex items-center gap-1 h-full pl-1.5 pr-1 cursor-pointer hover:bg-amber-500/20 transition-colors"
        title="Open in another window — click to switch to it"
      >
        <MonitorUp className="w-3 h-3" />
        Other window
      </button>
      <span onClick={(e) => e.stopPropagation()}>
        <Dropdown strategy="fixed" side="bottom" align="end" sideOffset={4}>
          <DropdownTrigger asChild>
            <button
              className="inline-flex items-center justify-center h-[18px] px-1 rounded-r-[5px] cursor-pointer hover:bg-amber-500/20 transition-colors"
              title="More actions"
            >
              <MoreVertical className="w-3 h-3" />
            </button>
          </DropdownTrigger>
          <DropdownContent>
            <DropdownItem icon={<MonitorUp className="w-3.5 h-3.5" />} onClick={onFocus}>
              Switch to that window
            </DropdownItem>
            <DropdownItem icon={<Unlink className="w-3.5 h-3.5" />} onClick={onRelease}>
              Unselect branch in that window
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem
              variant="error"
              icon={<PowerOff className="w-3.5 h-3.5" />}
              onClick={() => closeTargetOwner('code', toBranchTargetId(projectId, branchName))}
            >
              Close that window
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
      </span>
    </div>
  );
});

/** Collapsed view: compact branch tree with inline session display */
function CollapsedTree({
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
        const branchTaskCounts = useMemo(() => {
          const c: Record<TaskStatus, number> = { todo: 0, progress: 0, done: 0 };
          (projectTasks ?? []).forEach((t) => {
            if (!t.archived && t.branchName === b.name) c[t.status]++;
          });
          return c;
        }, [projectTasks, b.name]);
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
                {b.name === NO_BRANCH_NAME && <NoGitBadge />}
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

        {branch.name === NO_BRANCH_NAME && <NoGitBadge />}

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

// ─── Main Component ─────────────────────────────────────────────────────

export const ProjectCard = memo(function ProjectCard({
  project,
  isSelected,
  isProjectSelected = false,
  busyBranchNames,
  onReleaseElsewhere,
  onFocusElsewhere,
  onSelectProject,
  selectedSessionId,
  isTaskManagerActive,
  isGitActive = false,
  hasGit,
  onToggleGit,
  isPullRequestActive = false,
  onTogglePullRequest,
  draggable,
  isGlobalDragging = false,
  onToggleProject,
  onSelectSession,
  onOpenDropdown,
  onOpenTaskMenu,
  onToggleTaskManager,
  onNewSession,
  onProcessInteract,
  onSessionContextMenu,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: ProjectCardProps) {
  const projectPath = useCodeStore((s) => s.projects.find((p) => p.id === project.id)?.path ?? '');

  const projectTasks = useSessionTasks((s) => s.byPath[projectPath]);
  const loadTasks = useSessionTasks((s) => s.load);
  useEffect(() => {
    void loadTasks(projectPath);
  }, [loadTasks, projectPath]);
  const visBranches = getVisibleBranches(project);
  const identity = useMemo(
    () => getProjectIdentity(project.id + project.name),
    [project.id, project.name],
  );

  const [taskStatusModalOpen, setTaskStatusModalOpen] = useState(false);
  const [taskStatusModalBranch, setTaskStatusModalBranch] = useState<string | null>(null);
  const [confirmUnlinkTask, setConfirmUnlinkTask] = useState<StoredTask | null>(null);

  const handleOpenTaskStatusModal = useCallback((branchName: string) => {
    setTaskStatusModalBranch(branchName);
    setTaskStatusModalOpen(true);
  }, []);

  const handleCloseTaskStatusModal = useCallback(() => {
    setTaskStatusModalOpen(false);
    setTaskStatusModalBranch(null);
  }, []);

  const openMenuAt = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onOpenDropdown('project', project.id, undefined, { top: e.clientY, left: e.clientX });
    },
    [project.id, onOpenDropdown],
  );

  return (
    <div
      className={cn(
        'relative shrink-0 border-y border-divider overflow-hidden transition-colors',
        project.hidden && 'opacity-50',
        // Selected project indicator — subtle accent strip + tinted background
        isProjectSelected && 'bg-primary/[0.04]',
      )}
      data-project-selected={isProjectSelected ? 'true' : undefined}
      draggable={draggable}
      data-pid={project.id}
      onDragStart={(e) => onDragStart(e, 'project', project.id)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onContextMenu={openMenuAt}
    >
      {/* ── Top: name row + task chips ── */}
      <div
        className={cn(
          'group/top relative flex flex-col gap-1.5 px-3 pt-[9px] pb-2.5 cursor-pointer select-none transition-colors',
          !isGlobalDragging && 'hover:bg-white/[0.02]',
          isProjectSelected &&
            "before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-primary",
        )}
        onClick={() => {
          if (isGlobalDragging) return;
          // Clicking the card header selects the project AND expands it.
          onSelectProject?.(project.id);
          if (!isSelected) onToggleProject(project.id);
        }}
      >
        <div className="flex items-center gap-2" data-drag-row>
          <ProjectIcon color={identity.color} Icon={identity.Icon} logoPath={project.logoPath} />
          <span
            className={cn(
              'font-display font-semibold text-[12.5px] truncate flex-1 min-w-0 transition-colors',
              !isGlobalDragging && 'group-hover/top:text-text-primary',
              isProjectSelected
                ? 'text-text-primary'
                : isSelected
                  ? 'text-text-primary'
                  : 'text-text-secondary',
            )}
          >
            {project.name}
          </span>

          {/* Elements hidden via CSS during drag to preserve DOM structure and prevent flickering/layout shifts */}
          <div data-drag-hide className={cn('contents', isGlobalDragging && 'hidden')}>
            {project.hidden && (
              <span className="text-[9.5px] text-text-secondary/50 border border-border rounded px-[5px]">
                hidden
              </span>
            )}

            <KebabButton onClick={openMenuAt} />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleTaskManager(project.id);
              }}
              className={cn(
                'w-[22px] h-[22px] rounded-md flex items-center justify-center shrink-0 transition-colors cursor-pointer',
                isTaskManagerActive
                  ? 'text-primary bg-primary/10'
                  : 'text-text-secondary hover:bg-card-hover hover:text-text-primary',
              )}
              title={isTaskManagerActive ? 'Close Task Manager' : 'Open Task Manager'}
            >
              <Kanban className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hasGit === false) return;
                onToggleGit?.(project.id);
              }}
              disabled={hasGit === false}
              className={cn(
                'w-[22px] h-[22px] rounded-md flex items-center justify-center shrink-0 transition-colors',
                hasGit === false
                  ? 'text-text-secondary/30 cursor-not-allowed'
                  : 'cursor-pointer ' +
                      (isGitActive
                        ? 'text-primary bg-primary/10'
                        : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'),
              )}
              title={
                hasGit === false
                  ? 'Not a git repository — Git features unavailable'
                  : isGitActive
                    ? 'Close Git'
                    : 'Open Git'
              }
            >
              <GitGraph className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hasGit === false) return;
                onTogglePullRequest?.(project.id);
              }}
              disabled={hasGit === false}
              className={cn(
                'w-[22px] h-[22px] rounded-md flex items-center justify-center shrink-0 transition-colors',
                hasGit === false
                  ? 'text-text-secondary/30 cursor-not-allowed'
                  : 'cursor-pointer ' +
                      (isPullRequestActive
                        ? 'text-primary bg-primary/10'
                        : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'),
              )}
              title={
                hasGit === false
                  ? 'Not a git repository — Pull requests unavailable'
                  : isPullRequestActive
                    ? 'Close Pull requests'
                    : 'Open Pull requests'
              }
            >
              <GitPullRequest className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleProject(project.id);
              }}
              className="w-[14px] h-[14px] shrink-0 flex items-center justify-center cursor-pointer text-text-secondary hover:text-text-primary transition-colors"
              title={isSelected ? 'Collapse' : 'Expand'}
            >
              {isSelected ? (
                <ChevronDown className="w-[14px] h-[14px]" />
              ) : (
                <ChevronRight className="w-[14px] h-[14px]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── CONTENT AREA: Hidden via CSS during drag to preserve DOM structure ── */}
      <div className={cn(isGlobalDragging && 'hidden')}>
        {!isSelected && (
          <div className="flex flex-col gap-px pl-3 pr-2 pb-2.5 transition-opacity duration-150">
            <CollapsedTree
              project={project}
              selectedSessionId={selectedSessionId}
              onSelectSession={onSelectSession}
              onOpenTaskMenu={onOpenTaskMenu}
              onProcessInteract={onProcessInteract}
              onSessionContextMenu={onSessionContextMenu}
              onOpenDropdown={onOpenDropdown}
              onNewSession={onNewSession}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onExpandProject={() => onToggleProject(project.id)}
              busyBranchNames={busyBranchNames}
              onFocusElsewhere={onFocusElsewhere}
              onReleaseElsewhere={onReleaseElsewhere}
              projectTasks={projectTasks}
              onOpenTaskStatusModal={handleOpenTaskStatusModal}
            />
          </div>
        )}

        {isSelected && (
          <div className="px-3 pt-0.5 pb-3 flex flex-col gap-3.5 relative animate-in fade-in slide-in-from-top-1 duration-150">
            {visBranches.length > 0 ? (
              visBranches.map((branch) => (
                <BranchBlock
                  key={branch.name}
                  project={project}
                  branch={branch}
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
                  busyElsewhere={busyBranchNames?.has(branch.name)}
                  onFocusElsewhere={onFocusElsewhere}
                  onReleaseElsewhere={onReleaseElsewhere}
                  projectTasks={projectTasks}
                  onOpenTaskStatusModal={handleOpenTaskStatusModal}
                />
              ))
            ) : (
              <div className="text-center text-text-secondary/50 text-[11.5px] px-2.5 py-6">
                No branches shown.
                <br />
                Right-click the project to add one.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Task Status Modal */}
      <TaskStatusModal
        isOpen={taskStatusModalOpen}
        onClose={handleCloseTaskStatusModal}
        projectName={project.name}
        branchName={taskStatusModalBranch ?? ''}
        tasks={(projectTasks ?? []).filter((t) => !t.archived)}
        linkedTaskId={
          (projectTasks ?? []).find((t) => !t.archived && t.branchName === taskStatusModalBranch)
            ?.id ?? null
        }
        onLink={(taskId) => {
          const task = (projectTasks ?? []).find((t) => t.id === taskId);
          if (!task) return;
          const newStatus = task.status === 'todo' ? 'progress' : task.status;
          void taskService.update(projectPath, taskId, {
            status: newStatus,
            branchName: taskStatusModalBranch,
            sessionId: null,
          });
          handleCloseTaskStatusModal();
        }}
        onUnlink={(taskId) => {
          const task = (projectTasks ?? []).find((t) => t.id === taskId);
          if (!task) return;
          setConfirmUnlinkTask(task);
          handleCloseTaskStatusModal();
        }}
      />

      {/* Confirm Unlink Task Modal */}
      <ConfirmUnlinkTaskModal
        isOpen={!!confirmUnlinkTask}
        onClose={() => setConfirmUnlinkTask(null)}
        taskTitle={confirmUnlinkTask?.title ?? ''}
        onConfirm={(newStatus) => {
          if (!confirmUnlinkTask) return;
          void taskService.update(projectPath, confirmUnlinkTask.id, {
            status: newStatus,
            branchName: null,
            sessionId: null,
          });
          setConfirmUnlinkTask(null);
        }}
      />
    </div>
  );
});

export default ProjectCard;
