/**
 * ------------------------------------------------------------------
 * Content Header Bar
 * ------------------------------------------------------------------
 * Extracted from ContentPanel/index.tsx
 * Displays project name, branch, session info, and global actions
 * depending on the current view mode (workspace/tasks/files).
 * ------------------------------------------------------------------
 */

import { useState, useEffect, useMemo, useRef, type ReactElement } from 'react';
import type { ContentViewMode } from '../../shared/stores/code.store';
import {
  Workflow,
  Loader2,
  RefreshCw,
  GitBranch,
  Filter,
  Search,
  Plus,
  MoreVertical,
  Archive,
  Palette,
  FileText,
  Link2,
  GitCommit,
  ArrowUp,
  ArrowDown,
  Cpu,
  Clock,
  Coins,
  Bell,
  Terminal,
  Check,
  SlidersHorizontal,
} from 'lucide-react';
import { useCodeStore } from '../../shared/stores/code.store';
import { useDesignStore } from '../../features/design/stores/design.store';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import { useAccentColors } from '@renderer/hooks/useAccentColors';

import { useSessionTasks } from '../../features/projects/hooks/useSessionTasks';
import { codeApi } from '../../shared/api/code.api';
import { getTempSessionName } from '../../features/projects/utils/session.util';
import {
  getProjectIdentity,
  ProjectIcon,
} from '../../features/projects/components/ProjectCard/ProjectIcon';
import { ArchivedTasksModal } from '../../features/tasks/components/modals/ArchivedTasksModal';

// ─── Helpers ────────────────────────────────────────────────────────────────

// ─── Workspace header widgets (fake UI + inline mock data) ──────────────────

type HeaderWidgetId =
  | 'git'
  | 'commit'
  | 'agent'
  | 'context'
  | 'cost'
  | 'timer'
  | 'procs'
  | 'layout'
  | 'notifications';

const HEADER_WIDGETS: { id: HeaderWidgetId; label: string; hint: string }[] = [
  { id: 'git', label: 'Git status', hint: 'ahead/behind + file thay doi' },
  { id: 'commit', label: 'Last commit', hint: 'hash + message + thoi gian' },
  { id: 'agent', label: 'Agent', hint: 'model + trang thai chay' },
  { id: 'context', label: 'Context usage', hint: 'thanh % token da dung' },
  { id: 'cost', label: 'Usage today', hint: 'token + chi phi hom nay' },
  { id: 'timer', label: 'Session timer', hint: 'thoi gian session dang chay' },
  { id: 'procs', label: 'Processes', hint: 'terminal/dev server dang live' },
  { id: 'layout', label: 'Layout', hint: 'chuyen bo cuc pane' },
  { id: 'notifications', label: 'Notifications', hint: 'chuong thong bao' },
];

const DEFAULT_ENABLED_WIDGETS: HeaderWidgetId[] = ['git', 'agent', 'context', 'timer', 'procs'];

const MOCK_HEADER_DATA = {
  git: { ahead: 2, behind: 0, changed: 5, staged: 2 },
  commit: {
    hash: 'a3f91c2',
    message: 'feat(workspace): open files as tabs',
    minutesAgo: 14,
  },
  agent: { provider: 'Claude', model: 'Sonnet', status: 'running' as 'running' | 'idle' },
  context: { used: 78400, limit: 128000 },
  cost: { tokens: 412300, usd: 1.42 },
  timerStartOffsetSec: 5076,
  procs: [
    { cmd: 'npm run dev', port: 5173 },
    { cmd: 'zen-cli', port: undefined as number | undefined },
    { cmd: 'tsc --watch', port: undefined as number | undefined },
  ],
  layouts: ['1x1', '2x1', '1x2', '2x2'] as const,
  notifications: 3,
};

const CHIP =
  'h-[26px] px-2 rounded-md border border-border bg-card-hover/40 flex items-center gap-1.5 text-[11px] text-text-secondary shrink-0 whitespace-nowrap select-none cursor-default';

const formatTokens = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

const formatClock = (total: number) => {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
};

function GitWidget() {
  const { ahead, behind, changed, staged } = MOCK_HEADER_DATA.git;
  return (
    <span className={CHIP} title={`${staged} staged, ${changed - staged} unstaged`}>
      <GitBranch className="w-3 h-3" strokeWidth={1.5} />
      <span className="flex items-center text-green-400">
        <ArrowUp className="w-3 h-3" />
        {ahead}
      </span>
      <span className="flex items-center text-text-secondary">
        <ArrowDown className="w-3 h-3" />
        {behind}
      </span>
      <span className="w-px h-3 bg-border" />
      <span className="text-yellow-400">{changed} changed</span>
    </span>
  );
}

