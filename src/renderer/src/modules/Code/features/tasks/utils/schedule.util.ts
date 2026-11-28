// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Services ──
import type { StoredTask } from '../services/task.service';

// ─── Types ───────────────────────────────────────────────────────────────────
type Schedule = Pick<StoredTask, 'startDate' | 'startTime' | 'endDate' | 'endTime'>;
type DependencyNode = Pick<StoredTask, 'id' | 'dependsOn'>;

// ─── Functions ───────────────────────────────────────────────────────────────
function atTime(day: number, time: string | null, endOfDay: boolean): number {
  const d = new Date(day);
  if (time) {
    const [h, m] = time.split(':').map(Number);
    d.setHours(h || 0, m || 0, 0, 0);
  } else if (endOfDay) {
    d.setHours(23, 59, 59, 999);
  } else {
    d.setHours(0, 0, 0, 0);
  }
  return d.getTime();
}

export const getTaskStartMs = (t: Schedule): number | null =>
  t.startDate === null ? null : atTime(t.startDate, t.startTime, false);

export const getTaskEndMs = (t: Schedule): number | null =>
  t.endDate === null ? null : atTime(t.endDate, t.endTime, true);

export const isTaskOverdue = (t: Schedule & Pick<StoredTask, 'status'>): boolean => {
  const end = getTaskEndMs(t);
  return end !== null && end < Date.now() && t.status !== 'done';
};

const formatDayMonth = (ts: number) => {
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

export function formatTaskRange(t: Schedule): string | null {
  const start =
    t.startDate !== null
      ? `${formatDayMonth(t.startDate)}${t.startTime ? ` ${t.startTime}` : ''}`
      : null;
  const end =
    t.endDate !== null ? `${formatDayMonth(t.endDate)}${t.endTime ? ` ${t.endTime}` : ''}` : null;
  if (start && end) return `${start} → ${end}`;
  return end ?? start;
}

export function getBlockers(task: Pick<StoredTask, 'dependsOn'>, all: StoredTask[]): StoredTask[] {
  const byId = new Map(all.map((t) => [t.id, t]));
  const blockers = new Map<string, StoredTask>();
  const seen = new Set<string>();
  const walk = (ids: string[]) => {
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      const t = byId.get(id);
      if (!t) continue;
      if (t.archived) walk(t.dependsOn ?? []);
      else if (t.status !== 'done') blockers.set(t.id, t);
    }
  };
  walk(task.dependsOn ?? []);
  return [...blockers.values()];
}

export function getUnfinishedChain(
  task: Pick<StoredTask, 'dependsOn'>,
  all: StoredTask[],
): StoredTask[] {
  const byId = new Map(all.map((t) => [t.id, t]));
  const chain: StoredTask[] = [];
  const seen = new Set<string>();
  const visit = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    const t = byId.get(id);
    if (!t) return;
    if (!t.archived && t.status === 'done') return;
    (t.dependsOn ?? []).forEach(visit);
    if (!t.archived) chain.push(t);
  };
  (task.dependsOn ?? []).forEach(visit);
  return chain;
}

export function getAncestorIds(taskId: string, all: DependencyNode[]): Set<string> {
  const byId = new Map(all.map((t) => [t.id, t]));
  const seen = new Set<string>();
  const stack = [...(byId.get(taskId)?.dependsOn ?? [])];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(byId.get(id)?.dependsOn ?? []));
  }
  return seen;
}

export function getDescendantIds(taskId: string, all: DependencyNode[]): Set<string> {
  const seen = new Set<string>();
  const stack = [taskId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const t of all) {
      if ((t.dependsOn ?? []).includes(current) && !seen.has(t.id)) {
        seen.add(t.id);
        stack.push(t.id);
      }
    }
  }
  return seen;
}