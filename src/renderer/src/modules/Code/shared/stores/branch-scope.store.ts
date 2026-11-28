/**
 * ------------------------------------------------------------------
 * Branch Scope Store
 * ------------------------------------------------------------------
 * Zustand store giữ phạm vi (scope) đường dẫn được phép sửa của từng
 * branch theo project. Server là nguồn dữ liệu duy nhất; store chỉ giữ
 * state trong bộ nhớ và đồng bộ qua codeApi.
 *
 * Main functions:
 * - toScopeKey()  : Tạo key projectId::branchName
 * - isInScope()   : Kiểm tra đường dẫn có nằm trong scope
 *
 * Main actions:
 * - setScope()          : Đặt scope cho branch và đẩy lên server
 * - refreshFromServer() : Nạp lại scope của project từ server
 * - clearProject()      : Xóa scope của một project
 *
 * Main hooks:
 * - useBranchScope() : Lấy scope của một branch
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Services ──
import { codeApi } from '../api/code.api';

// ── Stores ──
import { create } from 'zustand';
import { useScopeStatsStore } from './scope-stats.store';

// ─── Functions ───────────────────────────────────────────────────────────────
export const toScopeKey = (projectId: string, branchName: string): string =>
  `${projectId}::${branchName}`;

// ─── Types ───────────────────────────────────────────────────────────────────
interface BranchScopeState {
  scopes: Record<string, string[]>;
  loaded: Record<string, boolean>;
  setScope: (projectId: string, branchName: string, paths: string[]) => void;
  clearProject: (projectId: string) => void;
  refreshFromServer: (projectId: string) => Promise<void>;
}

const pushToServer = async (
  projectId: string,
  branchName: string,
  paths: string[],
): Promise<void> => {
  try {
    const worktrees = await codeApi.worktrees.list(projectId);
    const worktree = worktrees.find((w) => w.branch === branchName);
    if (!worktree) {
      console.warn('[scopeStore.pushToServer] no worktree for branch', { projectId, branchName });
      return;
    }
    await codeApi.scopes.set(worktree.id, paths);
  } catch (err) {
    console.warn('[scopeStore.pushToServer] failed:', err);
  }
};

// ─── Constants ───────────────────────────────────────────────────────────────
// Server là nguồn dữ liệu duy nhất; store chỉ giữ state trong bộ nhớ, không lưu localStorage.
const inflight = new Map<string, Promise<void>>();

// ─── Store ───────────────────────────────────────────────────────────────────
export const useBranchScopeStore = create<BranchScopeState>((set, get) => ({
  scopes: {},
  loaded: {},
  setScope: (projectId, branchName, paths) => {
    const defaultBranch = useScopeStatsStore.getState().defaultBranchByProject[projectId];
    if (branchName && branchName === defaultBranch) {
      return;
    }
    set({ scopes: { ...get().scopes, [toScopeKey(projectId, branchName)]: paths } });
    void pushToServer(projectId, branchName, paths);
  },
  refreshFromServer: (projectId) => {
    const running = inflight.get(projectId);
    if (running) return running;
    const task = (async () => {
    try {
      const worktrees = await codeApi.worktrees.list(projectId);
      const results = await Promise.all(
        worktrees.map(async (w) => ({
          branch: w.branch,
          paths: (await codeApi.scopes.list(w.id)).map((s) => s.path),
        })),
      );
      const scopes = { ...get().scopes };
      for (const r of results) {
        const key = toScopeKey(projectId, r.branch);
        if (r.paths.length > 0) scopes[key] = r.paths;
        else delete scopes[key];
      }
      set({ scopes, loaded: { ...get().loaded, [projectId]: true } });
    } catch (err) {
      console.warn('[scopeStore.refreshFromServer] failed:', err);
    }
    })().finally(() => inflight.delete(projectId));
    inflight.set(projectId, task);
    return task;
  },
  clearProject: (projectId) => {
    const prefix = `${projectId}::`;
    set({
      scopes: Object.fromEntries(
        Object.entries(get().scopes).filter(([key]) => !key.startsWith(prefix)),
      ),
    });
  },
}));

const EMPTY: string[] = [];

// ─── Hook ────────────────────────────────────────────────────────────────────
export const useBranchScope = (projectId: string, branchName: string): string[] =>
  useBranchScopeStore((s) => s.scopes[toScopeKey(projectId, branchName)] ?? EMPTY);

export const isInScope = (relPath: string, scope: string[]): boolean =>
  scope.some((p) => relPath === p || relPath.startsWith(`${p}/`));
