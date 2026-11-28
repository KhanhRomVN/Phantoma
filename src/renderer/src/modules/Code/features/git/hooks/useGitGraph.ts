// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { useMemo } from 'react';

// ── Utils ──
import { buildGraph, LANE_WIDTH, type Commit, type GraphRow } from '../utils/graph.util';

// ── Types ──
import type { LocalChange } from '../types/git-view.types';

// ─── Types ───────────────────────────────────────────────────────────────────
interface UseGitGraphProps {
  commits: Commit[];
  localChanges: LocalChange[];
  mainTip: string | null;
}

type GraphItem =
  | { kind: 'commit'; commit: Commit; row: GraphRow }
  | {
      kind: 'virtual';
      change: LocalChange;
      row: GraphRow;
      col: number;
      hangCol: number | null;
      hangFull: boolean;
    };

interface UseGitGraphReturn {
  items: GraphItem[];
  graphWidth: number;
  laneCount: number;
  virtualByHash: Map<string, LocalChange[]>;
  allVirtualNames: Set<string>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useGitGraph({
  commits,
  localChanges,
  mainTip,
}: UseGitGraphProps): UseGitGraphReturn {
  // ── Derived ──
  const { rows, laneCount } = useMemo(() => buildGraph(commits, mainTip), [commits, mainTip]);
  const graphWidth = Math.min(Math.max(laneCount * LANE_WIDTH + 16, 72), 260);

  const virtualByHash = useMemo(() => {
    const map = new Map<string, LocalChange[]>();
    localChanges.forEach((lc) => {
      const tip =
        commits.find((c) => c.refs.includes(`origin/${lc.name}`)) ??
        commits.find((c) => c.refs.some((r) => r === lc.name || r === `HEAD -> ${lc.name}`));
      if (!tip) return;
      map.set(tip.hash, [...(map.get(tip.hash) ?? []), lc]);
    });
    return map;
  }, [commits, localChanges]);

  const allVirtualNames = useMemo(() => new Set(localChanges.map((l) => l.name)), [localChanges]);

  const items = useMemo(() => {
    const list: GraphItem[] = [];
    commits.forEach((c, idx) => {
      const tipRow = rows[idx];
      const lanes = new Set([...tipRow.incoming, ...tipRow.passThrough]);
      const hangs = !lanes.has(tipRow.col);
      let hanging = false;
      (virtualByHash.get(c.hash) ?? []).forEach((change) => {
        const col = tipRow.col;
        const hangFull = hanging;
        if (hangs) hanging = true;
        list.push({
          kind: 'virtual',
          change,
          row: tipRow,
          col,
          hangCol: hanging ? tipRow.col : null,
          hangFull,
        });
      });

      list.push({
        kind: 'commit',
        commit: c,
        row: hanging ? { ...tipRow, incoming: [...tipRow.incoming, tipRow.col] } : tipRow,
      });
    });
    return list;
  }, [commits, rows, virtualByHash]);

  return {
    items,
    graphWidth,
    laneCount,
    virtualByHash,
    allVirtualNames,
  };
}