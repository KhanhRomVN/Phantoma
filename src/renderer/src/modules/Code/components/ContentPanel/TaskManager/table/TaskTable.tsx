import { memo } from 'react';
import { CalendarDays, Paperclip } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { $ } from '@renderer/utils/color';
import type { StoredTask, TaskPriority, TaskStatus } from '../../../../services/task.service';
import { TaskEmptyState } from '../TaskEmptyState';

const STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: 'Todo', color: '--text-secondary' },
  progress: { label: 'In Progress', color: '--info' },
  review: { label: 'In Review', color: '--warn' },
  done: { label: 'Done', color: '--success' },
};

const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  high: { label: 'High', color: '--error' },
  medium: { label: 'Medium', color: '--warn' },
  low: { label: 'Low', color: '--text-secondary' },
};

const HEADERS = ['Task', 'Status', 'Priority', 'Tags', 'Progress', 'Due', 'Files'];

const GRID =
  'grid grid-cols-[minmax(220px,2.5fr)_120px_100px_minmax(120px,1.2fr)_130px_100px_70px] gap-3 items-center px-4';

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

interface TaskTableProps {
  tasks: StoredTask[];
  onTaskClick: (task: StoredTask) => void;
  onAdd: () => void;
}

export const TaskTable = memo(function TaskTable({ tasks, onTaskClick, onAdd }: TaskTableProps) {
  return (
    <div className="flex-1 min-h-0 overflow-x-auto custom-scrollbar bg-sidebar-background/50">
      <div className="min-w-[920px] h-full flex flex-col">
        <div className={cn(GRID, 'shrink-0 py-2.5 border-b border-divider bg-card-background')}>
          {HEADERS.map((h) => (
            <span
              key={h}
              className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary"
            >
              {h}
            </span>
          ))}
        </div>

        {tasks.length === 0 ? (
          <TaskEmptyState onAdd={onAdd} />
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {tasks.map((task) => {
              const status = STATUS_META[task.status];
              const prio = PRIORITY_META[task.priority];
              const total = task.checklist.length;
              const done = task.checklist.filter((c) => c.done).length;
              const progress = total > 0 ? Math.round((done / total) * 100) : 0;
              const isOverdue =
                task.endDate !== null && task.endDate < Date.now() && task.status !== 'done';

              return (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className={cn(
                    GRID,
                    'py-3 border-b border-divider cursor-pointer transition-colors hover:bg-card-hover',
                  )}
                >
                  <div className="min-w-0 flex flex-col gap-0.5">
                    <span className="text-[12.5px] font-semibold text-text-primary truncate">
                      {task.title}
                    </span>
                    {task.description && (
                      <span className="text-[11px] text-text-secondary truncate">
                        {task.description}
                      </span>
                    )}
                  </div>

                  <span
                    className="inline-flex items-center gap-1.5 w-fit text-[11px] font-medium rounded-md px-2 py-0.5"
                    style={{ color: $(status.color), backgroundColor: $(status.color, 0.12) }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: $(status.color) }}
                    />
                    {status.label}
                  </span>

                  <span
                    className="w-fit text-[11px] font-medium rounded-md px-2 py-0.5"
                    style={{ color: $(prio.color), backgroundColor: $(prio.color, 0.12) }}
                  >
                    {prio.label}
                  </span>

                  <div className="flex flex-wrap gap-1 min-w-0">
                    {task.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag.id}
                        className="text-[10px] font-medium rounded px-1.5 py-px leading-tight"
                        style={{ color: $(tag.color), backgroundColor: $(tag.color, 0.12) }}
                      >
                        {tag.label}
                      </span>
                    ))}
                    {task.tags.length > 3 && (
                      <span className="text-[10px] text-text-secondary">+{task.tags.length - 3}</span>
                    )}
                  </div>

                  {total > 0 ? (
                    <div className="flex items-center gap-2">
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
                  ) : (
                    <span className="text-[11px] text-text-secondary">-</span>
                  )}

                  {task.endDate !== null ? (
                    <span
                      className="inline-flex items-center gap-1 w-fit text-[11px] font-mono rounded px-1 py-px"
                      style={
                        isOverdue
                          ? { color: $('--error'), backgroundColor: $('--error', 0.1) }
                          : { color: $('--text-secondary') }
                      }
                    >
                      <CalendarDays className="w-3 h-3" />
                      {formatDate(task.endDate)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-text-secondary">-</span>
                  )}

                  <div className="flex items-center gap-2 text-[11px] text-text-secondary">
                    {task.attachments.length > 0 && (
                      <span className="inline-flex items-center gap-0.5">
                        <Paperclip className="w-3 h-3" />
                        {task.attachments.length}
                      </span>
                    )}
                    {task.attachments.length === 0 && <span>-</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

TaskTable.displayName = 'TaskTable';