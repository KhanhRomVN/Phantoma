import { memo, useMemo } from 'react';
import { Modal, ModalBody } from '@renderer/components/ui/Modal';
import { X, Link2, Unlink } from 'lucide-react';
import type { StoredTask } from '../../services/task.service';
import { TaskIcon } from './SessionCard';
import { cn } from '@renderer/utils/cn';

interface TaskStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  branchName: string;
  tasks: StoredTask[];
  linkedTaskId: string | null;
  onLink: (taskId: string) => void;
  onUnlink: (taskId: string) => void;
}

export const TaskStatusModal = memo(function TaskStatusModal({
  isOpen,
  onClose,
  projectName,
  branchName,
  tasks,
  linkedTaskId,
  onLink,
  onUnlink,
}: TaskStatusModalProps) {
  const sortedTasks = useMemo(() => {
    // Filter: only tasks for this branch, exclude done tasks, sort: in progress first, then todo
    return tasks
      .filter((t) => t.branchName === branchName && t.status !== 'done')
      .sort((a, b) => {
        if (a.status === 'progress' && b.status !== 'progress') return -1;
        if (a.status !== 'progress' && b.status === 'progress') return 1;
        return 0;
      });
  }, [tasks, branchName]);

  // Only show linked task if it's not done and belongs to this branch
  const linked = tasks.find(
    (t) => t.id === linkedTaskId && t.branchName === branchName && t.status !== 'done',
  );
  const progressCount = sortedTasks.filter((t) => t.status === 'progress').length;
  const todoCount = sortedTasks.filter((t) => t.status === 'todo').length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[500px] w-[90vw]">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-divider">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-text-primary">Task Status</h3>
          <p className="text-[11px] text-text-secondary truncate">
            {projectName} · {branchName} · {progressCount} in progress, {todoCount} todo
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 grid place-items-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors outline-none"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <ModalBody className="p-3 flex flex-col gap-2">
        {/* Linked task section */}
        {linked && (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-text-secondary/60 font-semibold mb-1.5 px-1">
              In Progress
            </div>
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/20">
              <TaskIcon status={linked.status} />
              <span className="flex-1 min-w-0 truncate text-sm text-text-primary font-medium">
                {linked.title}
              </span>
              <button
                type="button"
                onClick={() => onUnlink(linked.id)}
                className="shrink-0 p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors"
                title="Unlink task"
              >
                <Unlink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Task list */}
        <div className="text-[11px] uppercase tracking-wider text-text-secondary/60 font-semibold px-1">
          Todo
        </div>
        <div className="flex flex-col gap-1 max-h-[320px] overflow-y-auto custom-scrollbar">
          {sortedTasks.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-text-secondary/60">
              No tasks available
            </p>
          ) : (
            sortedTasks.map((t) => {
              const isLinked = t.id === linkedTaskId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => !isLinked && onLink(t.id)}
                  disabled={isLinked}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-left outline-none transition-colors',
                    isLinked
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-card-hover cursor-pointer',
                  )}
                >
                  <TaskIcon status={t.status} />
                  <span className="flex-1 min-w-0 truncate text-sm text-text-primary">
                    {t.title}
                  </span>
                  {!isLinked && (
                    <Link2 className="w-3.5 h-3.5 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </ModalBody>
    </Modal>
  );
});

export default TaskStatusModal;
