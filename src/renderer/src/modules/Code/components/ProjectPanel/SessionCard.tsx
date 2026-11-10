/**
 * ------------------------------------------------------------------
 * Session Card — aligned with ProjectPanel.html mockup
 * ------------------------------------------------------------------
 * Renders a single session card: status dot, task row, agent chips,
 * hint, background processes and summary stats.
 * Also exports shared types, constants, helpers and small building
 * blocks (StatusDot, TaskIcon, AgentAvatar, ProcessPill …) used by
 * SessionCard, ProjectCard and ProjectPanel.
 * Animations use pp-* classes defined in global styles/animations.css.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { memo, useEffect, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';

// ── Icons ─
import { Terminal, Loader2, AlertTriangle } from 'lucide-react';

// ── Utils ──
import { cn } from '@renderer/utils/cn';
import { getFaviconUrl } from '@renderer/utils/favicon';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import { Row, TOOLTIP_CLASS } from '../FooterTooltips';

// ── Task link ──
import { useCodeStore } from '../../hooks/useCodeStore';
import { useScopeStats } from '../../stores/useScopeStatsStore';
import { useSessionTasks } from '../../hooks/useSessionTasks';
import { useWorkflowSubTasks } from '../../hooks/useWorkflowSubTasks';
import type { StoredTask } from '../../services/task.service';
import { TASK_DRAG_TYPE } from '../ContentPanel/TaskManager/taskDrag';

export function getTempSessionName(
  sessionId: string,
  projectName: string,
  branchName: string,
): string {
  const ts = Number(sessionId.replace(/^n/, ''));
  const time =
    ts > 1e12
      ? new Date(ts).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      : sessionId.slice(-4);
  return `${projectName} · ${branchName} · ${time}`;
}

// Helper to map common AI Agent names/IDs to their official domains for favicon fetching
const AGENT_DOMAIN_MAP: Record<string, string> = {
  claude: 'https://claude.ai',
  codex: 'https://openai.com',
  gemini: 'https://gemini.google.com',
  copilot: 'https://github.com/features/copilot',
  cursor: 'https://cursor.sh',
  aider: 'https://aider.chat',
  goose: 'https://goose.block.co',
  amp: 'https://sourcegraph.com/amp',
  opencode: 'https://opencode.ai',
  cline: 'https://cline.bot',
  continue: 'https://continue.dev',
  qoder: 'https://qoder.ai',
  grok: 'https://grok.x.ai',
  kimi: 'https://moonshot.cn',
  droid: 'https://droid.app',
  hermes: 'https://nousresearch.com',
  aug: 'https://augmentcode.com',
  trae: 'https://trae.ai',
  zcode: 'https://zcode.io',
  devin: 'https://devin.ai',
  kiro: 'https://kiro.dev',
};

function getAgentFavicon(agentName: string): string | undefined {
  // Normalize name to lowercase and check against map keys
  const lowerName = agentName.toLowerCase();
  // Check exact match first
  if (AGENT_DOMAIN_MAP[lowerName]) {
    return getFaviconUrl(AGENT_DOMAIN_MAP[lowerName]);
  }
  // Check partial matches for variations like "Claude Code", "Gemini CLI" etc.
  for (const [key, domain] of Object.entries(AGENT_DOMAIN_MAP)) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      return getFaviconUrl(domain);
    }
  }
  return undefined;
}
// ─── Types ──────────────────────────────────────────────────────────────

export type SessionStatus = 'running' | 'review' | 'blocked' | 'queued' | 'done' | 'idle';
export type TaskStatus = 'todo' | 'progress' | 'done';
export type ProcessStatus = 'live' | 'busy' | 'crashed';
/** Visual state of an agent avatar ring */
export type AgentVisualState = 'run' | 'err' | 'wait' | 'que' | 'done';

export interface MenuPosition {
  top: number;
  left: number;
}

export interface SubAgentInfo {
  name: string;
  status: SessionStatus;
}

export interface AgentInfo {
  name: string;
  color: string;
  initials: string;
  /** 'running' = working */
  status: SessionStatus;
  subs?: SubAgentInfo[];
}

export interface TaskInfo {
  id: string;
  title: string;
  status: TaskStatus;
}

export interface ProcessInfo {
  cmd: string;
  status: ProcessStatus;
  port?: number;
  exitCode?: number;
  terminalId?: string;
  panelId?: string;
}

