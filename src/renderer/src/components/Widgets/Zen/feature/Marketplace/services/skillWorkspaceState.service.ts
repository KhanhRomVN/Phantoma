/**
 * ------------------------------------------------------------------
 * Skill Workspace State Service (IPC)
 * ------------------------------------------------------------------
 * Đọc/ghi trạng thái workspace của skill (groups, toggles) qua main.
 * ------------------------------------------------------------------
 */

export interface SkillWorkspaceState {
  groups: Array<{
    name: string;
    slugs: string[];
    icon?: string;
    color?: string;
    description?: string;
  }>;
}

export const DEFAULT_SKILL_WORKSPACE_STATE: SkillWorkspaceState = {
  groups: [],
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
      groups: Array.isArray(d.groups) ? d.groups : [],
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