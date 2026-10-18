import { memo, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowUpDown, Check, MoreHorizontal, Plus } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { $ } from '@renderer/utils/color';
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
import type { StoredTask, TaskPriority, TaskStatus } from '../../../../services/task.service';
import { KanbanTaskCard, STATUS_META } from './KanbanTaskCard';
import { TaskEmptyState } from '../TaskEmptyState';
import { TASK_DRAG_TYPE, type DropIntent } from './TaskDropZones';

type SortKey = 'manual' | 'priority' | 'endDate' | 'created' | 'title';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'manual', label: 'Manual' },
  { key: 'priority', label: 'Priority' },
  { key: 'endDate', label: 'End date' },
  { key: 'created', label: 'Newest first' },
  { key: 'title', label: 'Title (A-Z)' },
];

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

function sortTasks(tasks: StoredTask[], key: SortKey): StoredTask[] {
  if (key === 'manual') return tasks;
  const copy = [...tasks];
  switch (key) {
    case 'priority':
      return copy.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    case 'endDate':
      return copy.sort((a, b) => (a.endDate ?? Infinity) - (b.endDate ?? Infinity));
    case 'created':
      return copy.sort((a, b) => b.createdAt - a.createdAt);
    case 'title':
      return copy.sort((a, b) => a.title.localeCompare(b.title));
  }
}

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: StoredTask[];
  draggingId: string | null;
  intent: DropIntent | null;
  blockedCounts: Record<string, number>;
  onTaskClick: (task: StoredTask) => void;
  onDropTask: (taskId: string, status: TaskStatus, index: number | null) => void;
  onDragStartTask: (taskId: string) => void;
  onDragEndTask: () => void;
  onAddTask: (status: TaskStatus) => void;
  onMoveTask: (task: StoredTask, status: TaskStatus) => void;
  onArchiveTask: (task: StoredTask) => void;
  onDeleteTask: (task: StoredTask) => void;
}

export const KanbanColumn = memo(function KanbanColumn({
  status,
  tasks,
  draggingId,
  intent,
  blockedCounts,
  onTaskClick,
  onDropTask,
  onDragStartTask,
  onDragEndTask,
  onAddTask,
  onMoveTask,
  onArchiveTask,
  onDeleteTask,
}: KanbanColumnProps) {
  const meta = STATUS_META[status];
  const accent = meta.color;
  const StatusIcon = meta.icon;
  const [over, setOver] = useState(false);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [sort, setSort] = useState<SortKey>('manual');
  const listRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(() => sortTasks(tasks, sort), [tasks, sort]);
  const canReorder = sort === 'manual';

  const resolveDropIndex = (clientY: number): number => {
    const cards = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>('[data-task-card]') ?? [],
    ).filter((el) => el.dataset.taskCard !== draggingId);
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return cards.length;
  };

  const items: ReactNode[] = [];
  let slot = 0;
  const dropLine = (key: string) => (
    <div
      key={key}
      className="h-0.5 -my-1 rounded-full shrink-0"
      style={{ backgroundColor: $(accent) }}
    />
  );
  sorted.forEach((task) => {
    const isDragged = task.id === draggingId;
    if (!isDragged) {
      if (over && dropIndex === slot) items.push(dropLine(`line-${slot}`));
      slot++;
    }
    items.push(
      <div
        key={task.id}
        data-task-card={task.id}
        className={cn('transition-opacity', isDragged && 'opacity-40')}
      >
        <KanbanTaskCard
          task={task}
          intent={isDragged ? intent : null}
          blockedBy={blockedCounts[task.id] ?? 0}
          onClick={onTaskClick}
          onDragStart={onDragStartTask}
          onDragEnd={onDragEndTask}
          onMove={onMoveTask}
          onArchive={onArchiveTask}
          onDelete={onDeleteTask}
        />
      </div>,
    );
  });
  if (over && dropIndex === slot) items.push(dropLine('line-end'));

  return (
    <div
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(TASK_DRAG_TYPE)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setOver(true);
        setDropIndex(canReorder ? resolveDropIndex(e.clientY) : null);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setOver(false);
        setDropIndex(null);
      }}
      onDrop={(e) => {
        e.preventDefault();
        const index = canReorder ? (dropIndex ?? resolveDropIndex(e.clientY)) : null;
        setOver(false);
        setDropIndex(null);
        const id = e.dataTransfer.getData(TASK_DRAG_TYPE);
        if (id) onDropTask(id, status, index);
      }}
      className="flex-1 min-w-[260px] flex flex-col min-h-0 rounded-xl border bg-sidebar-background/50 overflow-hidden transition-colors"
      style={{ borderColor: over ? $(accent, 0.7) : undefined }}
    >
      <div className="shrink-0 px-3.5 py-3 flex items-center gap-2 border-b border-divider">
        <StatusIcon className="w-3.5 h-3.5 shrink-0" style={{ color: $(accent) }} />
        <span className="flex-1 text-xs font-semibold text-text-primary tracking-wide">
          {meta.label}
        </span>
        <span
          className="min-w-[22px] h-[22px] p-1 grid place-items-center text-[10px] font-mono leading-none rounded-[5px]"
          style={{ color: $(accent), backgroundColor: $(accent, 0.12) }}
        >
          {tasks.length}
        </span>
        <Dropdown trigger="click" align="end">
          <DropdownTrigger asChild>
            <button
              className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors cursor-pointer"
              title="Column options"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </DropdownTrigger>
          <DropdownContent>
            <DropdownItem icon={<Plus className="w-3.5 h-3.5" />} onClick={() => onAddTask(status)}>
              Add new task
            </DropdownItem>
            <DropdownSeparator />
            <DropdownSub>
              <DropdownSubTrigger icon={<ArrowUpDown />}>Sort by</DropdownSubTrigger>
              <DropdownSubContent className="px-1.5">
                {SORT_OPTIONS.map((o) => (
                  <DropdownItem
                    key={o.key}
                    closeOnSelect
                    onClick={() => setSort(o.key)}
                    icon={
                      sort === o.key ? (
                        <Check className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <span className="w-3.5 h-3.5" />
                      )
                    }
                  >
                    {o.label}
                  </DropdownItem>
                ))}
              </DropdownSubContent>
            </DropdownSub>
          </DropdownContent>
        </Dropdown>
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto custom-scrollbar p-2.5 flex flex-col gap-2.5"
      >
        {sorted.length > 0 ? items : <TaskEmptyState status={status} />}
      </div>
    </div>
  );
});

KanbanColumn.displayName = 'KanbanColumn';