export interface SessionSummary {
  tokens: number;
  cost: number;
  added: number;
  removed: number;
  files: number;
  duration: string;
}

export interface SessionInfo {
  id: string;
  title: string;
  status: SessionStatus;
  time: string;
  agents: AgentInfo[];
  summary: SessionSummary;
  hint?: string;
  task?: TaskInfo;
  procs?: ProcessInfo[];
}

export interface BranchInfo {
  name: string;
  visible: boolean;
  sessions: SessionInfo[];
  path?: string;
  remote?: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────

export const STATUS_ORDER: SessionStatus[] = [
  'blocked',
  'running',
  'review',
  'queued',
  'done',
  'idle',
];

export const STATUS_LABELS: Record<SessionStatus, string> = {
  running: 'Running',
  review: 'Review',
  blocked: 'Blocked',
  queued: 'Queued',
  done: 'Done',
  idle: 'Idle',
};

/** Dot background per status (mockup: running green, review amber, done teal) */
export const STATUS_COLORS: Record<SessionStatus, string> = {
  running: 'bg-[#3ddc84]',
  review: 'bg-[#ffb020]',
  blocked: 'bg-[#ff4757]',
  queued: 'bg-[#4a4d57]',
  done: 'bg-[#32c8be]',
  idle: 'border-[2px] [border-style:dashed] [border-spacing:2px] border-text-secondary/50 bg-transparent',
};

export const STATUS_TEXT_COLORS: Record<SessionStatus, string> = {
  running: 'text-[#3ddc84]',
  review: 'text-[#ffb020]',
  blocked: 'text-[#ff4757]',
  queued: 'text-text-secondary',
  done: 'text-[#32c8be]',
  idle: 'text-text-secondary/50',
};

export const TASK_STATUSES: [TaskStatus, string][] = [
  ['todo', 'To do'],
  ['progress', 'In progress'],
  ['done', 'Done'],
];
export const TASK_COLORS: Record<TaskStatus, string> = {
  todo: '#6b7280',
  progress: '#3b82f6',
  done: '#10b981',
};
export const PROCESS_COLORS: Record<ProcessStatus, string> = {
  live: '#3ddc84',
  busy: '#4fa8e0',
  crashed: '#ff4757',
};

export const AGENT_STATE_LABELS: Record<AgentVisualState, string> = {
  run: 'Running',
  err: 'Error',
  wait: 'Waiting for you',
  que: 'Queued',
  done: 'Done',
};

const AGENT_STATE_ORDER: AgentVisualState[] = ['err', 'wait', 'run', 'que', 'done'];

// ─── Helpers ────────────────────────────────────────────────────────────

export function getNewestSession(branch: BranchInfo): SessionInfo | null {
  return branch.sessions.length > 0 ? branch.sessions[0] : null;
}

export function getBranchStatus(branch: BranchInfo): SessionStatus {
  return getNewestSession(branch)?.status ?? 'idle';
}

/** Map agent status + session status to the avatar ring state */
export function getAgentState(agent: AgentInfo, sessionStatus: SessionStatus): AgentVisualState {
  if (agent.status === 'blocked') return 'err';
  if (agent.status === 'running') return 'run';
  if (agent.status === 'queued') return 'que';
  return sessionStatus === 'review' ? 'wait' : 'done';
}

/** Errors first, then waiting, running, queued, done */
export function sortAgentsByState(agents: AgentInfo[], sessionStatus: SessionStatus): AgentInfo[] {
  return [...agents].sort(
    (a, b) =>
      AGENT_STATE_ORDER.indexOf(getAgentState(a, sessionStatus)) -
      AGENT_STATE_ORDER.indexOf(getAgentState(b, sessionStatus)),
  );
}

export function getWorstProcessStatus(procs: ProcessInfo[]): ProcessStatus | undefined {
  return (['crashed', 'busy', 'live'] as ProcessStatus[]).find((k) =>
    procs.some((p) => p.status === k),
  );
}

// ─── Small building blocks ──────────────────────────────────────────────

/** Status dot with animated rings (classes from global animations.css) */
export function StatusDot({
  status,
  size = 'normal',
}: {
  status: SessionStatus;
  size?: 'normal' | 'small';
}) {
  return (
    <div
      className={cn(
        'relative rounded-full shrink-0 transition-colors',
        size === 'small' ? 'w-1.5 h-1.5' : 'w-2 h-2',
        STATUS_COLORS[status],
        `pp-dot-${status}`,
      )}
      style={{ transform: 'translateY(-1px)' }}
    />
  );
}

/** Task status icon (todo ○ · progress ◐ · done ●) */
export function TaskIcon({ status, className }: { status: TaskStatus; className?: string }) {
  const c = TASK_COLORS[status];
  const style: CSSProperties = { borderColor: c };
  if (status === 'progress') style.background = `conic-gradient(${c} 0 50%, transparent 0)`;
  if (status === 'done') style.background = c;
  return (
    <i
      className={cn(
        'inline-block w-[11px] h-[11px] rounded-full border-[1.5px] shrink-0',
        className,
      )}
      style={style}
    />
  );
}

/** Round agent avatar with state ring */
export function AgentAvatar({
  agent,
  sessionStatus,
  size = 'md',
}: {
  agent: AgentInfo;
  sessionStatus: SessionStatus;
  size?: 'md' | 'sm';
}) {
  const state = getAgentState(agent, sessionStatus);
  return (
    <span
      className={cn(
        'pp-aa relative rounded-full flex items-center justify-center shrink-0 text-white font-display font-bold border-[1.5px] border-border',
        size === 'sm'
          ? 'w-4 h-4 text-[6.5px] shadow-[inset_0_0_0_1px_rgb(var(--sidebar-item-hover))]'
          : 'w-5 h-5 text-[7.5px] shadow-[inset_0_0_0_1.5px_rgb(var(--background))]',
        `pp-aa-${state}`,
      )}
      style={{ backgroundColor: agent.color }}
      title={`${agent.name} · ${AGENT_STATE_LABELS[state]}`}
    >
      {agent.initials}
    </span>
  );
}

/** Agent chip = favicon/avatar + name */
export function AgentChip({
  agent,
  sessionStatus,
}: {
  agent: AgentInfo;
  sessionStatus: SessionStatus;
}) {
  const [imgError, setImgError] = useState(false);
  const faviconUrl = !imgError ? getAgentFavicon(agent.name) : undefined;

  return (
    <span className="inline-flex items-center gap-[5px] bg-card-hover border border-border rounded-md py-px pl-0.5 pr-2 text-[10px] text-text-secondary">
      {faviconUrl ? (
        <img
          src={faviconUrl}
          alt={agent.name}
          className="w-4 h-4 object-contain rounded-l-md shrink-0"
          onError={() => setImgError(true)}
        />
      ) : (
        <AgentAvatar agent={agent} sessionStatus={sessionStatus} size="sm" />
      )}
      {agent.name}
    </span>
  );
}

export function ZenBadge({ count }: { count: number }) {
  const imagesUri = (window as any).__zenImagesUri || '/images';
  const logo = `${imagesUri}/zen-logo.png`;
  return (
    <span className="inline-flex items-center gap-1.5 bg-card-hover border border-border rounded-[4px] overflow-hidden pl-0 pr-2.5 text-[11px] text-text-secondary">
      <img src={logo} alt="Zen" className="w-[20px] h-[20px] object-contain shrink-0" />
      Zen
      <span className="font-mono opacity-70">x{count}</span>
    </span>
  );
}

/** Compact "terminal N ●" pill summarising background processes */
export function ProcessPill({ procs }: { procs: ProcessInfo[] }) {
  const worst = getWorstProcessStatus(procs);
  if (!worst) return null;
  const c = PROCESS_COLORS[worst];
  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-[10.5px] font-medium py-0.5 pl-[5px] pr-1.5 rounded-[5px]"
      style={{ color: c, backgroundColor: `color-mix(in srgb, ${c} 14%, transparent)` }}
      title={procs.map((p) => p.cmd + (p.port ? ` :${p.port}` : '')).join('\n')}
    >
      <Terminal className="w-[11px] h-[11px]" />
      {procs.length}
      <i className={cn('block w-[5px] h-[5px] rounded-full bg-current', `pp-pd-${worst}`)} />
    </span>
  );
}

