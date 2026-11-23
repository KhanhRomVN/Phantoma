import type { Project } from '../../../shared/stores/code.store';
import { PROJECT_SEED_COLORS } from '../../../shared/constants/project-colors';
import type { BranchInfo } from '../types/session.types';
import type { ProjectExtended } from '../types/project-panel.types';

export const LAYOUT_STORAGE_KEY = 'phantoma_code_project_layout_v2';

/** Adds the UI-only fields (color, group, hidden, branches) to a store project */
export function seedProject(p: Project, index: number): ProjectExtended {
  const raw = p as any;
  const branches = (raw.branches ?? []) as BranchInfo[];

  return {
    ...p,
    defaultBranch: raw.defaultBranch ?? 'main',
    hidden: raw.hidden ?? false,
    color: raw.color ?? PROJECT_SEED_COLORS[index % PROJECT_SEED_COLORS.length],
    groupId: raw.groupId ?? null,
    branches,
  };
}

export function applyProjectLayout(list: ProjectExtended[]): ProjectExtended[] {
  try {
    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return list;
    const saved = JSON.parse(raw) as {
      order?: string[];
      groupIds?: Record<string, string | null>;
    };
    const groupIds = saved.groupIds ?? {};
    const rank = new Map((saved.order ?? []).map((id, i) => [id, i]));
    return list
      .map((p, i) => ({ p, i }))
      .sort((a, b) => (rank.get(a.p.id) ?? 1e9 + a.i) - (rank.get(b.p.id) ?? 1e9 + b.i))
      .map(({ p }) => (p.id in groupIds ? { ...p, groupId: groupIds[p.id] } : p));
  } catch {
    return list;
  }
}