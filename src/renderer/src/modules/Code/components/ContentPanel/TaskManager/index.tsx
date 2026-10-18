import { memo, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useCodeStore } from '../../../hooks/useCodeStore';
import {
  taskService,
  getBlockers,
  getUnfinishedChain,
  TASKS_CHANGED_EVENT,
  type StoredTask,
  type TaskStatus,
  type CreateTaskInput,
  type UpdateTaskInput,
} from '../../../services/task.service';
import { KanbanColumn } from './kanban/KanbanColumn';
import { TaskModal } from './TaskModal';
import { TaskTable } from './table/TaskTable';
import { TimelineView } from './timeline/TimelineView';
import { TaskDropZones, type DropIntent } from './kanban/TaskDropZones';
import { ConfirmArchiveTaskModal } from './ConfirmArchiveTaskModal';
import { ConfirmDeleteTaskModal } from './ConfirmDeleteTaskModal';
import { ConfirmForceStartTaskModal } from './ConfirmForceStartTaskModal';

const COLUMNS: TaskStatus[] = ['todo', 'progress', 'review', 'done'];

type Layout = 'board' | 'table' | 'timeline';

const toLayout = (v: unknown): Layout => (v === 'table' || v === 'timeline' ? v : 'board');

const taskOrder = (t: StoredTask): number => t.order ?? t.createdAt;

