/**
 * ------------------------------------------------------------------
 * Filter Store
 * ------------------------------------------------------------------
 * Zustand store giữ InspectorFilter hiện tại của UI để các executor
 * (list_https, apply_filter...) và Zen chat đọc trực tiếp, không cần
 * controller trung gian.
 *
 * Các actions chính:
 * - setFilter() : Cập nhật filter hiện tại
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Store ──
import { create } from 'zustand';

// ── Types ──
import type { InspectorFilter } from '../types/filter.types';

// ─── Interfaces ─────────────────────────────────────────────────────────
interface FilterStore {
  filter: InspectorFilter | undefined;
  setFilter: (filter: InspectorFilter) => void;
}

// ─── Store ──────────────────────────────────────────────────────────────
export const useFilterStore = create<FilterStore>((set) => ({
  filter: undefined,
  setFilter: (filter) => set({ filter }),
}));