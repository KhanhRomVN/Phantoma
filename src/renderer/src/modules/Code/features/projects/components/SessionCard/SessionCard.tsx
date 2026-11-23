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
import { Row, TOOLTIP_CLASS } from "../../../../app/layout/FooterBar";
// ── Task link ──
import { useCodeStore } from '../../../../shared/stores/code.store';
import { useScopeStats } from '../../../../shared/stores/scope-stats.store';
import { useSessionTasks } from '../../hooks/useSessionTasks';
import { useWorkflowSubTasks } from '../../hooks/useWorkflowSubTasks';
import type { StoredTask } from '../../../../shared/services/task.service';
import { TASK_DRAG_TYPE } from '../../../../shared/constants/dnd.constants';
import { codeApi } from '../../../../shared/api/code.api';

import {
  SessionStatus,
  TaskStatus,
  ProcessStatus,
  AgentVisualState,
  MenuPosition,
  AgentInfo,
  ProcessInfo,
  SessionInfo,
  BranchInfo,
  ProcessInteractHandler,
} from '../../types/session.types';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  TASK_COLORS,
  PROCESS_COLORS,
  AGENT_STATE_LABELS,
  AGENT_STATE_ORDER,
} from '../../constants/session.constants';

import {
  getAgentState,
  sortAgentsByState,
  getWorstProcessStatus,
  getTempSessionName,
  getAgentFavicon,
} from '../../utils/session.util';
import { SessionTooltipContent } from './SessionHoverTooltip';

import { AgentChip, ZenBadge, ProcessList, TaskIconButton } from './SessionBadges';
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
          st === 'blocked' ? 'border-[rgba(255,71,87,0.35)]' : 'border-border',
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
