import { useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { Terminal, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import type { StoredTask } from '../../../../shared/services/task.service';
import {
  SessionStatus,
  TaskStatus,
  MenuPosition,
  AgentInfo,
  ProcessInfo,
  ProcessInteractHandler,
} from '../../types/session.types';
import {
  STATUS_COLORS,
  TASK_COLORS,
  PROCESS_COLORS,
  AGENT_STATE_LABELS,
} from '../../constants/session.constants';
import { getAgentState, getWorstProcessStatus, getAgentFavicon } from '../../utils/session.util';

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
          ? 'w-4 h-4 text-[6.5px] shadow-[inset_0_0_0_1px_rgb(var(--card-background-hover))]'
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

/** Background process list inside a session card */
export function ProcessList({
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
export function TaskIconButton({
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
