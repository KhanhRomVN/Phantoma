/**
 * ------------------------------------------------------------------
 * Session Card — aligned with ProjectPanel.html mockup
 * ------------------------------------------------------------------
 * Renders a single session card: status dot, task row, agent chips,
 * hint, background processes and summary stats.
 * Also exports shared types, constants, helpers and small building
 * blocks (StatusDot, TaskIcon, AgentAvatar, ProcessPill …) used by
 * SessionCard, ProjectCard and ProjectPanel.
 * Animations live in ./ProjectPanel.css (pp-* classes).
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { memo, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';

// ── Icons ─
import { Terminal, Loader2, AlertTriangle, Square, X, ChevronDown } from 'lucide-react';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';
import { getFaviconUrl } from '@renderer/utils/favicon';

// ── Animations / state styles ──
import './ProjectPanel.css';

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
export type TaskStatus = 'todo' | 'progress' | 'review' | 'done';
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
  ['todo', 'Todo'],
  ['progress', 'In progress'],
  ['review', 'In review'],
  ['done', 'Done'],
];

export const TASK_COLORS: Record<TaskStatus, string> = {
  todo: '#8b8d96',
  progress: '#4fa8e0',
  review: '#ffb020',
  done: '#3ddc84',
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

/** Status dot with animated rings (see ProjectPanel.css) */
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
    />
  );
}

/** Task status icon (todo ○ · progress ◐ · review ◉ · done ●) */
export function TaskIcon({ status, className }: { status: TaskStatus; className?: string }) {
  const c = TASK_COLORS[status];
  const style: CSSProperties = { borderColor: c };
  if (status === 'progress') style.background = `conic-gradient(${c} 0 50%, transparent 0)`;
  if (status === 'review') style.background = `radial-gradient(${c} 0 32%, transparent 36%)`;
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

/** Background process list inside a session card */
function ProcessList({
  sessionId,
  procs,
  onKill,
}: {
  sessionId: string;
  procs: ProcessInfo[];
  onKill?: (sessionId: string, index: number) => void;
}) {
  if (!procs.length) return null;
  return (
    <div className="flex flex-col gap-px bg-background rounded-md p-[3px]">
      {procs.map((p, i) => (
        <div
          key={`${p.cmd}-${i}`}
          className="group/pr flex items-center gap-[7px] min-w-0 px-[5px] py-[3px] rounded font-mono text-[11px] hover:bg-card-hover"
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
          <button
            onClick={(e) => {
              e.stopPropagation();
              onKill?.(sessionId, i);
            }}
            className="opacity-0 group-hover/pr:opacity-100 w-[18px] h-[18px] rounded flex items-center justify-center text-text-secondary hover:bg-dropdown-item-hover hover:text-[#ff4757] cursor-pointer"
            title={p.status === 'crashed' ? 'Dismiss' : 'Stop process'}
          >
            {p.status === 'crashed' ? (
              <X className="w-2.5 h-2.5" />
            ) : (
              <Square className="w-2.5 h-2.5" />
            )}
          </button>
        </div>
      ))}
    </div>
  );
}

/** Task row inside a session card (with status picker button) */
function TaskRow({
  session,
  onOpenTaskMenu,
}: {
  session: SessionInfo;
  onOpenTaskMenu?: (sessionId: string, pos: MenuPosition) => void;
}) {
  const t = session.task;
  if (!t) return null;
  const label = TASK_STATUSES.find(([k]) => k === t.status)?.[1] ?? t.status;

  const openMenu = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    onOpenTaskMenu?.(session.id, { top: r.bottom + 4, left: r.left - 80 });
  };

  return (
    <div className="flex items-center gap-2 min-w-0 px-[7px] py-[5px] rounded-md bg-background text-[11.5px]">
      <TaskIcon status={t.status} />
      <span
        className={cn(
          'flex-1 min-w-0 truncate',
          t.status === 'done' && 'text-text-secondary/50 line-through',
        )}
        title={t.title}
      >
        {t.title}
      </span>
      <button
        onClick={openMenu}
        className="flex items-center gap-[3px] shrink-0 font-mono text-[10px] text-text-secondary px-[5px] py-px rounded-[5px] hover:bg-dropdown-item-hover hover:text-text-primary cursor-pointer"
      >
        {label}
        <ChevronDown className="w-[11px] h-[11px]" />
      </button>
    </div>
  );
}

// ─── Session card ───────────────────────────────────────────────────────

export const SessionCard = memo(function SessionCard({
  session,
  selectedSessionId,
  onSelect,
  onOpenTaskMenu,
  onKillProcess,
  onContextMenu,
}: {
  session: SessionInfo;
  selectedSessionId: string | null;
  onSelect: (id: string) => void;
  onOpenTaskMenu?: (sessionId: string, pos: MenuPosition) => void;
  onKillProcess?: (sessionId: string, index: number) => void;
  onContextMenu?: (e: React.MouseEvent, sessionId: string) => void;
}) {
  const st = session.status;
  const isSelected = selectedSessionId === session.id;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(e, session.id);
  };

  return (
    <div
      className={cn(
        'bg-card-background border rounded-lg px-2 py-[7px] flex flex-col gap-[3px] cursor-pointer transition-colors hover:border-[rgba(255,106,31,0.3)]',
        st === 'blocked' ? 'border-[rgba(255,71,87,0.35)]' : 'border-divider',
        // Subtle dashed border for selected state
        isSelected && 'border-[1.5px] border-dashed border-[#ff6a1f]/70',
      )}
      onClick={() => onSelect(session.id)}
      onContextMenu={handleContextMenu}
    >
      {/* Title row */}
      <div className="flex items-center gap-[6px] text-[12.5px] font-semibold leading-none h-[16px]">
        <StatusDot status={st} size="small" />
        <span className="flex-1 min-w-0 truncate text-text-primary">{session.title}</span>
      </div>

      {/* Task - Only if exists */}
      {session.task && <TaskRow session={session} onOpenTaskMenu={onOpenTaskMenu} />}

      {/* Agents - Only if exists */}
      {session.agents.length > 0 && (
        <div className="flex gap-[4px] flex-wrap items-center leading-none">
          {session.agents.map((a, i) => (
            <AgentChip key={i} agent={a} sessionStatus={st} />
          ))}
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
        <ProcessList sessionId={session.id} procs={session.procs!} onKill={onKillProcess} />
      )}
    </div>
  );
});
