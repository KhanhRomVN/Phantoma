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

// Task chỉ hiển thị trên session card khi có sessionId.
// branchName chỉ dùng để assign task cho branch, không tự động link vào session.
const indexBySession = (byPath: Record<string, StoredTask[]>) => {
  const map: Record<string, StoredTask> = {};
  Object.entries(byPath).forEach(([path, list]) =>
    list.forEach((t) => {
      if (t.archived || t.status === 'done') return;
      // Chỉ task có sessionId mới được link vào session card
      if (t.sessionId) map[t.sessionId] = t;
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