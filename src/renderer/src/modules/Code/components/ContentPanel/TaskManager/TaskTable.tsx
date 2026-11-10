import { memo, useState } from 'react';
import {
  CalendarDays,
  Paperclip,
  Lock,
  Pencil,
  ArrowRightLeft,
  Archive,
  Trash2,
  GitBranch,
  X,
} from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { $ } from '@renderer/utils/color';
import { Checkbox } from '@renderer/components/ui/Checkbox';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownSub,
  DropdownSubTrigger,
  DropdownSubContent,
} from '@renderer/components/ui/Dropdown';
import type { StoredTask, TaskPriority, TaskStatus } from '../../../services/task.service';
import { TaskEmptyState } from './TaskEmptyState';
import { STATUS_META } from './statusMeta';

const STATUS_ORDER: TaskStatus[] = ['todo', 'progress', 'done'];

const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  high: { label: 'High', color: '--error' },
  medium: { label: 'Medium', color: '--warn' },
  low: { label: 'Low', color: '--text-secondary' },
};

const HEADERS: { label: string; center?: boolean }[] = [
  { label: 'Task' },
  { label: 'Status', center: true },
  { label: 'Priority', center: true },
  { label: 'Tags' },
  { label: 'Checklists', center: true },
  { label: 'Branch' },
  { label: 'Files', center: true },
];

const GRID =
  'grid grid-cols-[32px_minmax(220px,2.5fr)_120px_100px_minmax(120px,1.2fr)_130px_minmax(140px,1fr)_70px] gap-3 items-center px-4';

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function formatPoint(date: number | null, time: string | null): string {
  if (date === null) return '—';
  return time ? `${formatDate(date)} ${time}` : formatDate(date);
}

interface TaskTableProps {
  tasks: StoredTask[];
  blockedCounts: Record<string, number>;
  onTaskClick: (task: StoredTask) => void;
  onAdd: () => void;
  onMoveTask: (task: StoredTask, status: TaskStatus) => void;
  onArchiveTask: (task: StoredTask) => void;
  onDeleteTask: (task: StoredTask) => void;

  onArchiveTasks: (tasks: StoredTask[]) => void;
  onDeleteTasks: (tasks: StoredTask[]) => void;
}

