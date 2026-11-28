// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { useState, useEffect, useCallback } from 'react';

// ── Hooks ──
import { useSessionTasks } from './useSessionTasks';

// ── Services ──
import {
  taskService,
  getBlockers,
  getUnfinishedChain,
  type StoredTask,
  type UpdateTaskInput,
} from '../../../shared/services/task.service';

// ── Types ──
import type { TaskStatus } from '../types/session.types';
import type { ProjectExtended } from '../types/project-panel.types';

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useProjectTaskActions(projects: ProjectExtended[]) {
  // ── Derived ──
  const bySession = useSessionTasks((s) => s.bySession);
  const tasksByPath = useSessionTasks((s) => s.byPath);
  const loadSessionTasks = useSessionTasks((s) => s.load);

  // ── Effects ──
  useEffect(() => {
    projects.forEach((p) => {
      if (p.path) void loadSessionTasks(p.path);
    });
  }, [projects.map((p) => p.path).join('|'), loadSessionTasks]);

  // ── Callbacks ──
  const findSessionProjectPath = useCallback(
    (sessionId: string) =>
      projects.find((p) => p.branches.some((b) => b.sessions.some((s) => s.id === sessionId)))
        ?.path,
    [projects],
  );

  // ── State ──
  const [forceStart, setForceStart] = useState<{
    path: string;
    title: string;
    chain: StoredTask[];
    proceed: () => Promise<unknown>;
  } | null>(null);

  // ── Callbacks ──
  const setTaskStatus = useCallback(
    (sessionId: string, status: TaskStatus) => {
      const task = bySession[sessionId];
      const path = findSessionProjectPath(sessionId);
      if (!task || !path) return;
      const all = tasksByPath[path] ?? [];

      const updates: UpdateTaskInput = { status };
      if (status === 'todo') {
        updates.sessionId = null;
      } else if (status === 'done') {
        updates.sessionId = null;
        updates.branchName = null;
      }

      if (status !== 'todo' && status !== task.status && getBlockers(task, all).length > 0) {
        setForceStart({
          path,
          title: task.title,
          chain: getUnfinishedChain(task, all),
          proceed: () => taskService.update(path, task.id, updates),
        });
        return;
      }
      void taskService.update(path, task.id, updates);
    },
    [bySession, tasksByPath, findSessionProjectPath],
  );

  const removeTask = useCallback(
    (sessionId: string) => {
      const task = bySession[sessionId];
      const path = findSessionProjectPath(sessionId);
      if (task && path)
        void taskService.update(path, task.id, {
          sessionId: null,
          branchName: null,
          ...(task.status === 'progress' ? { status: 'todo' as const } : {}),
        });
    },
    [bySession, findSessionProjectPath],
  );

  return {
    bySession,
    tasksByPath,
    loadSessionTasks,
    findSessionProjectPath,
    forceStart,
    setForceStart,
    setTaskStatus,
    removeTask,
  };
}