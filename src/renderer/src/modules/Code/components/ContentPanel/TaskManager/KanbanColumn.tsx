/**
 * ------------------------------------------------------------------
 * Kanban Column — one status column in the board
 * ------------------------------------------------------------------
 * Subtle visual differentiation per column via:
 *  - A thin colored top border on the header
 *  - Colored count badge background tinted to match
 * Columns are flush against each other (no gap).
 * ------------------------------------------------------------------
 */

import { memo } from 'react';
import type { StoredTask, TaskStatus } from '../../../services/task.service';
import { KanbanTaskCard } from './KanbanTaskCard';

// ─── Column accent colors ──────────────────────────────────────────

const COLUMN_ACCENT: Record<TaskStatus, string> = {
  todo:     '#8b8d96',
  progress: '#4fa8e0',
  review:   '#ffb020',
  done:     '#3ddc84',
};

const COLUMN_LABEL: Record<TaskStatus, string> = {
  todo:     'Todo',
  progress: 'In Progress',
  review:   'In Review',
  done:     'Done',
};

// ─── Component ─────────────────────────────────────────────────────

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: StoredTask[];
  onTaskClick: (task: StoredTask) => void;
}

export const KanbanColumn = memo(function KanbanColumn({
  status,
  tasks,
  onTaskClick,
}: KanbanColumnProps) {
  const accent = COLUMN_ACCENT[status];
  const label = COLUMN_LABEL[status];

  return (
    <div className="flex-1 min-w-[220px] flex flex-col bg-sidebar-background/40 overflow-hidden">
      {/* Header with subtle colored top border */}
      <div
        className="shrink-0 px-3 py-2 flex items-center justify-between border-b border-divider"
        style={{ borderTopColor: accent, borderTopWidth: 2, borderTopStyle: 'solid' }}
      >
        <span className="text-[11px] font-semibold text-text-primary uppercase tracking-wide">
          {label}
        </span>
        <span
          className="text-[10px] font-mono rounded-full px-1.5 py-px leading-none"
          style={{
            color: accent,
            backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
          }}
        >
          {tasks.length}
        </span>
      </div>

      {/* Scrollable task list — no padding/gap between columns */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col gap-2">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <KanbanTaskCard key={task.id} task={task} onClick={onTaskClick} />
          ))
        ) : (
          <div className="h-full flex items-center justify-center text-[10px] text-text-secondary/30 italic select-none">
            No tasks
          </div>
        )}
      </div>
    </div>
  );
});

KanbanColumn.displayName = 'KanbanColumn';