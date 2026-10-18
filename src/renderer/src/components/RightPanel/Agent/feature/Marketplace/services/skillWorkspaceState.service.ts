/**
 * ------------------------------------------------------------------
 * Skill Workspace State Service (IPC)
 * ------------------------------------------------------------------
 * Đọc/ghi trạng thái workspace của skill (groups, toggles) qua main.
 * ------------------------------------------------------------------
 */

export interface SkillWorkspaceState {
  toggles: Record<string, boolean>;
  groups: Array<{
    name: string;
    slugs: string[];
    icon?: string;
    color?: string;
    description?: string;
  }>;
  collapsedGroups: Record<string, boolean>;
}

export const DEFAULT_SKILL_WORKSPACE_STATE: SkillWorkspaceState = {
  toggles: {},
  groups: [],
  collapsedGroups: {},
};

interface SkillApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function loadSkillWorkspaceState(): Promise<SkillWorkspaceState> {
  try {
    const api = (window as any).api;
    if (!api?.invoke) return DEFAULT_SKILL_WORKSPACE_STATE;
    const res: SkillApiResponse<SkillWorkspaceState> = await api.invoke(
      'skill:load-workspace-state',
    );
    if (!res?.success || !res.data) return DEFAULT_SKILL_WORKSPACE_STATE;
    const d = res.data;
    return {
      toggles: d.toggles ?? {},
      groups: Array.isArray(d.groups) ? d.groups : [],
      collapsedGroups: d.collapsedGroups ?? {},
    };
  } catch {
    return DEFAULT_SKILL_WORKSPACE_STATE;
  }
}

export async function saveSkillWorkspaceState(
  state: SkillWorkspaceState,
): Promise<void> {
  try {
    const api = (window as any).api;
    if (!api?.invoke) return;
    await api.invoke('skill:save-workspace-state', { state });
  } catch {
    // Silent
  }
}