export type ProcessInteractHandler = (
  action: 'select' | 'menu',
  sessionId: string,
  index: number,
  e: MouseEvent,
) => void;

/** Background process list inside a session card */
function ProcessList({
  sessionId,
  procs,
  onInteract,
}: {
  sessionId: string;
  procs: ProcessInfo[];
  onInteract?: ProcessInteractHandler;
}) {
  if (!procs.length) return null;
  return (
    <div className="flex flex-col gap-px bg-background rounded-md p-[3px]">
      {procs.map((p, i) => (
        <div
          key={`${p.cmd}-${i}`}
          className="flex items-center gap-[7px] min-w-0 px-[5px] py-[3px] rounded font-mono text-[11px] cursor-pointer hover:bg-card-hover"
          onClick={(e) => onInteract?.('select', sessionId, i, e)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onInteract?.('menu', sessionId, i, e);
          }}
        >
          <span className="shrink-0" style={{ color: PROCESS_COLORS[p.status] }}>
            {p.status === 'busy' ? (
              <Loader2 className="w-3 h-3 pp-spin" />
            ) : p.status === 'crashed' ? (
              <AlertTriangle className="w-3 h-3" />
            ) : (
              <Terminal className="w-3 h-3" />
            )}
          </span>
          <span
            className={cn(
              'flex-1 min-w-0 truncate',
              p.status === 'crashed' && 'text-text-secondary',
            )}
            title={p.cmd}
          >
            {p.cmd}
          </span>
          {p.port && (
            <span className="text-[10px] text-text-secondary border border-border rounded px-[5px]">
              :{p.port}
            </span>
          )}
          {p.status === 'crashed' && (
            <span className="text-[10px] text-[#ff4757]">exit {p.exitCode ?? 1}</span>
          )}
        </div>
      ))}
    </div>
  );
}

