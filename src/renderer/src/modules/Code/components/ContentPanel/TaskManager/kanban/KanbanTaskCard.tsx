import { memo } from 'react';
import {
  CalendarDays,
  GitBranch,
  Terminal,
  Paperclip,
  ListChecks,
  Circle,
  Loader,
  Eye,
  CheckCircle2,
  Pencil,
  ArrowRightLeft,
  Archive,
  Trash2,
  Lock,
  type LucideIcon,
} from 'lucide-react';
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
import { TASK_DRAG_TYPE, INTENT_COLOR, type DropIntent } from './TaskDropZones';

export const STATUS_META: Record<TaskStatus, { label: string; icon: LucideIcon; color: string }> = {
  todo: { label: 'Todo', icon: Circle, color: '--text-secondary' },
  progress: { label: 'In Progress', icon: Loader, color: '--info' },
  review: { label: 'In Review', icon: Eye, color: '--warn' },
  done: { label: 'Done', icon: CheckCircle2, color: '--success' },
};

const STATUS_ORDER: TaskStatus[] = ['todo', 'progress', 'review', 'done'];

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  high: { label: 'High', color: '--error' },
  medium: { label: 'Medium', color: '--warn' },
  low: { label: 'Low', color: '--text-secondary' },
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

interface KanbanTaskCardProps {
  task: StoredTask;
  onClick: (task: StoredTask) => void;
  onDragStart?: (taskId: string) => void;
  onDragEnd?: () => void;
  intent?: DropIntent | null;
  onMove?: (task: StoredTask, status: TaskStatus) => void;
  onArchive?: (task: StoredTask) => void;
  onDelete?: (task: StoredTask) => void;
  blockedBy?: number;
}

export const KanbanTaskCard = memo(function KanbanTaskCard({
  task,
  onClick,
  onDragStart,
  onDragEnd,
  intent,
  onMove,
  onArchive,
  onDelete,
  blockedBy = 0,
}: KanbanTaskCardProps) {
  const prio = PRIORITY_CONFIG[task.priority];
  const isOverdue = task.endDate !== null && task.endDate < Date.now() && task.status !== 'done';
  const doneCount = task.checklist.filter((c) => c.done).length;
  const totalCount = task.checklist.length;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const hasFooter = task.endDate !== null || totalCount > 0 || task.attachments.length > 0;
  const intentColor = intent ? INTENT_COLOR[intent] : null;

  return (
    <Dropdown trigger="contextmenu" className="block w-full">
      <DropdownTrigger asChild>
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(TASK_DRAG_TYPE, task.id);
            e.dataTransfer.effectAllowed = 'move';
            onDragStart?.(task.id);
          }}
          onDragEnd={() => onDragEnd?.()}
          onClick={() => onClick(task)}
          className={cn(
            'group/card relative flex flex-col gap-2 p-3 rounded-lg cursor-pointer transition-colors',
            'bg-card-background border border-divider',
          )}
          style={
            intentColor
              ? {
                  borderStyle: 'dashed',
                  borderColor: $(intentColor, 0.9),
                  backgroundColor: $(intentColor, 0.08),
                }
              : undefined
          }
        >
          <div className="flex items-start gap-2">
            <span
              className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: $(prio.color) }}
              title={`${prio.label} priority`}
            />
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
            <h4 className="flex-1 min-w-0 text-[12.5px] font-semibold text-text-primary leading-snug line-clamp-2">
              {task.title}
            </h4>
          </div>

          {task.description && (
            <p className="text-[11px] text-text-secondary line-clamp-2 leading-snug">
              {task.description}
            </p>
          )}

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

          {totalCount > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: progress === 100 ? $('--success') : $('--primary'),
                  }}
                />
              </div>
              <span className="text-[10px] font-mono text-text-secondary">
                {doneCount}/{totalCount}
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
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-text-secondary bg-background rounded px-1.5 py-px max-w-[140px] truncate">
                  <GitBranch className="w-2.5 h-2.5 shrink-0" />
                  {task.branchName.replace(/^(feature|fix|hotfix|release)\//, '')}
                </span>
              )}
            </div>
          )}

          {hasFooter && (
            <div className="flex items-center gap-2.5 pt-1.5 border-t border-divider text-[10px] text-text-secondary">
              {totalCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <ListChecks className="w-3 h-3" />
                  {progress}%
                </span>
              )}
              {task.attachments.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Paperclip className="w-3 h-3" />
                  {task.attachments.length}
                </span>
              )}

              <span className="flex-1" />
              {task.endDate !== null && (
                <span
                  className="inline-flex items-center gap-1 font-mono rounded px-1 py-px"
                  style={
                    isOverdue
                      ? { color: $('--error'), backgroundColor: $('--error', 0.1) }
                      : undefined
                  }
                >
                  <CalendarDays className="w-3 h-3" />
                  {formatDate(task.endDate)}
                </span>
              )}
            </div>
          )}
        </div>
      </DropdownTrigger>
      <DropdownContent>
        <DropdownItem icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => onClick(task)}>
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
                  onClick={() => onMove?.(task, s)}
                  icon={<Icon className="w-3.5 h-3.5" style={{ color: $(meta.color) }} />}
                >
                  {meta.label}
                </DropdownItem>
              );
            })}
          </DropdownSubContent>
        </DropdownSub>
        <DropdownItem icon={<Archive className="w-3.5 h-3.5" />} onClick={() => onArchive?.(task)}>
          Archive
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem
          variant="error"
          icon={<Trash2 className="w-3.5 h-3.5" />}
          onClick={() => onDelete?.(task)}
        >
          Delete
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
});

KanbanTaskCard.displayName = 'KanbanTaskCard';