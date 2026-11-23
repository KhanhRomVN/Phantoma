import { type StoredTask } from '../../../shared/services/task.service';
import { getNewestSession, getBranchStatus } from './session.util';
import { STATUS_ORDER } from '../constants/session.constants';
import { type SessionStatus, type BranchInfo, type TaskStatus } from '../types/session.types';
import { ProjectExtended } from '../types/project-card.types';

// ─── Helpers (shared with ProjectPanel) ─────────────────────────────────

export const ACTIVE_STATUSES: SessionStatus[] = ['blocked', 'running', 'review', 'queued'];

export const MAX_COLLAPSED_ROWS = 5;

export function getVisibleBranches(project: ProjectExtended): BranchInfo[] {
  return (project.branches ?? []).filter((b) => b.visible);
}

export function getProjectStatus(project: ProjectExtended): SessionStatus {
  const statuses = getVisibleBranches(project).map(getBranchStatus);
  return STATUS_ORDER.find((o) => statuses.includes(o)) ?? 'idle';
}

/** Total tokens (k) of visible branches — used by "Token usage" sort */
export function getProjectTokens(project: ProjectExtended): number {
  return getVisibleBranches(project).reduce(
    (a, b) => a + (b.sessions ?? []).reduce((x, s) => x + (s.summary?.tokens ?? 0), 0),
    0,
  );
}

/** Task counts per status across ALL branches */
export function getTaskCounts(
  project: ProjectExtended,
  bySession: Record<string, StoredTask>,
): Record<TaskStatus, number> {
  const c: Record<TaskStatus, number> = { todo: 0, progress: 0, done: 0 };
  project.branches?.forEach((b) =>
    b.sessions?.forEach((s) => {
      const t = bySession[s.id];
      if (t) c[t.status]++;
    }),
  );
  return c;
}

/** Lower rank = more urgent → shown first in the collapsed tree */
export function rankBranch(b: BranchInfo): number {
  const n = getNewestSession(b);
  const procs = n?.procs ?? [];
  if (procs.some((p) => p.status === 'crashed')) return -1;
  if (procs.length && n?.status === 'done') return 3.5;
  return STATUS_ORDER.indexOf(getBranchStatus(b));
}

export const stripPrefix = (name: string) => name.replace(/^(feature|fix|hotfix|release)\//, '');
