/**
 * ------------------------------------------------------------------
 * Scope Stats Store
 * ------------------------------------------------------------------
 * Zustand store giữ thống kê phân loại file theo scope (inside/outside/
 * drift/clash), bộ lọc, nhánh mặc định và các nhánh khác của từng project.
 *
 * Main types:
 * - ScopeCategory / ScopeFilter / ScopeStats : Phân loại và thống kê scope
 *
 * Main constants:
 * - EMPTY_SCOPE_STATS, SCOPE_CATEGORIES, SCOPE_DIFF_DOT, SCOPE_DIFF_RING
 *
 * Main hooks:
 * - useScopeStats() / useScopeHideNoDot() / useScopeFilter() / useScopeBranchFilter()
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Stores ──
import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────────
export type ScopeCategory = 'primary' | 'warn' | 'diff' | 'error';
export type ScopeFilter = ScopeCategory | 'outside';

export interface ScopeStats {
  primary: string[];
  warn: string[];
  diff: string[];
  error: string[];
  deletedPaths: string[];
}

// ─── Constants ───────────────────────────────────────────────────────────────
export const EMPTY_SCOPE_STATS: ScopeStats = {
  primary: [],
  warn: [],
  diff: [],
  error: [],
  deletedPaths: [],
};

// diff dùng màu cam cố định (chưa có token theme riêng) — upgrade path: thêm token --caution vào các theme
export const SCOPE_DIFF_DOT = 'bg-[#f97316]';
export const SCOPE_DIFF_RING = 'border-[#f97316]';

export const SCOPE_CATEGORIES: { id: ScopeCategory; label: string; dot: string }[] = [
  { id: 'primary', label: 'Inside', dot: 'bg-primary' },
  { id: 'warn', label: 'Outside · same as default branch', dot: 'bg-warn' },
  { id: 'diff', label: 'Outside · differs from default branch', dot: SCOPE_DIFF_DOT },
  {
    id: 'error',
    label: 'Outside · differs from default branch & changed in another branch',
    dot: 'bg-error',
  },
];

// ─── Functions ───────────────────────────────────────────────────────────────
const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

interface ScopeStatsState {
  statsByProject: Record<string, ScopeStats>;
  filterByProject: Record<string, ScopeFilter | null>;
  setStats: (projectId: string, stats: ScopeStats) => void;
  setFilter: (projectId: string, filter: ScopeFilter | null) => void;
  branchFilterByProject: Record<string, string | null>;
  setBranchFilter: (projectId: string, branch: string | null) => void;
  hideNoDotByProject: Record<string, boolean>;
  setHideNoDot: (projectId: string, hide: boolean) => void;
  isDefaultByProject: Record<string, boolean>;
  setIsDefault: (projectId: string, isDefault: boolean) => void;
  defaultBranchByProject: Record<string, string>;
  setDefaultBranch: (projectId: string, name: string) => void;
  otherBranchesByProject: Record<string, string[]>;
  setOtherBranches: (projectId: string, branches: string[]) => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────
export const useScopeStatsStore = create<ScopeStatsState>((set) => ({
  statsByProject: {},
  filterByProject: {},
  branchFilterByProject: {},
  hideNoDotByProject: {},
  setHideNoDot: (projectId, hide) =>
    set((s) => ({ hideNoDotByProject: { ...s.hideNoDotByProject, [projectId]: hide } })),
  isDefaultByProject: {},
  defaultBranchByProject: {},
  otherBranchesByProject: {},
  setStats: (projectId, stats) =>
    set((s) => {
      const prev = s.statsByProject[projectId];
      if (
        prev &&
        sameList(prev.primary, stats.primary) &&
        sameList(prev.warn, stats.warn) &&
        sameList(prev.diff, stats.diff) &&
        sameList(prev.error, stats.error) &&
        sameList(prev.deletedPaths, stats.deletedPaths)
      ) {
        return s;
      }
      return { statsByProject: { ...s.statsByProject, [projectId]: stats } };
    }),
  setFilter: (projectId, filter) =>
    set((s) => ({
      filterByProject: { ...s.filterByProject, [projectId]: filter },
      branchFilterByProject: { ...s.branchFilterByProject, [projectId]: null },
    })),
  setBranchFilter: (projectId, branch) =>
    set((s) => ({
      filterByProject: { ...s.filterByProject, [projectId]: 'outside' },
      branchFilterByProject: { ...s.branchFilterByProject, [projectId]: branch },
    })),
  setIsDefault: (projectId, isDefault) =>
    set((s) => {
      if ((s.isDefaultByProject[projectId] ?? false) === isDefault) return s;
      return {
        isDefaultByProject: { ...s.isDefaultByProject, [projectId]: isDefault },
        filterByProject:
          isDefault && s.filterByProject[projectId] === 'primary'
            ? { ...s.filterByProject, [projectId]: null }
            : s.filterByProject,
      };
    }),
  setDefaultBranch: (projectId, name) =>
    set((s) => {
      if ((s.defaultBranchByProject[projectId] ?? '') === name) return s;
      return { defaultBranchByProject: { ...s.defaultBranchByProject, [projectId]: name } };
    }),
  setOtherBranches: (projectId, branches) =>
    set((s) => {
      const prev = s.otherBranchesByProject[projectId] ?? [];
      if (sameList(prev, branches)) return s;
      return { otherBranchesByProject: { ...s.otherBranchesByProject, [projectId]: branches } };
    }),
}));

// ─── Hook ────────────────────────────────────────────────────────────────────
export const useScopeStats = (projectId: string): ScopeStats =>
  useScopeStatsStore((s) => s.statsByProject[projectId] ?? EMPTY_SCOPE_STATS);

export const useScopeHideNoDot = (projectId: string): boolean =>
  useScopeStatsStore((s) => s.hideNoDotByProject[projectId] ?? false);

export const useScopeFilter = (projectId: string): ScopeFilter | null =>
  useScopeStatsStore((s) => s.filterByProject[projectId] ?? null);

export const useScopeBranchFilter = (projectId: string): string | null =>
  useScopeStatsStore((s) => s.branchFilterByProject[projectId] ?? null);