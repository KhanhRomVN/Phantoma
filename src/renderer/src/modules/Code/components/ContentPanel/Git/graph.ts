/**
 * ------------------------------------------------------------------
 * Git Graph Helpers
 * ------------------------------------------------------------------
 * Types, constants and pure helpers for the Git view: lane assignment
 * for the commit graph, ref parsing, avatar colors and formatting.
 * ------------------------------------------------------------------
 */

// ─── Types ──────────────────────────────────────────────────────────────
export interface Commit {
  hash: string;
  parents: string[];
  author: string;
  email: string;
  date: number;
  refs: string[];
  subject: string;
}

export interface CommitFile {
  path: string;
  added: number;
  deleted: number;
}

export interface GraphRow {
  col: number;
  incoming: number[];
  passThrough: number[];
  parentLanes: number[];
}

export type RefKind = 'head' | 'local' | 'remote' | 'tag';

export interface RefChip {
  label: string;
  kind: RefKind;
}

// ─── Constants ──────────────────────────────────────────────────────────
export const ROW_HEIGHT = 36;
export const LANE_WIDTH = 18;
export const LANE_COLORS = [
  '#3b82f6',
  '#a855f7',
  '#ec4899',
  '#22c55e',
  '#f97316',
  '#06b6d4',
  '#eab308',
  '#ef4444',
];

export const laneColor = (i: number): string => LANE_COLORS[i % LANE_COLORS.length];
export const laneX = (i: number): number => i * LANE_WIDTH + LANE_WIDTH / 2 + 6;

// ─── Graph ──────────────────────────────────────────────────────────────

/** Assign each commit to a lane and compute the lines to draw per row. */
export function buildGraph(commits: Commit[]): { rows: GraphRow[]; laneCount: number } {
  let lanes: (string | null)[] = [];
  let laneCount = 1;

  const rows = commits.map((c) => {
    const before = [...lanes];
    let col = lanes.indexOf(c.hash);
    if (col === -1) {
      col = lanes.indexOf(null);
      if (col === -1) {
        col = lanes.length;
        lanes.push(null);
      }
    }

    const incoming: number[] = [];
    before.forEach((h, i) => {
      if (h === c.hash) incoming.push(i);
    });

    lanes = lanes.map((h) => (h === c.hash ? null : h));

    c.parents.forEach((p, idx) => {
      let j = lanes.indexOf(p);
      if (j === -1) {
        j = idx === 0 ? col : lanes.indexOf(null);
        if (j === -1) j = lanes.length;
        lanes[j] = p;
      }
    });

    while (lanes.length && lanes[lanes.length - 1] === null) lanes.pop();
    const after = [...lanes];

    const passThrough: number[] = [];
    before.forEach((h, i) => {
      if (h && h !== c.hash && after[i] === h) passThrough.push(i);
    });

    laneCount = Math.max(laneCount, before.length, after.length, col + 1);

    return {
      col,
      incoming,
      passThrough,
      parentLanes: c.parents.map((p) => after.indexOf(p)).filter((j) => j !== -1),
    };
  });

  return { rows, laneCount };
}

// ─── Refs ───────────────────────────────────────────────────────────────
export function parseRefs(refs: string[]): RefChip[] {
  const chips: RefChip[] = [];
  refs.forEach((raw) => {
    if (raw.startsWith('HEAD -> ')) {
      chips.push({ label: raw.slice(8), kind: 'head' });
    } else if (raw === 'HEAD' || raw.endsWith('/HEAD')) {
      return;
    } else if (raw.startsWith('tag: ')) {
      chips.push({ label: raw.slice(5), kind: 'tag' });
    } else if (raw.startsWith('origin/')) {
      chips.push({ label: raw, kind: 'remote' });
    } else {
      chips.push({ label: raw, kind: 'local' });
    }
  });
  return chips;
}

// ─── Formatting ─────────────────────────────────────────────────────────
export function formatRelative(ts: number): string {
  const diff = Math.max(0, Date.now() - ts) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 86400 * 365) return `${Math.floor(diff / (86400 * 30))}mo ago`;
  return `${Math.floor(diff / (86400 * 365))}y ago`;
}

export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return `hsl(${Math.abs(hash) % 360} 55% 42%)`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

/** Best-effort GitHub username: noreply email first, then a single-word author name. */
export function githubUsername(author: string, email: string): string | null {
  const m = email.match(/^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$/i);
  if (m) return m[1];
  const name = author.trim();
  return name && !/\s/.test(name) ? name : null;
}

export function avatarUrl(username: string, size: number): string {
  return `https://avatars.githubusercontent.com/${encodeURIComponent(username)}?s=${size * 2}`;
}

export function splitPath(path: string): { name: string; dir: string } {
  const idx = path.lastIndexOf('/');
  return idx >= 0 ? { name: path.slice(idx + 1), dir: path.slice(0, idx) } : { name: path, dir: '' };
}

export function fileDotColor(f: CommitFile): string {
  if (f.added > 0 && f.deleted === 0) return '#22c55e';
  if (f.added === 0 && f.deleted > 0) return '#ef4444';
  return '#eab308';
}