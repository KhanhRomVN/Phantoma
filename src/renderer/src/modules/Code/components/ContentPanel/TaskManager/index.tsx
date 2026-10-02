/**
 * ------------------------------------------------------------------
 * Task Manager — Kanban Board with SQLite Persistence
 * ------------------------------------------------------------------
 * Replaces the old mock-data version. Now uses real IPC calls to
 * manage tasks stored in ~/.phantoma/code:{slug}/task.sqlite.
 * 
 * Features:
 * - 4 columns (Todo, In Progress, Review, Done) with subtle accents.
 * - Flush layout (no gaps between columns).
 * - Header bar moved to ContentPanel level (handled by parent).
 * - Create/Edit via TaskModal.
 * - Search and Add buttons are expected to be rendered by the 
 *   ContentHeaderBar or a dedicated toolbar passed as props if needed,
 *   BUT per requirements #2 & #3, we assume this component focuses on
 *   the BOARD itself, while the HEADER actions might be lifted up or
 *   handled internally depending on final integration. 
 *   
 *   For now, this component renders the full board area including its own
 *   internal state management for modals and data fetching.
 * ------------------------------------------------------------------
 */

import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { useCodeStore } from '../../../hooks/useCodeStore';
import { taskService, type StoredTask, type TaskStatus } from '../../../services/task.service';
import { KanbanColumn } from './KanbanColumn';
import { TaskModal } from './TaskModal';

// ─── Constants ──────────────────────────────────────────────────────

const COLUMNS: TaskStatus[] = ['todo', 'progress', 'review', 'done'];

// ─── Component ─────────────────────────────────────────────────────

export const TaskManager = memo(function TaskManager() {
  // Get full project object to extract path for SQLite lookup
  const project = useCodeStore((s) => 
    s.projects.find((p) => p.id === s.currentProjectId)
  );
  const projectPath = project?.path ?? '';

  // NOTE: Branch/session data lives in ProjectPanel's extended model, not in useCodeStore.
  // For now, provide empty arrays — will be wired up once we lift that context into the store
  // or pass it down via props from ContentPanel.
  const availableBranches = useMemo<string[]>(() => [], []);
  const availableSessions = useMemo<{ id: string; title: string }[]>(() => [], []);

  // Data State
  const [tasks, setTasks] = useState<StoredTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<StoredTask | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch tasks on mount / project change
  const fetchTasks = useCallback(async () => {
    if (!projectPath) return;
    setLoading(true);
    setError(null);
    try {
      const data = await taskService.list(projectPath);
      setTasks(data);
    } catch (e: any) {
      console.error('[TaskManager] Fetch failed:', e);
      setError(e.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Listen to global events dispatched by ContentHeaderBar
  useEffect(() => {
    const onNewTask = () => {
      setEditingTask(null);
      setModalOpen(true);
    };
    const onSearch = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      setSearchQuery(detail ?? '');
    };

    window.addEventListener('phantoma:new-task', onNewTask);
    window.addEventListener('phantoma:task-search', onSearch as EventListener);
    return () => {
      window.removeEventListener('phantoma:new-task', onNewTask);
      window.removeEventListener('phantoma:task-search', onSearch as EventListener);
    };
  }, []);

  // Handlers
  const handleEdit = (task: StoredTask) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleSubmit = async (payload: any) => {
    if (!projectPath) return;
    try {
      if (editingTask) {
        // Update
        const updated = await taskService.update(projectPath, editingTask.id, payload);
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        // Create
        const created = await taskService.create(projectPath, payload);
        setTasks((prev) => [created, ...prev]);
      }
      setModalOpen(false);
    } catch (e: any) {
      alert(`Error saving task: ${e.message}`);
    }
  };

  // Filtered tasks based on search
  const filteredTasks = searchQuery.trim()
    ? tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : tasks;

  // Group by status
  const groupedTasks = COLUMNS.reduce(
    (acc, status) => {
      acc[status] = filteredTasks.filter((t) => t.status === status);
      return acc;
    },
    {} as Record<TaskStatus, StoredTask[]>,
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background text-text-secondary/50">
        Loading tasks...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background gap-2 text-[#ff4757]">
        <span className="text-sm font-medium">Failed to load tasks</span>
        <span className="text-xs opacity-70">{error}</span>
        <button onClick={fetchTasks} className="mt-2 px-3 py-1 text-xs rounded border border-border hover:bg-card-hover cursor-pointer">
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Toolbar (Search + Actions) — Requirement #2 says these go in ContentHeaderBar, 
          but since we are refactoring TaskManager specifically, we'll put a local toolbar here 
          that CAN BE MOVED UP later if strict adherence to "ContentHeaderBar" is required.
          However, looking at req #2: "thay vào đó ở headerBar ... của src/renderer/src/modules/Code/components/ContentPanel".
          So ideally, THIS component should just be the board. But for self-containment during dev:
      */}
      
      {/* NOTE: The prompt asks to REMOVE the div containing "Task Board" and "+ New Task" button.
          And move them to ContentPanel's header. 
          Since I am modifying TaskManager/index.tsx, I will remove the internal header here.
          The parent (ContentPanel) needs to render the header controls.
          
          FOR NOW: I will keep a minimal container so it doesn't break visually if parent isn't updated yet,
          but strictly speaking, this file should ONLY export the Grid.
          
          Let's assume the Parent handles the header. This returns JUST the board grid.
      */}

      <div className="flex-1 flex min-h-0 overflow-hidden bg-background">
        {/* Columns Container — No padding, no gap */}
        <div className="flex-1 flex overflow-x-auto custom-scrollbar">
          {COLUMNS.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={groupedTasks[status]}
              onTaskClick={handleEdit}
            />
          ))}
        </div>
      </div>

      <TaskModal
        open={modalOpen}
        task={editingTask}
        branches={availableBranches}
        sessions={availableSessions}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
});

TaskManager.displayName = 'TaskManager';

export default TaskManager;