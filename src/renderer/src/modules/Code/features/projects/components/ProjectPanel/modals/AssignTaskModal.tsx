import { memo, useEffect, useState } from 'react';
import {
  ArrowRightLeft,
  CalendarDays,
  Check,
  GitBranch,
  ListChecks,
  Lock,
  Paperclip,
  Search,
  Undo2,
  Unlink,
  X,
} from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { $ } from '@renderer/utils/color';
import { Modal, ModalBody } from '@renderer/components/ui/Modal';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import type { StoredTask, TaskPriority, TaskStatus } from '../../../../../shared/services/task.service';
import { STATUS_META } from '../../../../tasks/constants/status-meta.constants';
import { TaskIcon } from '../SessionCard';

interface AssignTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: StoredTask[];
  inProgressTasks: StoredTask[];
  projectName: string;
  branchName: string | null;
  onSelect: (task: StoredTask) => void;
  onSwitchProgress: (task: StoredTask, currentAction: Extract<TaskStatus, 'todo' | 'done'>) => void;
  onUnlink?: (task: StoredTask) => void;
}

const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  high: { label: 'High', color: '--error' },
  medium: { label: 'Medium', color: '--warn' },
  low: { label: 'Low', color: '--text-secondary' },
};


function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function formatPoint(date: number | null, time: string | null): string {
  if (date === null) return '—';
  return time ? `${formatDate(date)} ${time}` : formatDate(date);
}

const SectionLabel = ({ children }: { children: string }) => (
  <span className="px-1 text-[13px] font-semibold text-text-primary">{children}</span>
);

const EmptyState = ({ status, text }: { status: TaskStatus; text: string }) => {
  const { icon: Icon, color } = STATUS_META[status];
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 py-5 text-center">
      <div
        className="w-9 h-9 rounded-xl grid place-items-center"
        style={{ color: $(color), backgroundColor: $(color, 0.12) }}
      >
        <Icon className="w-4 h-4" strokeWidth={1.8} />
      </div>
      <span className="text-xs text-text-secondary">{text}</span>
    </div>
  );
};