function CommitWidget() {
  const { hash, message, minutesAgo } = MOCK_HEADER_DATA.commit;
  return (
    <span className={`${CHIP} max-w-[260px]`} title={message}>
      <GitCommit className="w-3 h-3 shrink-0" strokeWidth={1.5} />
      <span className="font-mono text-primary">{hash}</span>
      <span className="truncate">{message}</span>
      <span className="text-text-secondary/60">{minutesAgo}m</span>
    </span>
  );
}

function AgentWidget() {
  const { provider, model, status } = MOCK_HEADER_DATA.agent;
  const running = status === 'running';
  return (
    <span className={CHIP}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${running ? 'bg-green-400 animate-pulse' : 'bg-text-secondary/50'}`}
      />
      <Cpu className="w-3 h-3" strokeWidth={1.5} />
      <span className="text-text-primary">{provider}</span>
      <span className="text-text-secondary/70">{model}</span>
      <span className={running ? 'text-green-400' : ''}>{running ? 'Running' : 'Idle'}</span>
    </span>
  );
}

function ContextWidget() {
  const { used, limit } = MOCK_HEADER_DATA.context;
  const pct = Math.round((used / limit) * 100);
  const bar = pct > 85 ? 'bg-red-400' : pct > 60 ? 'bg-yellow-400' : 'bg-primary';
  return (
    <span className={CHIP} title={`${used.toLocaleString()} / ${limit.toLocaleString()} tokens`}>
      <span>Context</span>
      <span className="w-16 h-1.5 rounded-full bg-border overflow-hidden">
        <span className={`block h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-text-primary">{pct}%</span>
    </span>
  );
}

function CostWidget() {
  const { tokens, usd } = MOCK_HEADER_DATA.cost;
  return (
    <span className={CHIP} title="Usage today">
      <Coins className="w-3 h-3" strokeWidth={1.5} />
      <span>{formatTokens(tokens)} tok</span>
      <span className="text-text-primary">${usd.toFixed(2)}</span>
    </span>
  );
}

function TimerWidget() {
  const [seconds, setSeconds] = useState(MOCK_HEADER_DATA.timerStartOffsetSec);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className={CHIP} title="Session uptime">
      <Clock className="w-3 h-3" strokeWidth={1.5} />
      <span className="font-mono text-text-primary">{formatClock(seconds)}</span>
    </span>
  );
}

function ProcsWidget() {
  const procs = MOCK_HEADER_DATA.procs;
  const ports = procs.filter((p) => p.port).map((p) => `:${p.port}`);
  return (
    <span className={CHIP} title={procs.map((p) => p.cmd).join('\n')}>
      <Terminal className="w-3 h-3" strokeWidth={1.5} />
      <span className="text-text-primary">{procs.length} live</span>
      {ports.length > 0 && <span className="font-mono text-primary">{ports.join(' ')}</span>}
    </span>
  );
}

function LayoutWidget() {
  const [active, setActive] = useState<string>('2x1');
  const cells: Record<string, string> = {
    '1x1': 'grid-cols-1 grid-rows-1',
    '2x1': 'grid-cols-2 grid-rows-1',
    '1x2': 'grid-cols-1 grid-rows-2',
    '2x2': 'grid-cols-2 grid-rows-2',
  };
  const count: Record<string, number> = { '1x1': 1, '2x1': 2, '1x2': 2, '2x2': 4 };
  return (
    <span className="h-[26px] px-1 rounded-md border border-border bg-card-hover/40 flex items-center gap-0.5 shrink-0">
      {MOCK_HEADER_DATA.layouts.map((key) => (
        <button
          key={key}
          onClick={() => setActive(key)}
          title={`Layout ${key}`}
          className={`w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-colors ${active === key ? 'bg-primary/20 text-primary' : 'text-text-secondary hover:bg-white/10'}`}
        >
          <span className={`grid gap-px w-3 h-3 ${cells[key]}`}>
            {Array.from({ length: count[key] }).map((_, i) => (
              <span key={i} className="rounded-[1px] bg-current opacity-80" />
            ))}
          </span>
        </button>
      ))}
    </span>
  );
}

