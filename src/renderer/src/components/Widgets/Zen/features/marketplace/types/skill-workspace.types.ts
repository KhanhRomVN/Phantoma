/**
 * Persisted group state của skill workspace (lưu qua IPC).
 * Schema phải khớp với main process: hiện chỉ lưu `groups`.
 */

export interface SkillGroupRecord {
  name: string;
  slugs: string[];
  icon?: string;
  color?: string;
  description?: string;
}

export interface SkillWorkspaceState {
  groups: SkillGroupRecord[];
}

export const EMPTY_SKILL_WORKSPACE_STATE: SkillWorkspaceState = {
  groups: [],
};
