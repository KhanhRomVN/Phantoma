/**
 * ------------------------------------------------------------------
 * Kanban Task Card — compact card inside a kanban column
 * ------------------------------------------------------------------
 * Displays: title, description (max 2 lines), linked session/branch,
 * priority badge (3 colors), due date (if set).
 * Clicking opens the TaskModal for editing.
 * ------------------------------------------------------------------
 */

import { memo } from 'react';
import { CalendarDays, GitBranch, Terminal } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import type { StoredTask, TaskPriority } from '../../../services/task.service';

// ─── Priority config ────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  high:   { label: 'High',   color: '#ff4757', bg: 'rgba(255,71,87,0.12)' },
  medium: { label: 'Medium', color: '#ffb020', bg: 'rgba(255,176,32,0.12)' },
  low:    { label: 'Low',    color: '#8b8d96', bg: 'rgba(139,141,150,0.10)' },
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

// ─── Component ──────────────────────────────────────────────────────

interface KanbanTaskCardProps {
  task: StoredTask;
  onClick: (task: StoredTask) => void;
}

export const KanbanTaskCard = memo(function KanbanTaskCard({ task, onClick }: KanbanTaskCardProps) {
  const prio = PRIORITY_CONFIG[task.priority];
  const isOverdue = task.dueDate !== null && task.dueDate < Date.now() && task.status !== 'done';

  return (
    <div
      className={cn(
        'group/card relative flex flex-col gap-1.5 px-2.5 py-2 rounded-md cursor-pointer transition-colors',
        'bg-card-background border border-divider hover:border-[rgba(255,106,31,0.25)]',
      )}
      onClick={() => onClick(task)}
    >
      {/* Left accent stripe based on priority */}
      <span
        className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r-full"
        style={{ backgroundColor: prio.color }}
      />

      {/* Title */}
      <h4 className="text-[11.5px] font-semibold text-text-primary truncate pl-1.5">
        {task.title}
      </h4>

      {/* Description — max 2 lines */}
      {task.description && (
        <p className="text-[10px] text-text-secondary/70 line-clamp-2 pl-1.5 leading-snug">
          {task.description}
        </p>
      )}

      {/* Meta row: links + priority + due date */}
      <div className="flex items-center gap-1.5 flex-wrap pl-1.5 pt-0.5">
        {/* Linked session */}
        {task.sessionId && (
          <span className="inline-flex items-center gap-[3px] text-[9px] font-mono text-text-secondary/60 bg-background rounded px-1 py-px">
            <Terminal className="w-2.5 h-2.5" />
            Sess
          </span>
        )}

        {/* Linked branch */}
        {task.branchName && (
          <span className="inline-flex items-center gap-[3px] text-[9px] font-mono text-text-secondary/60 bg-background rounded px-1 py-px max-w-[100px] truncate">
            <GitBranch className="w-2.5 h-2.5 shrink-0" />
            {task.branchName.replace(/^(feature|fix|hotfix|release)\//, '')}
          </span>
        )}

        {/* Spacer */}
        <span className="flex-1" />

        {/* Due date */}
        {task.dueDate !== null && (
          <span
            className={cn(
              'inline-flex items-center gap-[3px] text-[9px] font-mono rounded px-1 py-px',
              isOverdue ? 'text-[#ff4757] bg-[rgba(255,71,87,0.08)]' : 'text-text-secondary/50',
            )}
          >
            <CalendarDays className="w-2.5 h-2.5" />
            {formatDate(task.dueDate)}
          </span>
        )}

        {/* Priority badge */}
        <span
          className="text-[8.5px] font-mono uppercase tracking-wide rounded px-1 py-px shrink-0"
          style={{ color: prio.color, backgroundColor: prio.bg }}
        >
          {prio.label}
        </span>
      </div>
    </div>
  );
});

KanbanTaskCard.displayName = 'KanbanTaskCard';