function NotificationsWidget() {
  const count = MOCK_HEADER_DATA.notifications;
  return (
    <button
      className="relative w-[26px] h-[26px] rounded-md flex items-center justify-center text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors cursor-pointer shrink-0"
      title="Notifications"
    >
      <Bell className="w-3.5 h-3.5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-1 rounded-full bg-red-500 text-white text-[9px] leading-[14px] text-center">
          {count}
        </span>
      )}
    </button>
  );
}

const WIDGET_COMPONENTS: Record<HeaderWidgetId, () => ReactElement> = {
  git: GitWidget,
  commit: CommitWidget,
  agent: AgentWidget,
  context: ContextWidget,
  cost: CostWidget,
  timer: TimerWidget,
  procs: ProcsWidget,
  layout: LayoutWidget,
  notifications: NotificationsWidget,
};

export function WorkspaceHeaderWidgets() {
  const [enabled, setEnabled] = useState<HeaderWidgetId[]>(DEFAULT_ENABLED_WIDGETS);

  const toggle = (id: HeaderWidgetId) =>
    setEnabled((prev) => (prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]));

  return (
    <div className="min-w-0 flex items-center gap-1.5 overflow-hidden">
      {HEADER_WIDGETS.filter((w) => enabled.includes(w.id)).map((w) => {
        const Widget = WIDGET_COMPONENTS[w.id];
        return <Widget key={w.id} />;
      })}

      <Dropdown trigger="click" align="end">
        <DropdownTrigger asChild>
          <button
            className="w-[26px] h-[26px] rounded-md flex items-center justify-center text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors cursor-pointer shrink-0"
            title="Chon widget hien thi"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </DropdownTrigger>
        <DropdownContent>
          {HEADER_WIDGETS.map((w) => (
            <DropdownItem key={w.id} onClick={() => toggle(w.id)}>
              <span className="flex items-center gap-2 w-full">
                <span className="w-3.5 h-3.5 flex items-center justify-center">
                  {enabled.includes(w.id) && <Check className="w-3.5 h-3.5 text-primary" />}
                </span>
                <span>{w.label}</span>
                <span className="ml-auto pl-3 text-[10px] text-text-secondary/60">{w.hint}</span>
              </span>
            </DropdownItem>
          ))}
        </DropdownContent>
      </Dropdown>
    </div>
  );
}

/** Height matches ProjectPanel header (h-[44px]) */
const CONTENT_HEADER_HEIGHT = 44;

// ─── Content Header Bar Component ───────────────────────────────────────────

