import { memo, type ComponentType } from 'react';
import { ClipboardList, Circle, Loader, Eye, CheckCircle2, Plus } from 'lucide-react';
import type { TaskStatus } from '../../../services/task.service';

const STATUS_META: Record<
  TaskStatus,
  { icon: ComponentType<{ className?: string }>; hint: string }
> = {
  todo: { icon: Circle, hint: 'Ideas and upcoming work land here' },
  progress: { icon: Loader, hint: 'Move a task here when you start it' },
  review: { icon: Eye, hint: 'Finished work waiting for a second look' },
  done: { icon: CheckCircle2, hint: 'Completed tasks will be collected here' },
};

interface TaskEmptyStateProps {
  status?: TaskStatus;
  onAdd?: () => void;
}

export const TaskEmptyState = memo(function TaskEmptyState({ status, onAdd }: TaskEmptyStateProps) {
  const meta = status ? STATUS_META[status] : null;
  const Icon = meta?.icon ?? ClipboardList;
  const isBoard = !status;

  return (
    <div
      className={
        isBoard
          ? 'flex-1 flex flex-col items-center justify-center gap-4 px-6 py-16 text-center select-none'
          : 'flex-1 flex flex-col items-center justify-center gap-3 px-4 py-8 text-center select-none'
      }
    >
      <span
        className={
          isBoard
            ? 'w-14 h-14 rounded-2xl flex items-center justify-center bg-card-hover text-text-secondary'
            : 'w-11 h-11 rounded-xl flex items-center justify-center bg-card-hover text-text-secondary'
        }
      >
        <Icon className={isBoard ? 'w-6 h-6' : 'w-5 h-5'} />
      </span>
      <div className="flex flex-col gap-1">
        <span
          className={
            isBoard
              ? 'text-sm font-semibold text-text-primary'
              : 'text-xs font-semibold text-text-primary'
          }
        >
          {isBoard ? 'No tasks found' : 'No tasks yet'}
        </span>
        <span className="text-[11px] text-text-secondary leading-snug max-w-[220px]">
          {meta?.hint ?? 'Create your first task or adjust the search to see results'}
        </span>
      </div>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-card-hover text-text-secondary hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer outline-none"
        >
          <Plus className="w-3.5 h-3.5" />
          Add task
        </button>
      )}
    </div>
  );
});

TaskEmptyState.displayName = 'TaskEmptyState';
