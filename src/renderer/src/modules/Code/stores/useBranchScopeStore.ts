import { create } from 'zustand';

const STORAGE_KEY = 'phantoma:branch-scopes';

export const toScopeKey = (projectId: string, branchName: string): string =>
  `${projectId}::${branchName}`;

const load = (): Record<string, string[]> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

interface BranchScopeState {
  scopes: Record<string, string[]>;
  setScope: (projectId: string, branchName: string, paths: string[]) => void;
}

export const useBranchScopeStore = create<BranchScopeState>((set, get) => ({
  scopes: load(),
  setScope: (projectId, branchName, paths) => {
    const scopes = { ...get().scopes, [toScopeKey(projectId, branchName)]: paths };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scopes));
    } catch {
      // ASSUMED: bỏ qua lỗi quota
    }
    set({ scopes });
  },
}));

const EMPTY: string[] = [];

export const useBranchScope = (projectId: string, branchName: string): string[] =>
  useBranchScopeStore((s) => s.scopes[toScopeKey(projectId, branchName)] ?? EMPTY);

export const isInScope = (relPath: string, scope: string[]): boolean =>
  scope.some((p) => relPath === p || relPath.startsWith(`${p}/`));