/** Task icon button shown in the session title row — opens the status picker */
function TaskIconButton({
  sessionId,
  task,
  onOpenTaskMenu,
}: {
  sessionId: string;
  task: StoredTask;
  onOpenTaskMenu?: (sessionId: string, pos: MenuPosition) => void;
}) {
  const openMenu = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    onOpenTaskMenu?.(sessionId, { top: r.bottom + 4, left: r.left - 80 });
  };

  return (
    <button
      onClick={openMenu}
      title={task.title}
      className="flex items-center shrink-0 cursor-pointer rounded hover:bg-dropdown-item-hover"
    >
      <TaskIcon status={task.status} />
    </button>
  );
}

// ASSUMED: scope stats are per project (active branch in FileExplore), not per session
function ScopeSection({ projectId }: { projectId: string }) {
  const stats = useScopeStats(projectId);
  const rows = [
    {
      label: 'Conflict risk',
      sub: 'in another branch',
      n: stats.error.length,
      dot: 'bg-error',
      text: 'text-error',
    },
    {
      label: 'Diverged',
      sub: 'differs from default',
      n: stats.diff.length,
      dot: 'bg-[#f97316]',
      text: 'text-[#f97316]',
    },
    {
      label: 'Outside scope',
      sub: 'same as default',
      n: stats.warn.length,
      dot: 'bg-warn',
      text: 'text-warn',
    },
    {
      label: 'In scope',
      sub: 'this branch',
      n: stats.primary.length,
      dot: 'bg-primary',
      text: 'text-primary',
    },
  ];
  if (rows.every((r) => r.n === 0)) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-border px-3 py-2.5">
      <span className="text-text-secondary">Scope</span>

      {rows.map((r) => (
        <Row
          key={r.label}
          dot={r.n > 0 ? r.dot : 'bg-border'}
          label={r.label}
          sub={r.sub}
          value={r.n}
          valueClass={r.n > 0 ? r.text : 'text-text-secondary'}
        />
      ))}
    </div>
  );
}

interface GitDotCounts {
  unstaged: number;
  staged: number;
  committed: number;
  unpushed: number;
}

