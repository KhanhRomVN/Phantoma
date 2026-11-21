/**
 * Zustand store giữ InspectorFilter hiện tại của UI để các executor
 * (list_https, apply_filter...) và Zen chat đọc trực tiếp, không cần
 * controller trung gian.
 */

import { create } from 'zustand';

import type { InspectorFilter } from '@renderer/modules/Emulate/shared/types/filter.types';

interface FilterStore {
  filter: InspectorFilter | undefined;
  setFilter: (filter: InspectorFilter) => void;
}

export const useFilterStore = create<FilterStore>((set) => ({
  filter: undefined,
  setFilter: (filter) => set({ filter }),
}));