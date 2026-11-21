import { create } from 'zustand';
import {
  taskService,
  TASKS_CHANGED_EVENT,
  type StoredTask,
} from '../services/task.service';
import { useCodeStore } from './useCodeStore';

interface SessionTasksState {
  byPath: Record<string, StoredTask[]>;
  bySession: Record<string, StoredTask>;
  load: (projectPath: string) => Promise<void>;
}

const sessionIdsOfBranch = (projectPath: string, branchName: string): string[] => {
  const project = useCodeStore.getState().projects.find((p) => p.path === projectPath);
  const branch = project?.branches?.find((b) => b.name === branchName);
  return (branch?.sessions ?? []).map((s) => s.id);
};

// Task hiển thị trên session card khi có sessionId.
// ASSUMED: task đang in progress được gán cho branch (chưa có sessionId) thì link vào session đầu tiên của branch đó.
const indexBySession = (byPath: Record<string, StoredTask[]>) => {
  const map: Record<string, StoredTask> = {};
  Object.values(byPath).forEach((list) =>
    list.forEach((t) => {
      if (t.archived || t.status === 'done') return;
      if (t.sessionId) map[t.sessionId] = t;
    }),
  );
  Object.entries(byPath).forEach(([path, list]) =>
    list.forEach((t) => {
      if (t.archived || t.status !== 'progress' || t.sessionId || !t.branchName) return;
      const sessionId = sessionIdsOfBranch(path, t.branchName)[0];
      if (sessionId && !map[sessionId]) map[sessionId] = t;
    }),
  );
  return map;
};

const sameIndex = (a: Record<string, StoredTask>, b: Record<string, StoredTask>) => {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k]);
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

// Session/branch đổi (tạo session mới...) => dựng lại index theo branch.
useCodeStore.subscribe(() => {
  const { byPath, bySession } = useSessionTasks.getState();
  const next = indexBySession(byPath);
  if (!sameIndex(bySession, next)) useSessionTasks.setState({ bySession: next });
});

window.addEventListener(TASKS_CHANGED_EVENT, (e) => {
  void useSessionTasks.getState().load((e as CustomEvent<string>).detail);
});