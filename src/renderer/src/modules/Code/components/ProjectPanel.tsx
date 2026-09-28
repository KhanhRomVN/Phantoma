/**
 * ------------------------------------------------------------------
 * Project Panel (Left Side) — Mockup v6 Aligned
 * ------------------------------------------------------------------
 * Vertical project list with expandable branches, session cards,
 * agent chips with state rings, drag-and-drop reorder, context menus,
 * project status icons, live simulation toggle, and animated status dots.
 *
 * Main features:
 * - Expandable project cards with branch tree
 * - Session cards with agent avatars + state ring animations
 * - Project status icons (SVG per-state, not plain dots)
 * - Collapsed view shows active branches list with agent avatars
 * - Drag-and-drop reorder for projects and branches
 * - Right-click / kebab context menus
 * - Show/hide hidden projects toggle
 * - Live simulation toggle (bolt icon)
 * - Session selection highlight
 * - CSS animations: pop, enter, core, ring, beat, spin
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { useEffect, useState, useRef, useCallback, memo } from 'react';
import type { ReactNode } from 'react';

// ── Icons ──
import {
  GitBranch,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Eye,
  EyeOff,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Check,
  Zap,
  AlertTriangle,
  Bell,
  Clock,
  CheckCircle2,
  Moon,
} from 'lucide-react';

// ── Hooks & Store ──
import { useCodeStore, type Project } from '../hooks/useCodeStore';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';
import { logger } from '@renderer/utils/logger';

// ─── Types ──────────────────────────────────────────────────────────────

type SessionStatus = 'running' | 'review' | 'blocked' | 'queued' | 'done' | 'idle';

interface AgentInfo {
  name: string;
  color: string;
  initials: string;
  status: SessionStatus;
}

interface SessionSummary {
  tokens: number;
  cost: number;
  added: number;
  removed: number;
  files: number;
  duration: string;
}

interface SessionInfo {
  id: string;
  title: string;
  status: SessionStatus;
  time: string;
  agents: AgentInfo[];
  summary: SessionSummary;
  hint?: string;
}

interface BranchInfo {
  name: string;
  visible: boolean;
  sessions: SessionInfo[];
}

interface ProjectExtended extends Project {
  defaultBranch: string;
  hidden: boolean;
  branches: BranchInfo[];
}

// ─── Constants ──────────────────────────────────────────────────────────

const STATUS_ORDER: SessionStatus[] = ['blocked', 'running', 'review', 'queued', 'done', 'idle'];

const STATUS_COLORS: Record<SessionStatus, string> = {
  running: 'bg-[#ff6a1f]',
  review: 'bg-[#4fa8e0]',
  blocked: 'bg-[#ff4757]',
  queued: 'bg-[#4a4d57]',
  done: 'bg-[#3ddc84]',
  idle: 'border border-text-secondary/30 bg-transparent',
};

const STATUS_TEXT_COLORS: Record<SessionStatus, string> = {
  running: 'text-[#ff6a1f]',
  review: 'text-[#4fa8e0]',
  blocked: 'text-[#ff4757]',
  queued: 'text-text-secondary',
  done: 'text-[#3ddc84]',
  idle: 'text-text-secondary/50',
};

const PROJECT_STATUS_COLORS: Record<SessionStatus, string> = {
  running: 'text-[#3ddc84]',
  blocked: 'text-[#ff4757]',
  review: 'text-[#ffb020]',
  queued: 'text-text-secondary',
  done: 'text-[#32c8be]',
  idle: 'text-[#a078ff]',
};

const PROJECT_STATUS_ICONS: Record<SessionStatus, ReactNode> = {
  running: <CheckCircle2 className="w-3.5 h-3.5" />,
  blocked: <AlertTriangle className="w-3.5 h-3.5" />,
  review: <Bell className="w-3.5 h-3.5" />,
  queued: <Clock className="w-3.5 h-3.5" />,
  done: <CheckCircle2 className="w-3.5 h-3.5" />,
  idle: <Moon className="w-3.5 h-3.5" />,
};

// ─── Helpers ────────────────────────────────────────────────────────────

function getNewestSession(branch: BranchInfo): SessionInfo | null {
  return branch.sessions.length > 0 ? branch.sessions[0] : null;
}

function getBranchStatus(branch: BranchInfo): SessionStatus {
  const newest = getNewestSession(branch);
  return newest?.status ?? 'idle';
}

function getVisibleBranches(project: ProjectExtended): BranchInfo[] {
  return (project.branches ?? []).filter((b) => b.visible);
}

function getProjectStatus(project: ProjectExtended): SessionStatus {
  const statuses = getVisibleBranches(project).map(getBranchStatus);
  return STATUS_ORDER.find((o) => statuses.includes(o)) ?? 'idle';
}

function getProjectTally(project: ProjectExtended): Record<string, number> {
  const tally: Record<string, number> = { running: 0, review: 0, blocked: 0, queued: 0 };
  getVisibleBranches(project).forEach((b) => {
    const s = getBranchStatus(b);
    if (s in tally) tally[s]++;
  });
  return tally;
}

function getProjectDiffSummary(project: ProjectExtended): { added: number; removed: number } {
  return getVisibleBranches(project).reduce(
    (acc, b) => {
      const newest = getNewestSession(b);
      if (newest) {
        acc.added += newest.summary.added;
        acc.removed += newest.summary.removed;
      }
      return acc;
    },
    { added: 0, removed: 0 },
  );
}

function getTotalTokens(project: ProjectExtended): number {
  return getVisibleBranches(project).reduce(
    (acc, b) => acc + b.sessions.reduce((sum, s) => sum + s.summary.tokens, 0),
    0,
  );
}

function getLastTime(project: ProjectExtended): string {
  const times = getVisibleBranches(project)
    .map((b) => getNewestSession(b)?.time)
    .filter(Boolean);
  return times[0] || '—';
}

/** Map agent status + session status to avatar ring CSS class */
function getAgentStateClass(agent: AgentInfo, sessionStatus: SessionStatus): string {
  if (agent.status === 'blocked') return 'pp-aa-err';
  // Agent 'running' maps to spinning green ring (mockup uses 'working' internally)
  if (agent.status === 'running') return 'pp-aa-run';
  if (agent.status === 'queued') return '';
  if (sessionStatus === 'review') return 'pp-aa-wait';
  return '';
}

