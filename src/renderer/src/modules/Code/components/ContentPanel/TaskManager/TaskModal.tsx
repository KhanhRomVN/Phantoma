/**
 * ------------------------------------------------------------------
 * Task Modal — unified form for creating and editing a task
 * ------------------------------------------------------------------
 * Rendered as an overlay dialog. Used by both "+ New Task" button
 * (create mode, no initial task) and clicking a KanbanTaskCard
 * (edit mode, with existing task).
 *
 * Fields: title, description, status, priority, session link,
 * branch link, due date.
 * ------------------------------------------------------------------
 */

import { memo, useState, useEffect } from 'react';
import { X, CalendarDays, GitBranch, Terminal } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import type { StoredTask, CreateTaskInput, UpdateTaskInput, TaskStatus, TaskPriority } from '../../../services/task.service';

// ─── Constants ──────────────────────────────────────────────────────

const STATUSES: [TaskStatus, string][] = [
  ['todo', 'Todo'],
  ['progress', 'In Progress'],
  ['review', 'In Review'],
  ['done', 'Done'],
];

const PRIORITIES: [TaskPriority, string, string][] = [
  ['high', 'High', '#ff4757'],
  ['medium', 'Medium', '#ffb020'],
  ['low', 'Low', '#8b8d96'],
];

// ─── Props ──────────────────────────────────────────────────────────

interface TaskModalProps {
  open: boolean;
  /** Existing task when editing; null/undefined when creating */
  task?: StoredTask | null;
  /** Available branches for linking */
  branches?: string[];
  /** Available sessions for linking */
  sessions?: { id: string; title: string }[];
  onClose: () => void;
  onSubmit: (data: CreateTaskInput | UpdateTaskInput) => void;
}

// ─── Component ──────────────────────────────────────────────────────

export const TaskModal = memo(function TaskModal({
  open,
  task,
  branches = [],
  sessions = [],
  onClose,
  onSubmit,
}: TaskModalProps) {
  const isEdit = !!task;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string | null>(null);
  const [dueDateStr, setDueDateStr] = useState<string>(''); // yyyy-MM-dd or ''

  // Sync form state when modal opens / task changes
  useEffect(() => {
    if (!open) return;
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setStatus(task.status);
      setPriority(task.priority);
      setSessionId(task.sessionId);
      setBranchName(task.branchName);
      setDueDateStr(task.dueDate ? toDateInputValue(task.dueDate) : '');
    } else {
      setTitle('');
      setDescription('');
      setStatus('todo');
      setPriority('medium');
      setSessionId(null);
      setBranchName(null);
      setDueDateStr('');
    }
  }, [open, task]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const payload: any = {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      sessionId,
      branchName,
      dueDate: dueDateStr ? new Date(dueDateStr + 'T23:59:59').getTime() : null,
    };

    onSubmit(payload);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-[520px] mx-4 bg-background border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-divider shrink-0">
          <h3 className="text-sm font-semibold text-text-primary">
            {isEdit ? 'Edit Task' : 'New Task'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-4">
          {/* Title */}
          <Field label="Title" required>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title..."
              className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-primary transition-colors"
              required
            />
          </Field>

          {/* Description */}
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details..."
              rows={3}
              className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-primary resize-none transition-colors"
            />
          </Field>

          {/* Status + Priority row */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
              >
                {STATUSES.map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </Field>

            <Field label="Priority">
              <div className="flex gap-1.5">
                {PRIORITIES.map(([k, l, c]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setPriority(k)}
                    className={cn(
                      'flex-1 px-2 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer',
                      priority === k
                        ? 'border-current'
                        : 'border-divider text-text-secondary hover:text-text-primary',
                    )}
                    style={priority === k ? { color: c, backgroundColor: `color-mix(in srgb, ${c} 10%, transparent)` } : undefined}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {/* Links row */}
          <div className="grid grid-cols-2 gap-4">
            <Field label={<><Terminal className="inline w-3 h-3 mr-1" />Linked Session</>}>
              <select
                value={sessionId ?? ''}
                onChange={(e) => setSessionId(e.target.value || null)}
                className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
              >
                <option value="">— None —</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </Field>

            <Field label={<><GitBranch className="inline w-3 h-3 mr-1" />Linked Branch</>}>
              <select
                value={branchName ?? ''}
                onChange={(e) => setBranchName(e.target.value || null)}
                className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
              >
                <option value="">— None —</option>
                {branches.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Due date */}
          <Field label={<><CalendarDays className="inline w-3 h-3 mr-1" />Due Date</>}>
            <input
              type="date"
              value={dueDateStr}
              onChange={(e) => setDueDateStr(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary transition-colors"
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-3 border-t border-divider flex items-center justify-end gap-2 bg-sidebar-background/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg text-text-secondary hover:bg-card-hover transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim()}
            className={cn(
              'px-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer',
              title.trim()
                ? 'bg-[#ff6a1f] text-white hover:bg-[#ff6a1f]/90'
                : 'bg-card-hover text-text-secondary/50 cursor-not-allowed',
            )}
          >
            {isEdit ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
});

TaskModal.displayName = 'TaskModal';

// ─── Helpers ───────────────────────────────────────────────────────

function Field({ label, required, children }: { label: React.ReactNode; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wide">
        {label}{required && <span className="text-[#ff6a1f] ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

function toDateInputValue(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}