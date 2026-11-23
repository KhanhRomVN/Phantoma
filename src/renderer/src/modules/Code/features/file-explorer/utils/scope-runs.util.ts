// ─── FileExplorer ────────────────────────────────────────────────────────────
export interface ScopeLayout {
  blocks: {
    key: string;
    index: number;
    top: number;
    height: number;
    rows: number;
    deleted?: boolean;
  }[];
  bad: {
    top: number;
    height: number;
    level: 'warn' | 'diff' | 'error';
    rows: number;
    deleted?: boolean;
  }[];
  diff: { path: string; top: number; height: number; deleted?: boolean }[];
  warn: { top: number; height: number; deleted?: boolean }[];
}

export interface BorderRun {
  top: number;
  height: number;
  level?: 'warn' | 'diff' | 'error';
  key?: string;
  rows?: number;
}

export const EDGE_INSET = 1;

export const GAP_INSET = 3;

// Gộp các border liền kề cùng màu (và cùng scope) thành 1
export function mergeRuns<T extends BorderRun>(items: T[]): T[] {
  const sorted = [...items].sort((a, b) => a.top - b.top);
  const out: T[] = [];
  for (const it of sorted) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.level === it.level &&
      prev.key === it.key &&
      it.top <= prev.top + prev.height + 1
    ) {
      const bottom = Math.max(prev.top + prev.height, it.top + it.height);
      prev.height = bottom - prev.top;
      prev.rows = (prev.rows ?? 1) + (it.rows ?? 1);
    } else {
      out.push({ ...it });
    }
  }
  return out;
}

// Inset 1px mỗi đầu; đầu nào chạm border khác màu thì inset 3px để tạo gap 6px tại đó
export function insetRuns<T extends BorderRun>(runs: T[], all: BorderRun[]): T[] {
  const tagOf = (r: BorderRun) => r.level ?? `scope:${r.key}`;
  return runs.map((r) => {
    const tag = tagOf(r);
    const bottom = r.top + r.height;
    const touchTop = all.some((o) => tagOf(o) !== tag && Math.abs(o.top + o.height - r.top) <= 2);
    const touchBottom = all.some((o) => tagOf(o) !== tag && Math.abs(o.top - bottom) <= 2);
    const top = r.top + (touchTop ? GAP_INSET : EDGE_INSET);
    const end = bottom - (touchBottom ? GAP_INSET : EDGE_INSET);
    return { ...r, top, height: Math.max(end - top, 1) };
  });
}