// ─── Sub-components ─────────────────────────────────────────────────────

/** Status dot with v6 animation classes */
function StatusDot({
  status,
  size = 'normal',
}: {
  status: SessionStatus;
  size?: 'normal' | 'small';
}) {
  const animClass =
    status === 'running'
      ? 'pp-dot-running'
      : status === 'review'
        ? 'pp-dot-review'
        : status === 'blocked'
          ? 'pp-dot-blocked'
          : status === 'queued'
            ? 'pp-dot-queued'
            : '';

  return (
    <div
      className={cn(
        'relative rounded-full shrink-0',
        size === 'small' ? 'w-1.5 h-1.5' : 'w-2 h-2',
        STATUS_COLORS[status],
        animClass,
      )}
    />
  );
}

/** Project status icon (replaces plain dot in project header) */
function ProjectStatusIcon({ status }: { status: SessionStatus }) {
  const animClass =
    status === 'running'
      ? 'pp-pi-running'
      : status === 'blocked'
        ? 'pp-pi-blocked'
        : status === 'review'
          ? 'pp-pi-review'
          : '';

  return (
    <div
      className={cn(
        'w-[22px] h-[22px] rounded-[7px] flex items-center justify-center shrink-0',
        PROJECT_STATUS_COLORS[status],
        animClass,
      )}
      style={{ backgroundColor: `color-mix(in srgb, currentColor 14%, transparent)` }}
    >
      {PROJECT_STATUS_ICONS[status]}
    </div>
  );
}

