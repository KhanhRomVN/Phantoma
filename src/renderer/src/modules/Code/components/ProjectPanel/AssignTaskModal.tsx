import { memo, useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Modal, ModalBody } from '@renderer/components/ui/Modal';
import type { StoredTask } from '../../services/task.service';
import { TaskIcon, TASK_STATUSES } from './SessionCard';

interface AssignTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: StoredTask[];
  targetLabel: string;
  onSelect: (task: StoredTask) => void;
}

const statusLabel = (s: StoredTask['status']) => TASK_STATUSES.find(([k]) => k === s)?.[1] ?? s;

export const AssignTaskModal = memo(function AssignTaskModal({
  isOpen,
  onClose,
  tasks,
  targetLabel,
  onSelect,
}: AssignTaskModalProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isOpen) setQuery('');
  }, [isOpen]);

  const q = query.trim().toLowerCase();
  const visible = q ? tasks.filter((t) => t.title.toLowerCase().includes(q)) : tasks;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[460px] w-[90vw]">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-divider">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-text-primary">Assign task</h3>
          <p className="text-[11px] text-text-secondary truncate">{targetLabel}</p>
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-input-background border border-border rounded-lg text-text-primary placeholder:text-text-secondary/50 outline-none focus:outline-none focus:ring-0"
          />
        </div>
        <div className="flex flex-col gap-1 max-h-[320px] overflow-y-auto custom-scrollbar">
          {visible.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-text-secondary/60">
              {tasks.length === 0 ? 'No unassigned tasks' : 'No matching tasks'}
            </p>
          ) : (
            visible.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelect(t)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left outline-none hover:bg-card-hover transition-colors cursor-pointer"
              >
                <TaskIcon status={t.status} />
                <span className="flex-1 min-w-0 truncate text-sm text-text-primary">{t.title}</span>
                <span className="shrink-0 text-[10px] text-text-secondary">{statusLabel(t.status)}</span>
              </button>
            ))
          )}
        </div>
      </ModalBody>
    </Modal>
  );
});

export default AssignTaskModal;