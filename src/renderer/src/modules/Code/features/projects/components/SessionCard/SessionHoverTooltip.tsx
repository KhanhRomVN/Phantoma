import { Tooltip } from '@renderer/components/ui/Tooltip';
import { TOOLTIP_CLASS } from '../../../../app/layout/FooterBar';
import { useCodeStore } from '../../../../shared/stores/code.store';
import { useSessionTasks } from '../../hooks/useSessionTasks';
import { useWorkflowSubTasks } from '../../hooks/useWorkflowSubTasks';
import type { StoredTask } from '../../../../shared/services/task.service';
import { SessionInfo } from '../../types/session.types';
import {
  STATUS_LABELS,
  PROCESS_COLORS,
  AGENT_STATE_LABELS,
} from '../../constants/session.constants';
import { getAgentState, sortAgentsByState, getTempSessionName } from '../../utils/session.util';

// ASSUMED: scope stats are per project (active branch in FileExplorer), not per session
import { AgentAvatar, TaskIcon } from './SessionBadges';

import { ScopeSection, GitDots } from './SessionGitStats';
/** Detailed hover tooltip content for a session card */
export function SessionTooltipContent({
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
    (t) => !t.archived && t.branchName === branchName && t.status === 'todo' && t.id !== task?.id,
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
          <span className="text-text-secondary">Todo</span>
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
