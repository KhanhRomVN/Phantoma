import { memo, useState, useEffect, useCallback, useMemo } from 'react';
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
import { TaskModal } from './TaskModal';
import { TaskTable } from './TaskTable';
import {
  FilterSection,
  EMPTY_FILTERS,
  applyTaskFilters,
  countActiveFilters,
  type TaskFilters,
} from './FilterSection';
import { ConfirmArchiveTaskModal } from './ConfirmArchiveTaskModal';
import { ConfirmDeleteTaskModal } from './ConfirmDeleteTaskModal';
import { ConfirmForceStartTaskModal } from './ConfirmForceStartTaskModal';

const bulkTitle = (list: StoredTask[]): string =>
  list.length === 1 ? list[0].title : list.length > 1 ? `${list.length} tasks` : '';

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
  const [archiveTargets, setArchiveTargets] = useState<StoredTask[]>([]);
  const [deleteTargets, setDeleteTargets] = useState<StoredTask[]>([]);

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
    window.addEventListener('phantoma:new-task', onNewTask);
    window.addEventListener('phantoma:task-search', onSearch as EventListener);
    return () => {
      window.removeEventListener('phantoma:new-task', onNewTask);
      window.removeEventListener('phantoma:task-search', onSearch as EventListener);
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

  const blockedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTasks.forEach((t) => {
      if (t.status !== 'done') counts[t.id] = getBlockers(t, tasks).length;
    });
    return counts;
  }, [filteredTasks, tasks]);

  const [filters, setFilters] = useState<TaskFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    const onFilterOpen = (e: Event) => setFilterOpen(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener('phantoma:task-filter-open', onFilterOpen);
    return () => window.removeEventListener('phantoma:task-filter-open', onFilterOpen);
  }, []);

  const visibleTasks = useMemo(
    () => applyTaskFilters(filteredTasks, filters, blockedCounts),
    [filteredTasks, filters, blockedCounts],
  );

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('phantoma:task-filter-count', { detail: countActiveFilters(filters) }),
    );
  }, [filters]);

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
      results.push(await taskService.update(projectPath, t.id, { status: 'done', sessionId: null, branchName: null }));
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

  const deleteTasksByIds = useCallback(
    async (ids: string[]) => {
      if (!projectPath || ids.length === 0) return;
      try {
        const doomed = new Set(ids);
        const byId = new Map(tasks.map((t) => [t.id, t]));
        const expand = (depId: string, seen: Set<string>): string[] => {
          if (!doomed.has(depId)) return [depId];
          if (seen.has(depId)) return [];
          seen.add(depId);
          return (byId.get(depId)?.dependsOn ?? []).flatMap((d) => expand(d, seen));
        };
        for (const id of ids) await taskService.delete(projectPath, id);
        const affected = tasks.filter(
          (t) => !doomed.has(t.id) && t.dependsOn.some((d) => doomed.has(d)),
        );
        const updated = await Promise.all(
          affected.map((t) =>
            taskService.update(projectPath, t.id, {
              dependsOn: [...new Set(t.dependsOn.flatMap((d) => expand(d, new Set<string>())))],
            }),
          ),
        );
        setTasks((prev) =>
          prev.filter((t) => !doomed.has(t.id)).map((t) => updated.find((u) => u.id === t.id) ?? t),
        );
      } catch (e: any) {
        alert(`Error deleting task: ${e.message}`);
      }
    },
    [projectPath, tasks],
  );

  const handleDelete = async () => {
    if (!editingTask) return;
    await deleteTasksByIds([editingTask.id]);
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

  const handleMoveTask = useCallback(
    (task: StoredTask, status: TaskStatus) => {
      if (task.status === status) return;
      if (status !== 'todo' && getBlockers(task, tasks).length > 0) {
        setForceStart({
          title: task.title,
          chain: getUnfinishedChain(task, tasks),
          proceed: () => patchTask(task.id, { status }),
        });
        return;
      }
      void patchTask(task.id, { status });
    },
    [tasks, patchTask],
  );


  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-0 gap-3 p-4 bg-background">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Loading tasks...
        </div>
        <div className="flex flex-col gap-2 animate-pulse">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-md bg-card-hover/60" />
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

  return (
    <>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
        {filterOpen && (
          <FilterSection
            tasks={filteredTasks}
            blockedCounts={blockedCounts}
            resultCount={visibleTasks.length}
            filters={filters}
            onChange={setFilters}
          />
        )}
        <TaskTable
          tasks={visibleTasks}
          blockedCounts={blockedCounts}
          onTaskClick={handleEdit}
          onAdd={() => openNew()}
          onMoveTask={handleMoveTask}
          onArchiveTask={(t) => setArchiveTargets([t])}
          onDeleteTask={(t) => setDeleteTargets([t])}

          onArchiveTasks={setArchiveTargets}
          onDeleteTasks={setDeleteTargets}
        />
      </div>

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
        isOpen={archiveTargets.length > 0}
        taskTitle={bulkTitle(archiveTargets)}
        onClose={() => setArchiveTargets([])}
        onConfirm={() => {
          archiveTargets.forEach((t) => void patchTask(t.id, { archived: true }));
        }}
      />

      <ConfirmDeleteTaskModal
        isOpen={deleteTargets.length > 0}
        taskTitle={bulkTitle(deleteTargets)}
        onClose={() => setDeleteTargets([])}
        onConfirm={() => {
          void deleteTasksByIds(deleteTargets.map((t) => t.id));
        }}
      />
    </>
  );
});

TaskManager.displayName = 'TaskManager';

export default TaskManager;