/** 4 git dots: not added · added · committed · unpushed commits */
function GitDots({ path }: { path: string }) {
  const [git, setGit] = useState<GitDotCounts | null>(null);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    window.api
      .invoke('git:status', path)
      .then((res: any) => {
        if (cancelled || !res || res.error) return;
        let unstaged = 0;
        let staged = 0;
        for (const line of String(res.output ?? '').split('\n')) {
          if (line.length < 4) continue;
          if (line[0] === '?' || line[1] !== ' ') unstaged++;
          else if (line[0] !== ' ') staged++;
        }
        setGit({
          unstaged,
          staged,
          committed: Array.isArray(res.committedFiles) ? res.committedFiles.length : 0,
          unpushed: Array.isArray(res.unpushedCommits) ? res.unpushedCommits.length : 0,
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!git) return null;

  const items: { label: string; sub: string; value: number; dot: string; text: string }[] = [
    {
      label: 'Not added',
      sub: 'needs git add',
      value: git.unstaged,
      dot: 'bg-amber-400',
      text: 'text-amber-400',
    },
    {
      label: 'Added',
      sub: 'ready to commit',
      value: git.staged,
      dot: 'bg-sky-400',
      text: 'text-sky-400',
    },
    {
      label: 'Committed',
      sub: 'not pushed yet',
      value: git.committed,
      dot: 'bg-emerald-400',
      text: 'text-emerald-400',
    },
    {
      label: 'Unpushed',
      sub: 'local commits',
      value: git.unpushed,
      dot: 'bg-violet-400',
      text: 'text-violet-400',
    },
  ];

  return (
    <div className="flex flex-col gap-2 border-t border-border px-3 py-2.5">
      <span className="text-text-secondary">Git</span>

      {items.map((it) => (
        <Row
          key={it.label}
          dot={it.value > 0 ? it.dot : 'bg-border'}
          label={it.label}
          sub={it.sub}
          value={it.value}
          valueClass={it.value > 0 ? it.text : 'text-text-secondary'}
        />
      ))}
    </div>
  );
}

/** Detailed hover tooltip content for a session card */
function SessionTooltipContent({
  session,
  displayName,
  task,
  subTasks,
  zenChatCount,
  branchPath,
  projectId,
  branchName,
}: {
  session: SessionInfo;
  displayName: string;
  task?: StoredTask;
  projectName: string;
  branchName: string;
  subTasks: { text: string; done: boolean }[];
  zenChatCount: number;
  branchPath: string;
  projectId: string;
}) {
  const st = session.status;
  const doneSubs = subTasks.filter((t) => t.done).length;
  const agents = sortAgentsByState(session.agents, st);
  const procs = session.procs ?? [];
  const zenLogo = `${(window as any).__zenImagesUri || '/images'}/zen-logo.png`;
  const projectPath = useCodeStore((s) => s.projects.find((p) => p.id === projectId)?.path);
  const allTasks = useSessionTasks((s) => (projectPath ? s.byPath[projectPath] : []));
  const branchTasks = (allTasks ?? []).filter(
    (t) => !t.archived && t.branchName === branchName && t.status !== 'done' && t.id !== task?.id
  );

  return (
    <div style={{ width: 290 }} className="text-[11px]">
      {task && task.status !== 'done' && (
        <div className="flex items-center gap-2 px-3 py-2">
          <TaskIcon status={task.status} />
          <span className="flex-1 min-w-0 truncate text-text-primary" title={task.title}>
            {task.title}
          </span>
        </div>
      )}

      {branchTasks.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-border px-3 py-2.5">
          <span className="text-text-secondary">Tasks</span>
          {branchTasks.map((t) => (
            <div key={t.id} className="flex items-center gap-2">
              <TaskIcon status={t.status} />
              <span className="flex-1 min-w-0 truncate text-text-primary" title={t.title}>
                {t.title}
              </span>
            </div>
          ))}
        </div>
      )}

      {!task && subTasks.length === 0 && branchTasks.length === 0 && (
        <div className="flex items-start gap-1.5 px-3 py-2">
          <span className="flex-1 min-w-0 text-[12px] font-semibold leading-snug text-text-primary break-words">
            {displayName}
          </span>
        </div>
      )}

      {subTasks.length > 0 && (
        <div className="flex items-start gap-1.5 border-t border-border px-3 py-2">
          <span className="flex-1 min-w-0 text-[12px] font-semibold leading-snug text-text-primary break-words">
            {displayName}
          </span>
          <span className="shrink-0 font-mono font-semibold text-text-secondary">
            {doneSubs}/{subTasks.length}
          </span>
        </div>
      )}

      {(agents.length > 0 || zenChatCount > 0) && (
        <div className="flex flex-col gap-1.5 border-t border-border px-3 py-2.5">
          <span className="text-text-secondary">Agents</span>
          {agents.map((a, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <AgentAvatar agent={a} sessionStatus={st} size="sm" />
                <span className="truncate text-text-primary">{a.name}</span>
                <span className="ml-auto text-text-secondary">
                  {AGENT_STATE_LABELS[getAgentState(a, st)]}
                </span>
              </div>
              {(a.subs ?? []).map((sub, j) => (
                <div key={j} className="flex items-center gap-2 pl-6 text-text-secondary">
                  <span className="truncate">{sub.name}</span>
                  <span className="ml-auto">{STATUS_LABELS[sub.status]}</span>
                </div>
              ))}
            </div>
          ))}
          {zenChatCount > 0 && (
            <div className="flex items-center gap-2">
              <img src={zenLogo} alt="Zen" className="w-4 h-4 object-contain shrink-0" />
              <span className="text-text-primary">Zen</span>
              <span className="ml-auto font-mono text-text-secondary">x{zenChatCount}</span>
            </div>
          )}
        </div>
      )}

      {session.hint && (
        <div className="border-t border-border px-3 py-2.5 leading-tight text-[#ff4757]">
          {session.hint}
        </div>
      )}

      {procs.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-border px-3 py-2.5">
          <span className="text-text-secondary">Terminals</span>
          {procs.map((p, i) => (
            <div key={i} className="flex items-center gap-2 font-mono">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: PROCESS_COLORS[p.status] }}
              />
              <span className="truncate text-text-primary">{p.cmd}</span>
              {p.port && <span className="ml-auto text-text-secondary">:{p.port}</span>}
            </div>
          ))}
        </div>
      )}

      <ScopeSection projectId={projectId} />

      <GitDots path={branchPath} />
    </div>
  );
}

