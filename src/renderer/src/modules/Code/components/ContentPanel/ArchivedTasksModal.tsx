import { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, Loader2 } from 'lucide-react';
import { Modal, ModalHeader, ModalBody } from '@renderer/components/ui/Modal';
import {
  taskService,
  TASKS_CHANGED_EVENT,
  type StoredTask,
  type CreateTaskInput,
  type UpdateTaskInput,
} from '../../services/task.service';
import { TaskModal } from './TaskManager/TaskModal';
import { ArchivedTaskCard } from './ArchivedTaskCard';

interface ArchivedTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectPath: string;
}

export function ArchivedTasksModal({ isOpen, onClose, projectPath }: ArchivedTasksModalProps) {
  const [all, setAll] = useState<StoredTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [editing, setEditing] = useState<StoredTask | null>(null);

  const tasks = useMemo(
    () => all.filter((t) => t.archived).sort((a, b) => b.updatedAt - a.updatedAt),
    [all],
  );

  const load = useCallback(
    async (showSpinner: boolean) => {
      if (!projectPath) {
        setAll([]);
        return;
      }
      if (showSpinner) setLoading(true);
      setError(null);
      try {
        setAll(await taskService.list(projectPath));
      } catch (e: any) {
        setError(e.message || 'Failed to load archived tasks');
      } finally {
        setLoading(false);
      }
    },
    [projectPath],
  );

  useEffect(() => {
    if (!isOpen) {
      setEditing(null);
      return;
    }
    void load(true);
    const onChanged = (e: Event) => {
      if ((e as CustomEvent<string>).detail === projectPath) void load(false);
    };
    window.addEventListener(TASKS_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(TASKS_CHANGED_EVENT, onChanged);
  }, [isOpen, projectPath, load]);

  const handleRestore = async (task: StoredTask) => {
    setRestoringId(task.id);
    try {
      const saved = await taskService.update(projectPath, task.id, { archived: false });
      setAll((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
    } catch (e: any) {
      setError(e.message || 'Failed to restore task');
    } finally {
      setRestoringId(null);
    }
  };

  const handleSubmit = async (
    payload: CreateTaskInput | UpdateTaskInput,
    nextIds: string[],
    forceChain?: StoredTask[],
  ) => {
    if (!editing) return;
    const target = editing;
    try {
      const updated: StoredTask[] = [];
      for (const t of forceChain ?? []) {
        updated.push(await taskService.update(projectPath, t.id, { status: 'done' }));
      }
      const saved = await taskService.update(projectPath, target.id, payload as UpdateTaskInput);
      updated.push(saved);
      for (const t of all) {
        if (t.id === target.id) continue;
        const has = t.dependsOn.includes(target.id);
        const should = nextIds.includes(t.id);
        if (has === should) continue;
        updated.push(
          await taskService.update(projectPath, t.id, {
            dependsOn: should
              ? [...t.dependsOn, target.id]
              : t.dependsOn.filter((id) => id !== target.id),
          }),
        );
      }
      setAll((prev) => prev.map((t) => updated.find((u) => u.id === t.id) ?? t));
      setEditing((cur) => (cur && cur.id === target.id ? saved : cur));
    } catch (e: any) {
      alert(`Error saving task: ${e.message}`);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} className="w-[70vw] max-w-6xl h-[80vh]">
        <ModalHeader
          title="Archived Tasks"
          description={`${tasks.length} archived ${tasks.length === 1 ? 'task' : 'tasks'}`}
          onClose={onClose}
        />
        <ModalBody className="p-4 custom-scrollbar">
          {loading ? (
            <div className="h-full flex items-center justify-center gap-2 text-xs text-text-secondary">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading...
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center text-xs text-error">{error}</div>
          ) : tasks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-text-secondary">
              <Archive className="w-6 h-6 opacity-50" strokeWidth={1.5} />
              <span className="text-xs">No archived tasks</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 content-start">
              {tasks.map((task) => (
                <ArchivedTaskCard
                  key={task.id}
                  task={task}
                  nextCount={all.filter((t) => t.dependsOn.includes(task.id)).length}
                  restoring={restoringId === task.id}
                  onOpen={setEditing}
                  onRestore={handleRestore}
                />
              ))}
            </div>
          )}
        </ModalBody>
      </Modal>
      <TaskModal
        open={editing !== null}
        task={editing}
        allTasks={all}
        onClose={() => setEditing(null)}
        onSubmit={handleSubmit}
        onSwitchTask={setEditing}
      />
    </>
  );
}

export default ArchivedTasksModal;