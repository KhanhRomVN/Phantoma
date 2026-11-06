import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCodeStore, type Project } from '../hooks/useCodeStore';

export type ActivityTab = Project['activityPanelTab'];

export interface SearchFormState {
  query: string;
  replaceQuery: string;
  includePattern: string;
  excludePattern: string;
  showReplace: boolean;
  showDetails: boolean;
  matchCase: boolean;
  matchWholeWord: boolean;
  useRegex: boolean;
  viewAsTree: boolean;
}

export const DEFAULT_SEARCH_FORM: SearchFormState = {
  query: '',
  replaceQuery: '',
  includePattern: '',
  excludePattern: '',
  showReplace: false,
  showDetails: false,
  matchCase: false,
  matchWholeWord: false,
  useRegex: false,
  viewAsTree: false,
};

interface ActivityPanelState {
  tabs: Record<string, ActivityTab>;
  search: Record<string, Partial<SearchFormState>>;
  setTab: (key: string, tab: ActivityTab) => void;
  patchSearch: (key: string, patch: Partial<SearchFormState>) => void;
}

export const useActivityPanelStore = create<ActivityPanelState>()(
  persist(
    (set) => ({
      tabs: {},
      search: {},
      setTab: (key, tab) => set((s) => ({ tabs: { ...s.tabs, [key]: tab } })),
      patchSearch: (key, patch) =>
        set((s) => ({ search: { ...s.search, [key]: { ...s.search[key], ...patch } } })),
    }),
    { name: 'activity-panel-store' },
  ),
);

export function useCurrentBranchKey(): string | null {
  return useCodeStore((s) => {
    if (!s.currentProjectId) return null;
    const project = s.projects.find((p) => p.id === s.currentProjectId);
    if (!project) return null;
    const branch = project.branches?.find((b) =>
      b.sessions.some((se) => se.id === s.activeWorkspaceSessionId),
    );
    return `${project.id}::${branch?.name ?? ''}`;
  });
}