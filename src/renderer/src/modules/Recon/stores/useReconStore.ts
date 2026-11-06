import { create } from 'zustand';

export interface ReconTarget {
  id: string;
  title: string;
  type?: string;
  createdAt: string;
  browserPid?: number;
  isActive: boolean;
}

interface ReconState {
  targets: ReconTarget[];
  activeTargetId: string | null;
  setTargets: (targets: ReconTarget[]) => void;
  addTarget: (target: ReconTarget) => void;
  updateTarget: (targetId: string, patch: Partial<Omit<ReconTarget, 'id'>>) => void;
  removeTarget: (targetId: string) => void;
  setActiveTarget: (targetId: string | null) => void;
}

export const useReconStore = create<ReconState>((set) => ({
  targets: [],
  activeTargetId: null,
  setTargets: (targets) => set({ targets }),
  addTarget: (target) => set((s) => ({ targets: [...s.targets, target] })),
  updateTarget: (targetId, patch) =>
    set((s) => ({
      targets: s.targets.map((t) => (t.id === targetId ? { ...t, ...patch } : t)),
    })),
  removeTarget: (targetId) =>
    set((s) => ({
      targets: s.targets.filter((t) => t.id !== targetId),
      activeTargetId: s.activeTargetId === targetId ? null : s.activeTargetId,
    })),
  setActiveTarget: (targetId) => set({ activeTargetId: targetId }),
}));