export const TaskTable = memo(function TaskTable({
  tasks,
  blockedCounts,
  onTaskClick,
  onAdd,
  onMoveTask,
  onArchiveTask,
  onDeleteTask,
  onArchiveTasks,
  onDeleteTasks,
}: TaskTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const selectedTasks = tasks.filter((t) => selected.has(t.id));
  const selectedCount = selectedTasks.length;
  const allSelected = tasks.length > 0 && selectedCount === tasks.length;

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      tasks.forEach((t) => (allSelected ? next.delete(t.id) : next.add(t.id)));
      return next;
    });

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="relative flex-1 min-h-0 flex">
      <div className="flex-1 min-h-0 overflow-x-auto custom-scrollbar bg-sidebar-background/50">
        <div className="min-w-[1020px] h-full flex flex-col">
          <div className={cn(GRID, 'shrink-0 py-2.5 border-b border-divider bg-card-background')}>
            <div className="flex items-center justify-center">
              <Checkbox size="sm" checked={allSelected} onChange={toggleAll} />
            </div>
            {HEADERS.map((h) => (
              <span
                key={h.label}
                className={cn(
                  'text-[11px] font-semibold uppercase tracking-wide text-text-secondary',
                  h.center && 'text-center',
                )}
              >
                {h.label}
              </span>
            ))}
          </div>

          {tasks.length === 0 ? (
            <TaskEmptyState onAdd={onAdd} />
          ) : (
            <div
              className={cn(
                'flex-1 overflow-y-auto custom-scrollbar',
                selectedCount > 0 && 'pb-20',
              )}
            >
              {tasks.map((task) => {
                const status = STATUS_META[task.status];
                const prio = PRIORITY_META[task.priority];
                const total = task.checklist.length;
                const done = task.checklist.filter((c) => c.done).length;
                const progress = total > 0 ? Math.round((done / total) * 100) : 0;
                const blockedBy = blockedCounts[task.id] ?? 0;

                return (
                  <Dropdown key={task.id} trigger="contextmenu" className="block w-full">
                    <DropdownTrigger asChild>
                      <div
                        onClick={() => onTaskClick(task)}
                        className={cn(
                          GRID,
                          'py-3 border-b border-divider cursor-pointer transition-colors hover:bg-card-hover',
                          selected.has(task.id) && 'bg-primary/5',
                        )}
                      >
                        <div
                          className="flex items-center justify-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            size="sm"
                            checked={selected.has(task.id)}
                            onChange={() => toggleOne(task.id)}
                          />
                        </div>

                        <div className="min-w-0 flex items-start gap-2">
                          {blockedBy > 0 && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[10px] font-mono rounded px-1 py-px shrink-0"
                              style={{ color: $('--error'), backgroundColor: $('--error', 0.12) }}
                              title={`Blocked by ${blockedBy} task(s)`}
                            >
                              <Lock className="w-2.5 h-2.5" />
                              {blockedBy}
                            </span>
                          )}
                          <div className="min-w-0 flex flex-col gap-0.5">
                            <span className="text-[12.5px] font-semibold text-text-primary truncate">
                              {task.title}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-text-secondary truncate">
                              <CalendarDays className="w-3 h-3 shrink-0" />
                              {formatPoint(task.startDate, task.startTime)} -{' '}
                              {formatPoint(task.endDate, task.endTime)}
                            </span>
                          </div>
                        </div>

                        <span
                          className="justify-self-center inline-flex items-center gap-1.5 w-fit text-[11px] font-medium rounded-md px-2 py-0.5"
                          style={{ color: $(status.color), backgroundColor: $(status.color, 0.12) }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: $(status.color) }}
                          />
                          {status.label}
                        </span>

                        <span
                          className="justify-self-center w-fit text-[11px] font-medium rounded-md px-2 py-0.5"
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
                            <span className="text-[10px] text-text-secondary">
                              +{task.tags.length - 3}
                            </span>
                          )}
                        </div>

                        {total > 0 ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${progress}%`,
                                  backgroundColor:
                                    progress === 100 ? $('--success') : $('--primary'),
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-text-secondary">
                              {done}/{total}
                            </span>
                          </div>
                        ) : (
                          <span className="justify-self-center text-[11px] text-text-secondary">
                            -
                          </span>
                        )}

                        {task.branchName ? (
                          <span
                            className="inline-flex items-center gap-1 min-w-0 w-fit max-w-full text-[11px] font-mono text-text-secondary bg-background rounded border border-dashed px-1.5 py-0.5"
                            style={{ borderColor: $('--primary', 0.55) }}
                            title={task.branchName}
                          >
                            <GitBranch className="w-3 h-3 shrink-0" />
                            <span className="truncate">{task.branchName}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-text-secondary">-</span>
                        )}

                        <div className="flex items-center justify-center gap-2 text-[11px] text-text-secondary">
                          {task.attachments.length > 0 && (
                            <span className="inline-flex items-center gap-0.5">
                              <Paperclip className="w-3 h-3" />
                              {task.attachments.length}
                            </span>
                          )}
                          {task.attachments.length === 0 && <span>-</span>}
                        </div>
                      </div>
                    </DropdownTrigger>
                    <DropdownContent>
                      <DropdownItem
                        icon={<Pencil className="w-3.5 h-3.5" />}
                        onClick={() => onTaskClick(task)}
                      >
                        Edit task
                      </DropdownItem>
                      <DropdownSub>
                        <DropdownSubTrigger icon={<ArrowRightLeft />}>Move to</DropdownSubTrigger>
                        <DropdownSubContent className="px-1.5">
                          {STATUS_ORDER.filter((s) => s !== task.status).map((s) => {
                            const meta = STATUS_META[s];
                            const Icon = meta.icon;
                            return (
                              <DropdownItem
                                key={s}
                                closeOnSelect
                                onClick={() => onMoveTask(task, s)}
                                icon={
                                  <Icon className="w-3.5 h-3.5" style={{ color: $(meta.color) }} />
                                }
                              >
                                {meta.label}
                              </DropdownItem>
                            );
                          })}
                        </DropdownSubContent>
                      </DropdownSub>
                      <DropdownItem
                        icon={<Archive className="w-3.5 h-3.5" />}
                        onClick={() => onArchiveTask(task)}
                      >
                        Archive
                      </DropdownItem>
                      <DropdownSeparator />
                      <DropdownItem
                        variant="error"
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={() => onDeleteTask(task)}
                      >
                        Delete
                      </DropdownItem>
                    </DropdownContent>
                  </Dropdown>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedCount > 0 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-3 py-2 rounded-lg border border-dashed bg-card-background shadow-lg animate-in fade-in duration-150"
          style={{ borderColor: $('--primary', 0.55) }}
        >
          <span className="text-xs font-medium text-text-primary whitespace-nowrap">
            {selectedCount} selected
          </span>

          <span className="w-px h-4 bg-divider" />

          <button
            type="button"
            onClick={() => onArchiveTasks(selectedTasks)}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium rounded-md px-2 py-1 text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors cursor-pointer"
          >
            <Archive className="w-3.5 h-3.5" />
            Archive
          </button>

          <button
            type="button"
            onClick={() => onDeleteTasks(selectedTasks)}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium rounded-md px-2 py-1 transition-colors cursor-pointer hover:brightness-125"
            style={{ color: $('--error'), backgroundColor: $('--error', 0.12) }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>

          <button
            type="button"
            onClick={() => setSelected(new Set())}
            title="Clear selection"
            className="w-6 h-6 rounded-md flex items-center justify-center text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
});

TaskTable.displayName = 'TaskTable';
