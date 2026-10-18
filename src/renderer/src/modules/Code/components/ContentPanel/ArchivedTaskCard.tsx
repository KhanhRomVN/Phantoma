import { memo } from 'react';
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  GitBranch,
  Link2,
  ListChecks,
  Loader2,
  Paperclip,
  Terminal,
} from 'lucide-react';
import { $ } from '@renderer/utils/color';
import {
  formatTaskRange,
  isTaskOverdue,
  type StoredTask,
  type TaskPriority,
} from '../../services/task.service';
import { STATUS_META } from './TaskManager/kanban/KanbanTaskCard';

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  high: { label: 'High', color: '--error' },
  medium: { label: 'Medium', color: '--warn' },
  low: { label: 'Low', color: '--text-secondary' },
};

interface ArchivedTaskCardProps {
  task: StoredTask;
  nextCount: number;
  restoring: boolean;
  onOpen: (task: StoredTask) => void;
  onRestore: (task: StoredTask) => void;
}

export const ArchivedTaskCard = memo(function ArchivedTaskCard({
  task,
  nextCount,
  restoring,
  onOpen,
  onRestore,
}: ArchivedTaskCardProps) {
  const status = STATUS_META[task.status];
  const StatusIcon = status.icon;
  const prio = PRIORITY_CONFIG[task.priority];
  const total = task.checklist.length;
  const done = task.checklist.filter((c) => c.done).length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const range = formatTaskRange(task);
  const overdue = isTaskOverdue(task);
  const prevCount = task.dependsOn.length;
  const hasMeta = !!range || task.attachments.length > 0 || prevCount > 0 || nextCount > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(task)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onOpen(task);
        }
      }}
      className="group flex flex-col gap-3 p-4 rounded-xl border border-divider bg-card-background hover:bg-card-hover hover:border-border transition-colors cursor-pointer outline-none"
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium"
          style={{ color: $(status.color), backgroundColor: $(status.color, 0.12) }}
        >
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </span>
        <span className="flex-1" />
        <span
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium"
          style={{ color: $(prio.color), backgroundColor: $(prio.color, 0.12) }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: $(prio.color) }} />
          {prio.label}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <h4 className="text-[13px] font-semibold text-text-primary leading-snug line-clamp-2">
          {task.title}
        </h4>
        {task.description && (
          <p className="text-[11.5px] text-text-secondary leading-snug line-clamp-2">
            {task.description}
          </p>
        )}
      </div>

      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <span
              key={tag.id}
              className="text-[10px] font-medium rounded px-1.5 py-px leading-tight"
              style={{ color: $(tag.color), backgroundColor: $(tag.color, 0.12) }}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {total > 0 && (
        <div className="flex items-center gap-2">
          <ListChecks className="w-3 h-3 shrink-0 text-text-secondary" />
          <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                backgroundColor: progress === 100 ? $('--success') : $('--primary'),
              }}
            />
          </div>
          <span className="text-[10px] font-mono text-text-secondary">
            {done}/{total}
          </span>
        </div>
      )}

      {(task.sessionId || task.branchName) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {task.sessionId && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-text-secondary bg-background rounded px-1.5 py-px">
              <Terminal className="w-2.5 h-2.5" />
              Session
            </span>
          )}
          {task.branchName && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-text-secondary bg-background rounded px-1.5 py-px max-w-[200px] truncate">
              <GitBranch className="w-2.5 h-2.5 shrink-0" />
              {task.branchName}
            </span>
          )}
        </div>
      )}

      {hasMeta && (
        <div className="flex items-center gap-3 flex-wrap text-[10.5px] text-text-secondary">
          {range && (
            <span
              className="inline-flex items-center gap-1 font-mono rounded px-1 py-px"
              style={overdue ? { color: $('--error'), backgroundColor: $('--error', 0.1) } : undefined}
            >
              <CalendarDays className="w-3 h-3" />
              {range}
            </span>
          )}
          {(prevCount > 0 || nextCount > 0) && (
            <span className="inline-flex items-center gap-1 font-mono" title="Previous / next tasks">
              <Link2 className="w-3 h-3" />
              {prevCount} / {nextCount}
            </span>
          )}
          {task.attachments.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              {task.attachments.length}
            </span>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center gap-3 pt-3 border-t border-divider">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-text-secondary min-w-0 truncate">
          <Archive className="w-3 h-3 shrink-0" />
          Archived {new Date(task.updatedAt).toLocaleDateString()}
        </span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRestore(task);
          }}
          disabled={restoring}
          className="shrink-0 inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md text-xs font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {restoring ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ArchiveRestore className="w-3.5 h-3.5" />
          )}
          Restore
        </button>
      </div>
    </div>
  );
});

ArchivedTaskCard.displayName = 'ArchivedTaskCard';