export function ContentHeaderBar() {
  const contentViewMode = useCodeStore((s) => s.contentViewMode);
  const setContentViewMode = useCodeStore((s) => s.setContentViewMode);
  const lastViewModeRef = useRef<ContentViewMode>('workspace');

  useEffect(() => {
    if (contentViewMode !== 'agents' && contentViewMode !== 'settings') {
      lastViewModeRef.current = contentViewMode;
    }
  }, [contentViewMode]);

  const hasOrchestrator = useCodeStore((s) => {
    const project = s.projects.find((p) => p.id === s.currentProjectId);
    return !!project?.workspacePanels?.some(
      (w) => w.workflowAgentId === 'orchestrator' && w.sessionId === s.activeWorkspaceSessionId,
    );
  });

  const toggleAgents = () =>
    setContentViewMode(contentViewMode === 'agents' ? lastViewModeRef.current : 'agents');

  const currentProjectId = useCodeStore((s) => s.currentProjectId);
  const projectName = useCodeStore((s) => {
    const p = s.projects.find((p) => p.id === s.currentProjectId);
    return p?.name ?? '';
  });
  const projectPath = useCodeStore((s) => {
    const p = s.projects.find((p) => p.id === s.currentProjectId);
    return p?.path ?? '';
  });

  const projectLogoPath = useCodeStore(
    (s) => s.projects.find((p) => p.id === s.currentProjectId)?.logoPath ?? null,
  );

  const activeWorkspaceSessionId = useCodeStore((s) => s.activeWorkspaceSessionId);

  const activeDesign = useDesignStore(
    (s) => s.designs.find((d) => d.id === s.activeDesignId) ?? null,
  );
  const designLoading = useDesignStore((s) => s.loading);
  const loadDesigns = useDesignStore((s) => s.loadDesigns);

  const { accentColors, toRgba } = useAccentColors();
  const identity = useMemo(
    () => getProjectIdentity((currentProjectId ?? '') + projectName),
    [currentProjectId, projectName],
  );

  const [gitBranch, setBranch] = useState<string | null>(null);

  useEffect(() => {
    if (!projectPath) {
      setBranch(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const gitHead = projectPath.replace(/\/$/, '') + '/.git/HEAD';
        const content: string = await codeApi.fs.readFile(gitHead, true);
        const match = content?.match(/^ref: refs\/heads\/(.+)$/m);
        if (!cancelled) setBranch(match ? match[1].trim() : null);
      } catch {
        if (!cancelled) setBranch(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  // Get active session info
  const activeSession = useMemo(() => {
    if (!activeWorkspaceSessionId || !currentProjectId) return null;
    const project = useCodeStore.getState().projects.find((p) => p.id === currentProjectId);
    if (!project || !project.branches) return null;

    for (const b of project.branches) {
      const s = b.sessions.find((sess) => sess.id === activeWorkspaceSessionId);
      if (s) return s;
    }
    return null;
  }, [activeWorkspaceSessionId, currentProjectId]);

  const sessionBranchName = useMemo(() => {
    if (!activeWorkspaceSessionId || !currentProjectId) return null;
    const project = useCodeStore.getState().projects.find((p) => p.id === currentProjectId);
    const owner = project?.branches?.find((b) =>
      b.sessions.some((sess) => sess.id === activeWorkspaceSessionId),
    );
    return owner?.name ?? null;
  }, [activeWorkspaceSessionId, currentProjectId]);

  const branch = sessionBranchName ?? gitBranch;

  const sessionTask = useSessionTasks((s) =>
    activeWorkspaceSessionId ? s.bySession[activeWorkspaceSessionId] : undefined,
  );
  const sessionDisplayName = activeSession
    ? (sessionTask?.title ??
      getTempSessionName(activeSession.id, projectName ?? '', sessionBranchName ?? gitBranch ?? ''))
    : '';

  // TaskManager specific state
  const [searchQuery, setSearchQuery] = useState('');

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterCount, setFilterCount] = useState(0);

  useEffect(() => {
    if (contentViewMode !== 'tasks') {
      setFilterOpen(false);
      setFilterCount(0);
    }
  }, [contentViewMode]);

  useEffect(() => {
    const onCount = (e: Event) => setFilterCount((e as CustomEvent<number>).detail ?? 0);
    window.addEventListener('phantoma:task-filter-count', onCount);
    return () => window.removeEventListener('phantoma:task-filter-count', onCount);
  }, []);

  const handleFilterToggle = () => {
    const next = !filterOpen;
    setFilterOpen(next);
    window.dispatchEvent(new CustomEvent('phantoma:task-filter-open', { detail: next }));
  };

  const handleNewTaskClick = () => {
    window.dispatchEvent(new CustomEvent('phantoma:new-task'));
  };

  return (
    <>
      <div
        className="w-full shrink-0 border-b border-border bg-panel-background/80 backdrop-blur-sm px-4 flex items-center gap-3"
        style={{ height: CONTENT_HEADER_HEIGHT }}
      >
        {/* LEFT SECTION: Session Name + Branch Badge */}
        <div className="flex-1 min-w-0 flex items-center gap-3 z-10">
          {contentViewMode === 'tasks' && (
            <>
              <ProjectIcon color={identity.color} Icon={identity.Icon} logoPath={projectLogoPath} />
              <span className="text-sm font-semibold text-text-primary truncate">
                {projectName}
              </span>
            </>
          )}

          {contentViewMode === 'git' && (
            <span className="text-sm font-semibold text-text-primary truncate">{projectName}</span>
          )}

          {contentViewMode === 'design' && (
            <>
              <span className="w-[26px] h-[26px] rounded-md flex items-center justify-center shrink-0 bg-primary/15 text-primary">
                <Palette className="w-3.5 h-3.5" />
              </span>
              <span className="text-sm font-semibold text-text-primary truncate">
                {activeDesign?.name ?? 'Design'}
              </span>
              {activeDesign && (
                <>
                  <span
                    title={`${activeDesign.nodes.length} pages`}
                    className="flex items-center gap-1 text-[11px] text-text-secondary shrink-0"
                  >
                    <FileText className="w-3 h-3" />
                    <span className="font-mono">{activeDesign.nodes.length}</span>
                  </span>
                  <span
                    title={`${activeDesign.edges.length} links`}
                    className="flex items-center gap-1 text-[11px] text-text-secondary shrink-0"
                  >
                    <Link2 className="w-3 h-3" />
                    <span className="font-mono">{activeDesign.edges.length}</span>
                  </span>
                </>
              )}
            </>
          )}

          {contentViewMode === 'settings' && (
            <span className="text-sm font-semibold text-text-primary truncate">Settings</span>
          )}

          {contentViewMode === 'agents' && (
            <>
              <span className="w-[26px] h-[26px] rounded-md flex items-center justify-center shrink-0 bg-primary/15 text-primary">
                <Workflow className="w-3.5 h-3.5" />
              </span>
              <span className="text-sm font-semibold text-text-primary truncate">
                Agent Workflow
              </span>
            </>
          )}

          {contentViewMode === 'workspace' && activeSession && (
            <>
              <span
                className="text-sm font-semibold text-text-primary truncate max-w-[200px]"
                title={sessionDisplayName}
              >
                {sessionDisplayName}
              </span>

              {/* Branch Badge next to Session Name */}
              {branch &&
                (() => {
                  let hash = 0;
                  for (let i = 0; i < branch.length; i++) {
                    hash = (hash << 5) - hash + branch.charCodeAt(i);
                    hash |= 0;
                  }
                  const colorIndex = Math.abs(hash) % accentColors.length;
                  const branchColor = accentColors[colorIndex];

                  return (
                    <span
                      className="flex items-center gap-1.5 text-[11px] font-mono px-1.5 py-0.5 rounded cursor-default border shrink-0"
                      style={{
                        color: branchColor,
                        backgroundColor: toRgba(branchColor, 0.1),
                        borderColor: toRgba(branchColor, 0.2),
                      }}
                    >
                      <GitBranch className="w-3 h-3" strokeWidth={1.5} />
                      {branch}
                    </span>
                  );
                })()}
            </>
          )}
        </div>

        {/* RIGHT SECTION: Actions */}
        <div className="shrink-0 flex items-center gap-2 z-10">
          {/* Task Manager Controls — Only visible when tasks view is active */}
          {contentViewMode === 'tasks' && (
            <>
              {/* Search Bar */}
              <div className="relative w-64">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    window.dispatchEvent(
                      new CustomEvent('phantoma:task-search', { detail: e.target.value }),
                    );
                  }}
                  placeholder="Search tasks..."
                  className="w-full pl-7 pr-2 py-1.5 text-xs bg-input-background border border-border rounded-md text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-0 transition-colors"
                />
              </div>

              <button
                onClick={() => setArchiveOpen(true)}
                className="w-[26px] h-[26px] rounded-md flex items-center justify-center text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors cursor-pointer"
                title="Archived tasks"
              >
                <Archive className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleFilterToggle}
                className={`relative w-[26px] h-[26px] rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                  filterOpen
                    ? 'bg-primary/15 text-primary'
                    : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'
                }`}
                title="Filter"
              >
                <Filter className="w-3.5 h-3.5" />
                {filterCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-primary text-[9px] leading-[14px] text-center text-white">
                    {filterCount}
                  </span>
                )}
              </button>

              <button
                onClick={handleNewTaskClick}
                className="w-[26px] h-[26px] rounded-md flex items-center justify-center bg-primary/15 text-primary hover:bg-primary/25 transition-colors cursor-pointer"
                title="New Task"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {contentViewMode === 'design' && (
            <button
              onClick={() => projectPath && void loadDesigns(projectPath)}
              disabled={designLoading || !projectPath}
              className="w-[26px] h-[26px] rounded-md flex items-center justify-center text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Reload designs"
            >
              {designLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {(hasOrchestrator || contentViewMode === 'agents') && (
            <button
              onClick={toggleAgents}
              title={contentViewMode === 'agents' ? 'Close Agent Workflow' : 'Open Agent Workflow'}
              className={`w-[26px] h-[26px] rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                contentViewMode === 'agents'
                  ? 'bg-primary/15 text-primary'
                  : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'
              }`}
            >
              <Workflow className="w-3.5 h-3.5" />
            </button>
          )}

          {contentViewMode !== 'tasks' && contentViewMode !== 'settings' && (
            <Dropdown trigger="click" align="end">
              <DropdownTrigger asChild>
                <button
                  className="w-[26px] h-[26px] rounded-md flex items-center justify-center text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors cursor-pointer"
                  title="More options"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </DropdownTrigger>
              <DropdownContent>
                <DropdownItem disabled>No actions available yet</DropdownItem>
              </DropdownContent>
            </Dropdown>
          )}
        </div>
      </div>
      <ArchivedTasksModal
        isOpen={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        projectPath={projectPath}
      />
    </>
  );
}
