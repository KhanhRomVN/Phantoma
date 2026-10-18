import { create } from 'zustand';
import {
  taskService,
  TASKS_CHANGED_EVENT,
  type StoredTask,
} from '../services/task.service';

interface SessionTasksState {
  byPath: Record<string, StoredTask[]>;
  bySession: Record<string, StoredTask>;
  load: (projectPath: string) => Promise<void>;
}

const indexBySession = (byPath: Record<string, StoredTask[]>) => {
  const map: Record<string, StoredTask> = {};
  Object.values(byPath).forEach((list) =>
    list.forEach((t) => {
      if (t.sessionId && !t.archived) map[t.sessionId] = t;
    }),
  );
  return map;
};

export const useSessionTasks = create<SessionTasksState>((set, get) => ({
  byPath: {},
  bySession: {},
  load: async (projectPath) => {
    if (!projectPath) return;
    try {
      const list = await taskService.list(projectPath);
      const byPath = { ...get().byPath, [projectPath]: list };
      set({ byPath, bySession: indexBySession(byPath) });
    } catch (e) {
      console.error('[useSessionTasks] Load failed:', e);
    }
  },
}));

window.addEventListener(TASKS_CHANGED_EVENT, (e) => {
  void useSessionTasks.getState().load((e as CustomEvent<string>).detail);
});