/** Agent chip with state ring animations */
function AgentChip({
  agent,
  sessionStatus,
}: {
  agent: AgentInfo;
  sessionStatus: SessionStatus;
}) {
  const stateClass = getAgentStateClass(agent, sessionStatus);
  return (
    <span className="inline-flex items-center gap-1.5 bg-sidebar-item-hover border border-border rounded-full pl-0.5 pr-2 py-0.5 text-[10px] text-text-secondary">
      <span
        className={cn(
          'relative w-[15px] h-[15px] rounded-full flex items-center justify-center text-white font-bold text-[7.5px]',
          stateClass,
        )}
        style={{ backgroundColor: agent.color }}
      >
        {agent.initials}
      </span>
      <span className="font-medium">{agent.name}</span>
    </span>
  );
}

/** Small agent avatar for collapsed view */
function AgentAvatarSmall({
  agent,
  sessionStatus,
}: {
  agent: AgentInfo;
  sessionStatus: SessionStatus;
}) {
  const stateClass = getAgentStateClass(agent, sessionStatus);
  return (
    <span
      className={cn(
        'relative w-4 h-4 rounded-full flex items-center justify-center text-white font-bold text-[6.5px]',
        stateClass,
      )}
      style={{ backgroundColor: agent.color }}
    >
      {agent.initials}
    </span>
  );
}

