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

import { memo, useCallback, useState, useMemo } from 'react';
import { useCodeStore } from '../../hooks/useCodeStore';
import { useSessionTasks } from '../../hooks/useSessionTasks';
import { taskService, type StoredTask } from '../../services/task.service';
import {
  GitBranch,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Plus,
  Kanban,
  GitGraph,
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
  type LucideIcon,
} from 'lucide-react';

// ── Utils ─
import { cn } from '@renderer/shared/utils/cn';

// ── Types & Constants ──
import {
  type SessionStatus,
  type BranchInfo,
  type TaskStatus,
  type MenuPosition,
  type ProcessInteractHandler,
  STATUS_ORDER,
  TASK_STATUSES,
  getNewestSession,
  getBranchStatus,
  sortAgentsByState,
  StatusDot,
  TaskIcon,
  AgentAvatar,
  ProcessPill,
  SessionCard,
} from './SessionCard';

// ─── Types ──────────────────────────────────────────────────────────────

export interface ProjectExtended {
  id: string;
  name: string;
  hidden: boolean;
  /** Accent color of the project icon (hex) */
  color: string;
  /** Group the project belongs to (null = ungrouped) */
  groupId: string | null;
  branches: BranchInfo[];
}

interface ProjectCardProps {
  project: ProjectExtended;
  isSelected: boolean;
  selectedSessionId: string | null;
  /** Whether the Task Manager view is currently active for THIS project */
  isTaskManagerActive: boolean;
  /** Whether the Git view is currently active for THIS project */
  isGitActive?: boolean;
  /** Toggle Git view for this project */
  onToggleGit?: (projectId: string) => void;
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
  const c: Record<TaskStatus, number> = { todo: 0, progress: 0, review: 0, done: 0 };
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
function ProjectIcon({ color, Icon }: { color: string; Icon: LucideIcon }) {
  return (
    <span
      className="w-[26px] h-[26px] rounded-[8px] flex items-center justify-center shrink-0 self-center"
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
    >
      <Icon className="w-[15px] h-[15px]" />
    </span>
  );
}

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
              />
            </div>
          );
        }

        // Otherwise, render the compact row
        return (
          <div key={b.name} className="flex flex-col gap-1">
            {/* Branch Row */}
            <div
              title={b.name}
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

                // Priority 2: No session yet -> fallback to expansion logic
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
              <StatusDot status={st} />
              <span
                className={cn(
                  'flex-1 min-w-0 truncate font-mono text-[14px] font-medium',
                  dim ? 'text-text-secondary/50' : 'text-text-primary',
                )}
              >
                {stripPrefix(b.name)}
              </span>
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
            </div>
          </div>
        );
      })}
      {foot.length > 0 && <div className={footerCls}>{foot.join(' · ')}</div>}
    </>
  );
}
/** Branch block inside expanded project */
const BranchBlock = memo(function BranchBlock({
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
}) {
  const newest = getNewestSession(branch);
  const busy = !!newest && ['running', 'queued', 'blocked', 'review'].includes(newest.status);

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
        <span className="flex-1 min-w-0 truncate">{branch.name}</span>

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
          projectName={project.name}
          branchName={branch.name}
          onDropTask={(taskId, sessionId) => {
            const path = useCodeStore.getState().projects.find((p) => p.id === project.id)?.path;
            if (path) void taskService.update(path, taskId, { sessionId, branchName: branch.name });
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
  selectedSessionId,
  isTaskManagerActive,
  isGitActive = false,
  onToggleGit,
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
  const bySession = useSessionTasks((s) => s.bySession);
  const counts = getTaskCounts(project, bySession);
  const visBranches = getVisibleBranches(project);
  const identity = useMemo(
    () => getProjectIdentity(project.id + project.name),
    [project.id, project.name],
  );

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
        'relative border-y border-divider overflow-hidden', // Changed to border-y (top + bottom)
        project.hidden && 'opacity-50',
      )}
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
        className="group/top flex flex-col gap-1.5 px-3 pt-[9px] pb-2.5 cursor-pointer select-none hover:bg-white/[0.02] transition-colors"
        onClick={() => onToggleProject(project.id)}
      >
        <div className="flex items-center gap-2">
          <ProjectIcon color={identity.color} Icon={identity.Icon} />
          <span
            className={cn(
              'font-display font-semibold text-[12.5px] truncate flex-1 min-w-0 transition-colors group-hover/top:text-text-primary',
              isSelected ? 'text-text-primary' : 'text-text-secondary',
            )}
          >
            {project.name}
          </span>
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
                ? 'text-[#ff6a1f] bg-[rgba(255,106,31,0.1)]'
                : 'text-text-secondary hover:bg-card-hover hover:text-text-primary',
            )}
            title={isTaskManagerActive ? 'Close Task Manager' : 'Open Task Manager'}
          >
            <Kanban className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleGit?.(project.id);
            }}
            className={cn(
              'w-[22px] h-[22px] rounded-md flex items-center justify-center shrink-0 transition-colors cursor-pointer',
              isGitActive
                ? 'text-[#ff6a1f] bg-[rgba(255,106,31,0.1)]'
                : 'text-text-secondary hover:bg-card-hover hover:text-text-primary',
            )}
            title={isGitActive ? 'Close Git' : 'Open Git'}
          >
            <GitGraph className="w-3.5 h-3.5" />
          </button>

          {isSelected ? (
            <ChevronDown className="w-[14px] h-[14px] shrink-0 text-text-secondary" />
          ) : (
            <ChevronRight className="w-[14px] h-[14px] shrink-0 text-text-secondary" />
          )}
        </div>

        {/* Task status count chips */}
        <div className="flex gap-1 pl-[30px]">
          {TASK_STATUSES.map(([k, label]) => (
            <span
              key={k}
              title={`${label}: ${counts[k]}`}
              className={cn(
                'inline-flex items-center justify-center gap-[5px] h-5 pl-1.5 pr-[7px] rounded-[5px] font-mono text-[10.5px] font-medium leading-none text-text-secondary bg-card-background border border-divider',
                !counts[k] && 'opacity-40',
              )}
            >
              <TaskIcon status={k} />
              {counts[k]}
            </span>
          ))}
        </div>
      </div>

      {/* ── CONTENT AREA: Collapses visually when global drag is active ── */}
      {!isGlobalDragging && !isSelected && (
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
          />
        </div>
      )}

      {!isGlobalDragging && isSelected && (
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

      {/* Placeholder during drag to maintain layout height without rendering heavy children */}
      {isGlobalDragging && (
        <div className="h-8 w-full" /> 
      )}
    </div>
  );
});

export default ProjectCard;