// ─── Session card ───────────────────────────────────────────────────────

/** Hover tooltip for a branch's newest session (used by collapsed branch rows) */
export function SessionHoverTooltip({
  session,
  projectId,
  projectName,
  branchName,
  branchPath = '',
  className,
  children,
}: {
  session: SessionInfo;
  projectId: string;
  projectName: string;
  branchName: string;
  branchPath?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const task = useSessionTasks((s) => s.bySession[session.id]);
  const projectPath = useCodeStore((s) => s.projects.find((p) => p.id === projectId)?.path);
  const subTasks = useWorkflowSubTasks(projectPath, task?.id, task?.workflowId);
  const displayName = task?.title ?? getTempSessionName(session.id, projectName, branchName);
  const zenChatCount = useCodeStore(
    (s) =>
      (s.projects.find((p) => p.id === projectId)?.workspacePanels ?? []).filter(
        (wp) => wp.type === 'agent' && wp.sessionId === session.id,
      ).length,
  );

  return (
    <Tooltip
      side="right"
      align="start"
      sideOffset={10}
      followMouse
      className={className}
      contentClassName={TOOLTIP_CLASS}
      content={
        <SessionTooltipContent
          session={session}
          displayName={displayName}
          task={task}
          projectName={projectName}
          branchName={branchName}
          subTasks={subTasks}
          zenChatCount={zenChatCount}
          branchPath={branchPath || projectPath || ''}
          projectId={projectId}
        />
      }
    >
      {children}
    </Tooltip>
  );
}

export const SessionCard = memo(function SessionCard({
  session,
  selectedSessionId,
  onSelect,
  onOpenTaskMenu,
  onProcessInteract,
  onContextMenu,
  draggable = true, // Default to true, but can be overridden by parent if needed
  projectName = '',
  branchName = '',
  projectId = '',
  branchPath = '',
  onDropTask,
}: {
  branchPath?: string;
  projectId?: string;
  projectName?: string;
  branchName?: string;
  onDropTask?: (taskId: string, sessionId: string) => void;
  session: SessionInfo;
  selectedSessionId: string | null;
  onSelect: (id: string) => void;
  onOpenTaskMenu?: (sessionId: string, pos: MenuPosition) => void;
  onProcessInteract?: ProcessInteractHandler;
  onContextMenu?: (e: React.MouseEvent, sessionId: string) => void;
  draggable?: boolean;
}) {
  const st = session.status;
  const isSelected = selectedSessionId === session.id;
  const task = useSessionTasks((s) => s.bySession[session.id]);
  const projectPath = useCodeStore((s) => s.projects.find((p) => p.id === projectId)?.path);
  const subTasks = useWorkflowSubTasks(projectPath, task?.id, task?.workflowId);
  const displayName = task?.title ?? getTempSessionName(session.id, projectName, branchName);
  const [dropOver, setDropOver] = useState(false);
  const zenChatCount = useCodeStore(
    (s) =>
      (s.projects.find((p) => p.id === projectId)?.workspacePanels ?? []).filter(
        (wp) => wp.type === 'agent' && wp.sessionId === session.id,
      ).length,
  );

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(e, session.id);
  };

  return (
    <Tooltip
      side="right"
      align="start"
      sideOffset={10}
      followMouse
      className="block w-full"
      contentClassName={TOOLTIP_CLASS}
      content={
        <SessionTooltipContent
          session={session}
          displayName={displayName}
          task={task}
          projectName={projectName}
          branchName={branchName}
          subTasks={subTasks}
          zenChatCount={zenChatCount}
          branchPath={branchPath || projectPath || ''}
          projectId={projectId}
        />
      }
    >
      <div
        className={cn(
          'bg-card-background border rounded-lg px-3 py-2.5 flex flex-col gap-[3px] cursor-pointer transition-colors',
          st === 'blocked' ? 'border-[rgba(255,71,87,0.35)]' : 'border-divider',
          isSelected ? 'relative border-transparent' : 'hover:border-primary/50',
          dropOver && 'border-primary bg-primary/10',
        )}
        data-session-id={session.id}
        draggable={draggable}
        onDragOver={(e) => {
          if (!onDropTask || task || !e.dataTransfer.types.includes(TASK_DRAG_TYPE)) return;
          e.preventDefault();
          setDropOver(true);
        }}
        onDragLeave={() => setDropOver(false)}
        onDrop={(e) => {
          setDropOver(false);
          const id = e.dataTransfer.getData(TASK_DRAG_TYPE);
          if (!id || !onDropTask || task) return;
          e.preventDefault();
          e.stopPropagation();
          onDropTask(id, session.id);
        }}
        onClick={() => onSelect(session.id)}
        onContextMenu={handleContextMenu}
      >
        {isSelected && <SelectedDashedFrame />}
        {/* Title row */}
        <div className="flex items-center gap-[6px] text-[12.5px] font-semibold leading-none h-[16px]">
          {task && (
            <TaskIconButton sessionId={session.id} task={task} onOpenTaskMenu={onOpenTaskMenu} />
          )}
          <span className="flex-1 min-w-0 truncate text-text-primary" title={displayName}>
            {displayName}
          </span>
        </div>

        {subTasks.length > 0 && (
          <div className="flex flex-col gap-[2px] pl-[2px]">
            {subTasks.slice(0, 6).map((sub, i) => (
              <div
                key={i}
                className="flex items-center gap-[6px] text-[11px] leading-tight text-text-secondary"
                title={sub.text}
              >
                <span
                  className={cn(
                    'w-[5px] h-[5px] rounded-full shrink-0',
                    sub.done ? 'bg-success' : 'bg-text-secondary/50',
                  )}
                />
                <span className={cn('truncate', sub.done && 'line-through opacity-70')}>
                  {sub.text}
                </span>
              </div>
            ))}
            {subTasks.length > 6 && (
              <span className="text-[10px] text-text-secondary/70 pl-[11px]">
                +{subTasks.length - 6} more
              </span>
            )}
          </div>
        )}

        {/* Agents - Only if exists */}
        {(session.agents.length > 0 || zenChatCount > 0) && (
          <div className="flex gap-[4px] flex-wrap items-center leading-none">
            {session.agents.map((a, i) => (
              <AgentChip key={i} agent={a} sessionStatus={st} />
            ))}
            {zenChatCount > 0 && <ZenBadge count={zenChatCount} />}
          </div>
        )}

        {/* Hint - Only if exists */}
        {session.hint && (
          <div className="text-[11px] text-[#ff4757] bg-[rgba(255,71,87,0.08)] rounded-[4px] px-1.5 py-0.5 leading-tight">
            {session.hint}
          </div>
        )}

        {/* Background processes - Only if exists */}
        {(session.procs?.length ?? 0) > 0 && (
          <ProcessList
            sessionId={session.id}
            procs={session.procs!}
            onInteract={onProcessInteract}
          />
        )}
      </div>
    </Tooltip>
  );
});

function SelectedDashedFrame() {
  return (
    <span className="absolute -inset-px rounded-lg border-2 border-dashed border-primary pointer-events-none" />
  );
}