/** Session card with selection highlight */
const SessionCard = memo(function SessionCard({
  session,
  selectedSessionId,
  onSelect,
}: {
  session: SessionInfo;
  selectedSessionId: string | null;
  onSelect: (id: string) => void;
}) {
  const st = session.status;
  const isSelected = selectedSessionId === session.id;

  return (
    <div
      className={cn(
        'bg-card border rounded-lg p-2.5 flex flex-col gap-1.5 cursor-pointer transition-colors hover:border-[rgba(255,106,31,0.3)]',
        st === 'blocked'
          ? 'border-[rgba(255,71,87,0.35)]'
          : 'border-divider',
        isSelected && 'border-[rgba(255,106,31,0.6)]',
      )}
      onClick={() => onSelect(session.id)}
    >
      {/* Title row */}
      <div className="flex items-center gap-2 text-xs font-semibold">
        <StatusDot status={st} />
        <span className="flex-1 truncate text-text-primary">{session.title}</span>
        <small className="font-mono text-[10px] text-text-secondary/50">{session.time}</small>
      </div>

      {/* Agents */}
      <div className="flex gap-1.5 flex-wrap items-center">
        {session.agents.map((a, i) => (
          <AgentChip key={i} agent={a} sessionStatus={st} />
        ))}
      </div>

      {/* Hint */}
      {session.hint && (
        <div className="text-[11px] text-[#ff4757] bg-[rgba(255,71,87,0.08)] rounded px-2 py-1">
          {session.hint}
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-2.5 flex-wrap font-mono text-[10.5px] text-text-secondary/50">
        <span>
          <b className="font-medium text-text-secondary">{session.summary.tokens}k</b> tokens
        </span>
        <span>
          $<b className="font-medium text-text-secondary">{session.summary.cost.toFixed(2)}</b>
        </span>
        <span>
          <b className="font-medium text-text-secondary">{session.summary.files}</b> files{' '}
          <span className="text-[#3ddc84]">+{session.summary.added}</span>{' '}
          <span className="text-[#ff4757]">−{session.summary.removed}</span>
        </span>
        <span>{session.summary.duration}</span>
      </div>
    </div>
  );
});

/** Branch block inside expanded project */
const BranchBlock = memo(function BranchBlock({
  project,
  branch,
  selectedSessionId,
  onSelectSession,
  onContextMenu,
}: {
  project: ProjectExtended;
  branch: BranchInfo;
  selectedSessionId: string | null;
  onSelectSession: (id: string) => void;
  onContextMenu: (
    e: React.MouseEvent,
    type: 'branch',
    projectId: string,
    branchName: string,
  ) => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const newest = getNewestSession(branch);
  const historySessions = branch.sessions.slice(1);
  const busy = newest && ['running', 'queued', 'blocked', 'review'].includes(newest.status);

  return (
    <div
      className="relative rounded-lg group"
      draggable
      data-pid={project.id}
      data-branch={branch.name}
    >
      {/* Branch header */}
      <div
        className="flex items-center gap-1.5 py-1 px-0.5 font-mono text-[11px] text-text-secondary"
        onContextMenu={(e) => onContextMenu(e, 'branch', project.id, branch.name)}
      >
        <GripVertical className="w-2.5 h-2.5 text-text-secondary/30 opacity-0 group-hover:opacity-100 cursor-grab shrink-0" />
        <GitBranch className="w-3 h-3 shrink-0" strokeWidth={1.5} />
        <span className="flex-1 truncate">{branch.name}</span>

        {/* History toggle */}
        {historySessions.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={cn(
              'h-5 min-w-[20px] px-1 rounded flex items-center justify-center gap-0.5 font-mono text-[10px] font-medium text-text-secondary transition-opacity',
              !showHistory && 'opacity-0 group-hover:opacity-100',
              'hover:bg-sidebar-item-hover hover:text-text-primary',
            )}
            title="Session history"
          >
            <ChevronRight
              className={cn('w-3 h-3 transition-transform', showHistory && 'rotate-90')}
            />
            {historySessions.length}
          </button>
        )}

        {/* New session button */}
        <button
          disabled={!!busy}
          className={cn(
            'h-5 min-w-[20px] px-1 rounded flex items-center justify-center text-[#ff6a1f] transition-opacity',
            busy
              ? 'opacity-0 cursor-not-allowed text-text-secondary/30'
              : 'opacity-0 group-hover:opacity-100 hover:bg-sidebar-item-hover',
          )}
          title={busy ? 'This branch already has an active session' : 'New session'}
        >
          <Plus className="w-3 h-3" />
        </button>

        {/* Kebab */}
        <button
          className="w-5 h-5 rounded flex items-center justify-center text-text-secondary opacity-0 group-hover:opacity-100 hover:bg-sidebar-item-hover hover:text-text-primary transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onContextMenu(e, 'branch', project.id, branch.name);
          }}
        >
          <MoreHorizontal className="w-3 h-3" />
        </button>
      </div>

      {/* Newest session card or empty state */}
      {newest ? (
        <SessionCard
          session={newest}
          selectedSessionId={selectedSessionId}
          onSelect={onSelectSession}
        />
      ) : (
        <div className="bg-card border border-divider rounded-lg p-2.5 text-center text-[11px] text-text-secondary/50 cursor-default">
          No sessions yet
        </div>
      )}

      {/* History list */}
      {showHistory && historySessions.length > 0 && (
        <div className="ml-1 mt-1 border-l border-divider flex flex-col">
          {historySessions.map((h) => (
            <div
              key={h.id}
              className={cn(
                'flex items-center gap-2 py-1 px-2 text-[11px] text-text-secondary cursor-pointer hover:bg-sidebar-item-hover rounded',
                selectedSessionId === h.id && 'bg-[rgba(255,106,31,0.09)]',
              )}
              onClick={() => onSelectSession(h.id)}
            >
              <StatusDot status={h.status} size="small" />
              <span className="flex-1 truncate">{h.title}</span>
              <small className="font-mono text-[10px] text-text-secondary/50">
                {h.agents[0]?.name} · {h.time}
              </small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

/** Context menu dropdown */
function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Clamp position to viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(x, window.innerWidth - 220),
    top: Math.min(y, window.innerHeight - items.length * 32 - 20),
    zIndex: 50,
  };

  return (
    <div
      ref={ref}
      style={style}
      className="min-w-[210px] bg-card border border-border rounded-xl p-1 shadow-2xl"
    >
      {items.map((item, i) => {
        if (item.type === 'separator') {
          return <div key={i} className="h-px bg-divider mx-0.5 my-1" />;
        }
        if (item.type === 'label') {
          return (
            <div key={i} className="text-[10.5px] text-text-secondary/50 px-2.5 py-1.5">
              {item.label}
            </div>
          );
        }
        return (
          <div
            key={i}
            onClick={() => {
              item.action?.();
              onClose();
            }}
            className={cn(
              'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs cursor-pointer whitespace-nowrap transition-colors',
              item.danger
                ? 'text-[#ff4757] hover:bg-sidebar-item-hover'
                : item.dim
                  ? 'text-text-secondary hover:bg-sidebar-item-hover'
                  : 'text-text-primary hover:bg-sidebar-item-hover',
            )}
          >
            <span className="w-3.5 shrink-0 text-[#ff6a1f]">{item.icon}</span>
            <span>{item.label}</span>
            {item.shortcut && (
              <span className="ml-auto font-mono text-[10px] text-text-secondary/50">
                {item.shortcut}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface MenuItem {
  type?: 'item' | 'separator' | 'label';
  label?: string;
  icon?: ReactNode;
  action?: () => void;
  danger?: boolean;
  dim?: boolean;
  shortcut?: string;
}

// ─── Main Component ─────────────────────────────────────────────────────

export function ProjectPanel() {
  const projects = useCodeStore((s) => s.projects) as ProjectExtended[];
  const currentProjectId = useCodeStore((s) => s.currentProjectId);
  const setCurrentProject = useCodeStore((s) => s.setCurrentProject);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [liveSimulation, setLiveSimulation] = useState(false);
  const [menuState, setMenuState] = useState<{
    x: number;
    y: number;
    items: MenuItem[];
  } | null>(null);

  // Drag state
  const dragRef = useRef<{
    type: 'project' | 'branch';
    projectId: string;
    branchName?: string;
    el: HTMLElement | null;
  } | null>(null);

  const closeMenu = useCallback(() => setMenuState(null), []);

  // Filter visible projects
  const visibleProjects = projects.filter((p) => showHidden || !p.hidden);
  const hiddenCount = projects.filter((p) => p.hidden).length;

  // ── Context menu builders ──

  const buildProjectMenu = useCallback(
    (project: ProjectExtended): MenuItem[] => {
      const idx = projects.indexOf(project);
      const items: MenuItem[] = [];

      // Branch visibility toggles
      items.push({ type: 'label', label: 'Visible branches' });
      project.branches.forEach((b) => {
        items.push({
          label: b.name,
          icon: b.visible ? <Check className="w-3.5 h-3.5" /> : undefined,
          action: () => {
            b.visible = !b.visible;
          },
        });
      });

      items.push({ type: 'separator' });

      items.push({
        label: 'Move up',
        icon: <ArrowUp className="w-3.5 h-3.5" />,
        dim: true,
        shortcut: `${idx + 1}/${projects.length}`,
      });
      items.push({
        label: 'Move down',
        icon: <ArrowDown className="w-3.5 h-3.5" />,
        dim: true,
      });
      items.push({
        label: project.hidden ? 'Show project' : 'Hide project',
        icon: project.hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />,
        danger: !project.hidden,
      });

      return items;
    },
    [projects],
  );

  const buildBranchMenu = useCallback(
    (project: ProjectExtended, branchName: string): MenuItem[] => {
      return [
        { label: 'Move up', icon: <ArrowUp className="w-3.5 h-3.5" />, dim: true },
        { label: 'Move down', icon: <ArrowDown className="w-3.5 h-3.5" />, dim: true },
        {
          label: 'Hide branch',
          icon: <EyeOff className="w-3.5 h-3.5" />,
          danger: true,
        },
      ];
    },
    [],
  );

  // ── Event handlers ──

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, type: 'project' | 'branch', projectId: string, branchName?: string) => {
      e.preventDefault();
      e.stopPropagation();
      const project = projects.find((p) => p.id === projectId);
      if (!project) return;

      const items =
        type === 'branch' && branchName
          ? buildBranchMenu(project, branchName)
          : buildProjectMenu(project);

      setMenuState({ x: e.clientX, y: e.clientY, items });
    },
    [projects, buildProjectMenu, buildBranchMenu],
  );

  const handleProjectClick = useCallback(
    (projectId: string) => {
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null);
      } else {
        setSelectedProjectId(projectId);
      }
      setCurrentProject(projectId);
    },
    [selectedProjectId, setCurrentProject],
  );

  const handleSelectSession = useCallback((sessionId: string) => {
    setSelectedSessionId((prev) => (prev === sessionId ? null : sessionId));
  }, []);

  // ── Drag & Drop ──

  const handleDragStart = useCallback(
    (e: React.DragEvent, type: 'project' | 'branch', projectId: string, branchName?: string) => {
      dragRef.current = { type, projectId, branchName, el: e.currentTarget as HTMLElement };
      e.dataTransfer.effectAllowed = 'move';
      e.stopPropagation();
      (e.currentTarget as HTMLElement).classList.add('opacity-35');
    },
    [],
  );

  const handleDragEnd = useCallback(() => {
    if (dragRef.current?.el) {
      dragRef.current.el.classList.remove('opacity-35');
    }
    dragRef.current = null;
    document
      .querySelectorAll('.ring-1')
      .forEach((el) => el.classList.remove('ring-1', 'ring-[#ff6a1f]'));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!dragRef.current) return;
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    document
      .querySelectorAll('.ring-1')
      .forEach((el) => el.classList.remove('ring-1', 'ring-[#ff6a1f]'));
    target.classList.add('ring-1', 'ring-[#ff6a1f]');
  }, []);

  const handleDrop = useCallback(
    (
      e: React.DragEvent,
      targetType: 'project' | 'branch',
      targetProjectId: string,
      targetBranchName?: string,
    ) => {
      e.preventDefault();
      document
        .querySelectorAll('.ring-1')
        .forEach((el) => el.classList.remove('ring-1', 'ring-[#ff6a1f]'));
      if (!dragRef.current) return;

      const drag = dragRef.current;
      dragRef.current = null;

      if (drag.type === 'project' && targetType === 'project') {
        const srcIdx = projects.findIndex((p) => p.id === drag.projectId);
        const dstIdx = projects.findIndex((p) => p.id === targetProjectId);
        if (srcIdx !== -1 && dstIdx !== -1 && srcIdx !== dstIdx) {
          const reordered = [...projects];
          const [moved] = reordered.splice(srcIdx, 1);
          reordered.splice(dstIdx, 0, moved);
          logger.info('[ProjectPanel] Reordered projects', { from: srcIdx, to: dstIdx });
        }
      } else if (
        drag.type === 'branch' &&
        targetType === 'branch' &&
        drag.projectId === targetProjectId
      ) {
        const project = projects.find((p) => p.id === drag.projectId);
        if (project && drag.branchName && targetBranchName) {
          const srcIdx = project.branches.findIndex((b) => b.name === drag.branchName);
          const dstIdx = project.branches.findIndex((b) => b.name === targetBranchName);
          if (srcIdx !== -1 && dstIdx !== -1 && srcIdx !== dstIdx) {
            const [moved] = project.branches.splice(srcIdx, 1);
            project.branches.splice(dstIdx, 0, moved);
            logger.info('[ProjectPanel] Reordered branches', {
              project: project.name,
              from: srcIdx,
              to: dstIdx,
            });
          }
        }
      }
    },
    [projects],
  );

  // ── Render ──

  return (
    <div className="flex flex-col h-full w-[340px] shrink-0 bg-sidebar-background border-r border-border overflow-hidden">
      {/* Header */}
      <div className="px-3 h-[44px] flex items-center justify-between border-b border-divider shrink-0">
        <b className="text-[13px] font-semibold text-text-primary">
          Projects
          <span className="font-medium text-[10.5px] font-mono text-text-secondary/50 ml-1.5">
            {visibleProjects.length}
          </span>
        </b>
        <div className="flex gap-1 items-center">
          {/* Live simulation toggle */}
          <button
            onClick={() => setLiveSimulation(!liveSimulation)}
            className={cn(
              'w-[26px] h-[26px] rounded-md flex items-center justify-center transition-colors',
              liveSimulation
                ? 'text-[#ff6a1f] bg-[rgba(255,106,31,0.1)]'
                : 'text-text-secondary hover:bg-sidebar-item-hover hover:text-text-primary',
            )}
            title="Simulate live activity"
          >
            <Zap className="w-3.5 h-3.5" />
          </button>
          {/* Show hidden toggle */}
          <button
            onClick={() => setShowHidden(!showHidden)}
            className={cn(
              'w-[26px] h-[26px] rounded-md flex items-center justify-center text-text-secondary transition-colors relative',
              showHidden
                ? 'text-[#ff6a1f] bg-[rgba(255,106,31,0.1)]'
                : 'hover:bg-sidebar-item-hover hover:text-text-primary',
            )}
            title="Show hidden projects"
          >
            <Eye className="w-3.5 h-3.5" />
            {hiddenCount > 0 && (
              <i className="absolute -top-0.5 -right-0.5 font-mono text-[8px] font-semibold bg-[#4a4d57] text-white rounded px-1 leading-tight">
                {hiddenCount}
              </i>
            )}
          </button>
          {/* Add project */}
          <button
            className="w-[26px] h-[26px] rounded-md flex items-center justify-center text-text-secondary hover:bg-sidebar-item-hover hover:text-text-primary transition-colors"
            title="Add project"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto flex flex-col [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-sm">
        {visibleProjects.length === 0 ? (
          <div className="text-center text-text-secondary/50 text-[11.5px] py-6 px-2.5">
            No projects found.
          </div>
        ) : (
          visibleProjects.map((project) => {
            const isSelected = selectedProjectId === project.id;
            const status = getProjectStatus(project);
            const tally = getProjectTally(project);
            const visBranches = getVisibleBranches(project);

            // Active branches for collapsed view
            const activeBranches = visBranches.filter((b) =>
              ['running', 'review', 'blocked', 'queued'].includes(getBranchStatus(b)),
            );

            return (
              <div
                key={project.id}
                className={cn(
                  'relative border-b border-divider',
                  isSelected &&
                    'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-[#ff6a1f]',
                  project.hidden && 'opacity-50',
                )}
                draggable
                onDragStart={(e) => handleDragStart(e, 'project', project.id)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'project', project.id)}
                onContextMenu={(e) => handleContextMenu(e, 'project', project.id)}
              >
                {/* Project top row */}
                <div
                  className="flex items-center gap-2 px-3 py-[11px] cursor-pointer select-none hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                  onClick={() => handleProjectClick(project.id)}
                >
                  <ProjectStatusIcon status={status} />
                  <span
                    className={cn(
                      'font-semibold text-[12.5px] truncate flex-1 min-w-0 transition-colors',
                      isSelected ? 'text-text-primary' : 'text-text-secondary',
                      'group-hover:text-text-primary',
                    )}
                  >
                    {project.name}
                  </span>
                  {project.hidden && (
                    <span className="text-[9.5px] text-text-secondary/50 border border-border rounded px-1.5">
                      hidden
                    </span>
                  )}
                  {!isSelected && activeBranches.length > 0 && (
                    <span className="flex gap-1.5 items-center">
                      {(
                        ['blocked', 'running', 'review', 'queued'] as SessionStatus[]
                      )
                        .filter((k) => tally[k])
                        .map((k) => (
                          <span
                            key={k}
                            className={cn(
                              'inline-flex items-center gap-1 font-mono text-[10.5px] font-medium',
                              STATUS_TEXT_COLORS[k],
                            )}
                          >
                            <StatusDot status={k} size="small" />
                            {tally[k]}
                          </span>
                        ))}
                    </span>
                  )}
                  <button
                    className="w-5 h-5 rounded flex items-center justify-center text-text-secondary opacity-0 group-hover:opacity-100 hover:bg-sidebar-item-hover hover:text-text-primary transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContextMenu(e, 'project', project.id);
                    }}
                  >
                    <MoreHorizontal className="w-3 h-3" />
                  </button>
                  <ChevronRight
                    className={cn(
                      'w-3 h-3 text-text-secondary/50 transition-transform -ml-0.5',
                      isSelected && 'rotate-90 text-text-secondary',
                    )}
                  />
                </div>

                {/* Collapsed: active branches list with agent avatars */}
                {!isSelected && (
                  <div
                    className="px-2 pb-2.5 pl-[22px] flex flex-col gap-0.5 cursor-pointer"
                    onClick={() => handleProjectClick(project.id)}
                  >
                    {activeBranches.length > 0 ? (
                      activeBranches.slice(0, 4).map((b) => {
                        const newest = getNewestSession(b)!;
                        return (
                          <div
                            key={b.name}
                            className={cn(
                              'flex items-center gap-2 px-1.5 py-[3px] rounded-md text-[10.5px] min-w-0 transition-colors',
                              selectedSessionId === newest.id
                                ? 'bg-[rgba(255,106,31,0.09)]'
                                : 'hover:bg-sidebar-item-hover',
                            )}
                          >
                            <span className="flex-1 truncate font-mono font-medium text-text-primary">
                              {b.name.replace(/^(feature|fix|hotfix|release)\//, '')}
                            </span>
                            <span className="flex gap-1.5 items-center shrink-0">
                              {newest.agents.slice(0, 4).map((a, i) => (
                                <AgentAvatarSmall
                                  key={i}
                                  agent={a}
                                  sessionStatus={newest.status}
                                />
                              ))}
                              {newest.agents.length > 4 && (
                                <span className="font-mono text-[10px] text-text-secondary/50">
                                  +{newest.agents.length - 4}
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-1.5 py-[3px] text-[10.5px] text-text-secondary/50 font-normal">
                        All quiet · {visBranches.length} branch
                        {visBranches.length === 1 ? '' : 'es'} idle
                      </div>
                    )}
                    {activeBranches.length > 4 && (
                      <div className="px-1.5 py-[3px] text-[10px] text-text-secondary/50 font-mono">
                        +{activeBranches.length - 4} more active
                      </div>
                    )}
                  </div>
                )}

                {/* Expanded body with enter animation */}
                {isSelected && (
                  <div className="px-3 pb-3.5 pl-7 flex flex-col gap-3.5 relative pp-enter">
                    {/* Vertical guide line */}
                    <div className="absolute left-[15.5px] top-0 bottom-3.5 w-px bg-divider" />

                    {visBranches.length > 0 ? (
                      visBranches.map((branch) => (
                        <div
                          key={branch.name}
                          draggable
                          onDragStart={(e) =>
                            handleDragStart(e, 'branch', project.id, branch.name)
                          }
                          onDragEnd={handleDragEnd}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, 'branch', project.id, branch.name)}
                        >
                          <BranchBlock
                            project={project}
                            branch={branch}
                            selectedSessionId={selectedSessionId}
                            onSelectSession={handleSelectSession}
                            onContextMenu={handleContextMenu}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-text-secondary/50 text-[11.5px] py-6">
                        No branches shown.
                        <br />
                        Right-click the project to add one.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Context menu portal */}
      {menuState && (
        <ContextMenu x={menuState.x} y={menuState.y} items={menuState.items} onClose={closeMenu} />
      )}
    </div>
  );
}

export default ProjectPanel;