const TaskCard = ({
  task,
  onClick,
  onUnlink,
}: {
  task: StoredTask;
  onClick?: () => void;
  onUnlink?: () => void;
}) => {
  const prio = PRIORITY_META[task.priority];
  const total = task.checklist.length;
  const done = task.checklist.filter((c) => c.done).length;
  const blockedBy = (task.dependsOn ?? []).length;
  const hasDate = task.startDate !== null || task.endDate !== null;
  const hasMeta = hasDate || total > 0 || task.attachments.length > 0 || blockedBy > 0;

  return (
    <div
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'relative flex flex-col gap-1 px-3 py-2 rounded-lg text-left outline-none transition-colors',
        onClick && 'hover:bg-card-hover cursor-pointer',
        onUnlink && 'pr-10',
      )}
    >
      <div className="flex items-center gap-2.5">
        <TaskIcon status={task.status} />
        <span className="flex-1 min-w-0 truncate text-sm text-text-primary">{task.title}</span>
      </div>

      <div className="flex flex-wrap items-center gap-1 pl-[21px]">
        <span
          className="text-[10px] font-medium rounded px-1.5 py-px leading-tight"
          style={{ color: $(prio.color), backgroundColor: $(prio.color, 0.12) }}
        >
          {prio.label}
        </span>
        {task.tags.slice(0, 4).map((tag) => (
          <span
            key={tag.id}
            className="text-[10px] font-medium rounded px-1.5 py-px leading-tight"
            style={{ color: $(tag.color), backgroundColor: $(tag.color, 0.12) }}
          >
            {tag.label}
          </span>
        ))}
        {task.tags.length > 4 && (
          <span className="text-[10px] text-text-secondary">+{task.tags.length - 4}</span>
        )}
      </div>

      {hasMeta && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-[21px] text-[11px] font-mono text-text-secondary">
          {hasDate && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="w-3 h-3 shrink-0" />
              {formatPoint(task.startDate, task.startTime)} - {formatPoint(task.endDate, task.endTime)}
            </span>
          )}
          {total > 0 && (
            <span className="inline-flex items-center gap-1">
              <ListChecks className="w-3 h-3 shrink-0" />
              {done}/{total}
            </span>
          )}
          {task.attachments.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Paperclip className="w-3 h-3 shrink-0" />
              {task.attachments.length}
            </span>
          )}
          {blockedBy > 0 && (
            <span
              className="inline-flex items-center gap-0.5"
              style={{ color: $('--error') }}
              title={`Depends on ${blockedBy} task(s)`}
            >
              <Lock className="w-3 h-3 shrink-0" />
              {blockedBy}
            </span>
          )}
        </div>
      )}

      {onUnlink && (
        <button
          type="button"
          onClick={onUnlink}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors outline-none"
          title="Unlink task"
        >
          <Unlink className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export const AssignTaskModal = memo(function AssignTaskModal({
  isOpen,
  onClose,
  tasks,
  inProgressTasks,
  projectName,
  branchName,
  onSelect,
  onSwitchProgress,
  onUnlink,
}: AssignTaskModalProps) {
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<StoredTask | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setPending(null);
    }
  }, [isOpen]);

  const q = query.trim().toLowerCase();
  const matches = (list: StoredTask[]) =>
    q ? list.filter((t) => t.title.toLowerCase().includes(q)) : list;
  const progressIds = new Set(inProgressTasks.map((t) => t.id));
  const todoSource = tasks.filter((t) => !progressIds.has(t.id));
  const visibleTodo = matches(todoSource);
  const visibleProgress = matches(inProgressTasks);

  const handleTodoClick = (t: StoredTask) => {
    if (inProgressTasks.length === 0) onSelect(t);
    else setPending(t);
  };

  const handleSwitch = (action: Extract<TaskStatus, 'todo' | 'done'>) => {
    if (!pending) return;
    onSwitchProgress(pending, action);
    setPending(null);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        className="w-[45%] min-w-[20%] max-w-[90%] min-h-[54%] max-h-[90%]"
      >
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border">
          <div className="min-w-0 flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-text-primary">Assign task</h3>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[11px] text-text-secondary truncate">{projectName}</span>
              {branchName && (
                <span
                  className="inline-flex items-center gap-1 min-w-0 max-w-[220px] text-[11px] font-mono font-medium rounded-md px-1.5 py-0.5"
                  style={{ color: $('--primary'), backgroundColor: $('--primary', 0.12) }}
                  title={branchName}
                >
                  <GitBranch className="w-3 h-3 shrink-0" />
                  <span className="truncate">{branchName}</span>
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 grid place-items-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <ModalBody className="flex-1 min-h-0 p-2.5 flex flex-col gap-2">
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-9 pr-3 py-1.5 text-[13px] bg-input-background border border-border rounded-lg text-text-primary placeholder:text-text-secondary/50 outline-none focus:outline-none focus:ring-0"
            />
          </div>
          <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
            {inProgressTasks.length > 0 && (
              <section className="shrink-0 flex flex-col gap-0.5">
                <SectionLabel>In Progress</SectionLabel>
                {visibleProgress.length === 0 ? (
                  <EmptyState status="progress" text="No matching tasks" />
                ) : (
                  visibleProgress.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onUnlink={onUnlink ? () => onUnlink(t) : undefined}
                    />
                  ))
                )}
              </section>
            )}

            <section className="flex-1 flex flex-col gap-0.5">
              <SectionLabel>Todo</SectionLabel>
              {visibleTodo.length === 0 ? (
                <EmptyState
                  status="todo"
                  text={q && todoSource.length > 0 ? 'No matching tasks' : 'No unassigned tasks'}
                />
              ) : (
                visibleTodo.map((t) => (
                  <TaskCard key={t.id} task={t} onClick={() => handleTodoClick(t)} />
                ))
              )}
            </section>
          </div>
        </ModalBody>
      </Modal>

      <Modal
        isOpen={isOpen && !!pending}
        onClose={() => setPending(null)}
        closeOnBackdropClick={false}
        className="max-w-[420px]"
      >
        <ModalBody className="py-6 px-5">
          <div className="flex flex-col items-center text-center gap-3">
            <div
              className="w-11 h-11 rounded-xl border grid place-items-center shrink-0"
              style={{
                color: $('--warn'),
                backgroundColor: $('--warn', 0.1),
                borderColor: $('--warn', 0.2),
              }}
            >
              <ArrowRightLeft className="w-5 h-5" strokeWidth={1.8} />
            </div>

            <h3 className="text-base font-semibold text-text-primary leading-snug">
              Switch task in progress?
            </h3>

            <p className="text-xs text-text-secondary leading-relaxed max-w-[320px]">
              <b className="font-medium text-text-primary break-words">
                {inProgressTasks.map((t) => t.title).join(', ')}
              </b>{' '}
              is currently in progress. Move it to Todo or mark it as Done, then start{' '}
              <b className="font-medium text-text-primary break-words">{pending?.title}</b>.
            </p>
          </div>
        </ModalBody>

        <ModalFooter className="gap-0 p-0 border-t border-border">
          <button
            type="button"
            onClick={() => setPending(null)}
            className="flex-1 h-[42px] text-xs font-medium text-text-secondary hover:bg-white/[0.03] hover:text-text-primary transition-colors border-r border-border"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSwitch('todo')}
            className="flex-1 h-[42px] text-xs font-semibold hover:bg-white/[0.03] transition-colors border-r border-border flex items-center justify-center gap-1.5"
            style={{ color: $('--warn') }}
          >
            <Undo2 className="w-3.5 h-3.5" />
            Move to Todo
          </button>
          <button
            type="button"
            onClick={() => handleSwitch('done')}
            className="flex-1 h-[42px] text-xs font-semibold hover:bg-white/[0.03] transition-colors flex items-center justify-center gap-1.5"
            style={{ color: $('--success') }}
          >
            <Check className="w-3.5 h-3.5" />
            Mark as Done
          </button>
        </ModalFooter>
      </Modal>
    </>
  );
});

export default AssignTaskModal;