export const TaskManager = memo(function TaskManager() {
  const project = useCodeStore((s) => s.projects.find((p) => p.id === s.currentProjectId));
  const projectPath = project?.path ?? '';

  const [tasks, setTasks] = useState<StoredTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<StoredTask | null>(null);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [intent, setIntent] = useState<DropIntent | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<StoredTask | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StoredTask | null>(null);
  const dragActiveRef = useRef(false);
  const [layout, setLayout] = useState<Layout>(() => {
    try {
      return toLayout(localStorage.getItem('phantoma:task-layout'));
    } catch {
      return 'board';
    }
  });

  const fetchTasks = useCallback(async () => {
    if (!projectPath) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setTasks(await taskService.list(projectPath));
    } catch (e: any) {
      console.error('[TaskManager] Fetch failed:', e);
      setError(e.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  const refreshSilently = useCallback(async () => {
    if (!projectPath) return;
    try {
      setTasks(await taskService.list(projectPath));
    } catch (e) {
      console.error('[TaskManager] Refresh failed:', e);
    }
  }, [projectPath]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const onChanged = (e: Event) => {
      if ((e as CustomEvent<string>).detail === projectPath) void refreshSilently();
    };
    window.addEventListener(TASKS_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(TASKS_CHANGED_EVENT, onChanged);
  }, [projectPath, refreshSilently]);

  useEffect(() => {
    const onNewTask = () => {
      setEditingTask(null);
      setNewTaskStatus(null);
      setModalOpen(true);
    };
    const onSearch = (e: Event) => {
      setSearchQuery((e as CustomEvent<string>).detail ?? '');
    };
    const onLayout = (e: Event) => setLayout(toLayout((e as CustomEvent<Layout>).detail));
    window.addEventListener('phantoma:new-task', onNewTask);
    window.addEventListener('phantoma:task-search', onSearch as EventListener);
    window.addEventListener('phantoma:task-layout', onLayout as EventListener);
    return () => {
      window.removeEventListener('phantoma:new-task', onNewTask);
      window.removeEventListener('phantoma:task-search', onSearch as EventListener);
      window.removeEventListener('phantoma:task-layout', onLayout as EventListener);
    };
  }, []);

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const visible = tasks.filter((t) => !t.archived);
    if (!q) return visible;
    return visible.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.label.toLowerCase().includes(q)),
    );
  }, [tasks, searchQuery]);

  const groupedTasks = useMemo(
    () =>
      COLUMNS.reduce(
        (acc, status) => {
          acc[status] = filteredTasks
            .filter((t) => t.status === status)
            .sort((a, b) => taskOrder(a) - taskOrder(b));
          return acc;
        },
        {} as Record<TaskStatus, StoredTask[]>,
      ),
    [filteredTasks],
  );

  const blockedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTasks.forEach((t) => {
      if (t.status !== 'done') counts[t.id] = getBlockers(t, tasks).length;
    });
    return counts;
  }, [filteredTasks, tasks]);

  const handleEdit = (task: StoredTask) => {
    setEditingTask(task);
    setNewTaskStatus(null);
    setModalOpen(true);
  };

  const openNew = useCallback((status?: TaskStatus) => {
    setEditingTask(null);
    setNewTaskStatus(status ?? null);
    setModalOpen(true);
  }, []);

  const syncNextTasks = async (selfId: string, nextIds: string[]) => {
    const pending = tasks
      .filter((t) => t.id !== selfId)
      .flatMap((t) => {
        const has = t.dependsOn.includes(selfId);
        const should = nextIds.includes(t.id);
        if (has === should) return [];
        const dependsOn = should
          ? [...t.dependsOn, selfId]
          : t.dependsOn.filter((id) => id !== selfId);
        return [taskService.update(projectPath, t.id, { dependsOn })];
      });
    if (pending.length === 0) return;
    const results = await Promise.all(pending);
    setTasks((prev) => prev.map((t) => results.find((r) => r.id === t.id) ?? t));
  };

  const completeChain = async (chain: StoredTask[]) => {
    const results: StoredTask[] = [];
    for (const t of chain) {
      results.push(await taskService.update(projectPath, t.id, { status: 'done' }));
    }
    setTasks((prev) => prev.map((t) => results.find((r) => r.id === t.id) ?? t));
  };

  const [forceStart, setForceStart] = useState<{
    title: string;
    chain: StoredTask[];
    proceed: () => void | Promise<void>;
  } | null>(null);

  const handleSubmit = async (
    payload: CreateTaskInput | UpdateTaskInput,
    nextIds?: string[],
    forceChain?: StoredTask[],
  ) => {
    if (!projectPath) return;
    const status = payload.status ?? editingTask?.status ?? 'todo';
    const dependsOn = payload.dependsOn ?? editingTask?.dependsOn ?? [];
    const save = async () => {
      try {
        if (forceChain && forceChain.length > 0) await completeChain(forceChain);
        const saved = editingTask
          ? await taskService.update(projectPath, editingTask.id, payload)
          : await taskService.create(projectPath, payload as CreateTaskInput);
        setTasks((prev) =>
          editingTask ? prev.map((t) => (t.id === saved.id ? saved : t)) : [saved, ...prev],
        );
        if (nextIds) await syncNextTasks(saved.id, nextIds);
        if (editingTask) setEditingTask((cur) => (cur && cur.id === saved.id ? saved : cur));
        else setModalOpen(false);
      } catch (e: any) {
        alert(`Error saving task: ${e.message}`);
      }
    };
    const statusChanged = !editingTask || status !== editingTask.status;
    if (
      statusChanged &&
      status !== 'todo' &&
      !forceChain &&
      getBlockers({ dependsOn }, tasks).length > 0
    ) {
      setForceStart({
        title: payload.title ?? editingTask?.title ?? '',
        chain: getUnfinishedChain({ dependsOn }, tasks),
        proceed: save,
      });
      return;
    }
    await save();
  };

  const deleteTaskById = useCallback(
    async (taskId: string) => {
      if (!projectPath) return;
      try {
        const bridge = tasks.find((t) => t.id === taskId)?.dependsOn ?? [];
        await taskService.delete(projectPath, taskId);
        const dependents = tasks.filter((t) => t.id !== taskId && t.dependsOn.includes(taskId));
        const updated = await Promise.all(
          dependents.map((t) =>
            taskService.update(projectPath, t.id, {
              dependsOn: [...new Set([...t.dependsOn.filter((id) => id !== taskId), ...bridge])],
            }),
          ),
        );
        setTasks((prev) =>
          prev.filter((t) => t.id !== taskId).map((t) => updated.find((u) => u.id === t.id) ?? t),
        );
      } catch (e: any) {
        alert(`Error deleting task: ${e.message}`);
      }
    },
    [projectPath, tasks],
  );

  const handleDelete = async () => {
    if (!editingTask) return;
    await deleteTaskById(editingTask.id);
    setModalOpen(false);
  };

  const patchTask = useCallback(
    async (taskId: string, updates: UpdateTaskInput) => {
      if (!projectPath) return;
      try {
        const updated = await taskService.update(projectPath, taskId, updates);
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } catch (e: any) {
        alert(`Error updating task: ${e.message}`);
      }
    },
    [projectPath],
  );

  const resetDrag = useCallback(() => {
    dragActiveRef.current = false;
    setDraggingId(null);
    setIntent(null);
  }, []);

  const handleDragStart = useCallback((taskId: string) => {
    dragActiveRef.current = true;
    setTimeout(() => {
      if (dragActiveRef.current) setDraggingId(taskId);
    }, 0);
  }, []);

  const handleDropStatus = useCallback(
    (taskId: string, status: TaskStatus, index: number | null) => {
      resetDrag();
      const t = tasks.find((x) => x.id === taskId);
      if (!t) return;
      if (status !== 'todo' && t.status !== status && getBlockers(t, tasks).length > 0) {
        setForceStart({
          title: t.title,
          chain: getUnfinishedChain(t, tasks),
          proceed: () => patchTask(taskId, { status }),
        });
        return;
      }
      if (index === null) {
        if (t.status !== status) void patchTask(taskId, { status });
        return;
      }
      const fullColumn = groupedTasks[status] ?? [];
      if (t.status === status && fullColumn.findIndex((x) => x.id === taskId) === index) return;
      const column = fullColumn.filter((x) => x.id !== taskId);
      const prev = index > 0 ? taskOrder(column[index - 1]) : null;
      const next = index < column.length ? taskOrder(column[index]) : null;
      // midpoint ordering loses float precision after ~40 consecutive inserts in one gap — upgrade path: renumber the column
      let order: number;
      if (prev !== null && next !== null) order = (prev + next) / 2;
      else if (prev !== null) order = prev + 1000;
      else if (next !== null) order = next - 1000;
      else order = Date.now();
      void patchTask(taskId, { status, order });
    },
    [tasks, groupedTasks, patchTask, resetDrag],
  );

  const handleDropArchive = useCallback(
    (taskId: string) => {
      resetDrag();
      const t = tasks.find((x) => x.id === taskId);
      if (t) setArchiveTarget(t);
    },
    [tasks, resetDrag],
  );

  const handleDropDelete = useCallback(
    (taskId: string) => {
      resetDrag();
      const t = tasks.find((x) => x.id === taskId);
      if (t) setDeleteTarget(t);
    },
    [tasks, resetDrag],
  );

  const handleMoveTask = useCallback(
    (task: StoredTask, status: TaskStatus) =>
      handleDropStatus(task.id, status, (groupedTasks[status] ?? []).length),
    [handleDropStatus, groupedTasks],
  );

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-0 gap-3 p-4 bg-background">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Loading tasks...
        </div>
        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
          {COLUMNS.map((status) => (
            <div
              key={status}
              className="flex-1 min-w-[240px] flex flex-col gap-2 rounded-lg border border-divider bg-card-background p-3 animate-pulse"
            >
              <div className="h-3 w-1/3 rounded bg-card-hover" />
              <div className="h-16 rounded-md bg-card-hover/60" />
              <div className="h-16 rounded-md bg-card-hover/60" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background gap-2 text-error">
        <span className="text-sm font-medium">Failed to load tasks</span>
        <span className="text-xs opacity-70">{error}</span>
        <button
          onClick={fetchTasks}
          className="mt-2 px-3 py-1 text-xs rounded-md border border-border text-text-primary hover:bg-card-hover cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const noPadding = layout === 'table' || layout === 'timeline';

  return (
    <>
      <div
        className={`flex-1 flex min-h-0 overflow-hidden bg-background ${noPadding ? '' : 'p-4'}`}
      >
        {layout === 'table' && (
          <TaskTable tasks={filteredTasks} onTaskClick={handleEdit} onAdd={() => openNew()} />
        )}
        {layout === 'timeline' && (
          <TimelineView
            tasks={filteredTasks}
            highlighted={searchQuery.trim() !== ''}
            onTaskClick={handleEdit}
            onAdd={() => openNew()}
          />
        )}
        {layout === 'board' && (
          <div className="flex-1 flex gap-4 min-h-0 overflow-x-auto custom-scrollbar">
            {COLUMNS.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={groupedTasks[status]}
                draggingId={draggingId}
                intent={intent}
                blockedCounts={blockedCounts}
                onTaskClick={handleEdit}
                onDropTask={handleDropStatus}
                onDragStartTask={handleDragStart}
                onDragEndTask={resetDrag}
                onAddTask={openNew}
                onMoveTask={handleMoveTask}
                onArchiveTask={setArchiveTarget}
                onDeleteTask={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </div>

      <TaskDropZones
        visible={draggingId !== null && layout === 'board'}
        onArchive={handleDropArchive}
        onDelete={handleDropDelete}
        onIntentChange={setIntent}
      />

      <TaskModal
        open={modalOpen}
        task={editingTask}
        allTasks={tasks}
        defaultStatus={newTaskStatus ?? undefined}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        onDelete={editingTask ? handleDelete : undefined}
        onSwitchTask={handleEdit}
      />

      <ConfirmForceStartTaskModal
        isOpen={!!forceStart}
        taskTitle={forceStart?.title ?? ''}
        chain={forceStart?.chain ?? []}
        onClose={() => setForceStart(null)}
        onConfirm={() => {
          const pending = forceStart;
          if (!pending) return;
          void (async () => {
            try {
              await completeChain(pending.chain);
              await pending.proceed();
            } catch (e: any) {
              alert(`Error updating tasks: ${e.message}`);
            }
          })();
        }}
      />

      <ConfirmArchiveTaskModal
        isOpen={!!archiveTarget}
        taskTitle={archiveTarget?.title ?? ''}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => {
          if (archiveTarget) void patchTask(archiveTarget.id, { archived: true });
        }}
      />

      <ConfirmDeleteTaskModal
        isOpen={!!deleteTarget}
        taskTitle={deleteTarget?.title ?? ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void deleteTaskById(deleteTarget.id);
        }}
      />
    </>
  );
});

TaskManager.displayName = 'TaskManager';

export default TaskManager;