import { create } from 'zustand';

export interface DesignNode {
  id: string;
  name: string;
  route: string;
  file: string;
  x: number;
  y: number;
}

export interface DesignEdge {
  id: string;
  from: string;
  to: string;
}

export interface DesignGraph {
  nodes: DesignNode[];
  edges: DesignEdge[];
}

export interface DesignMeta extends DesignGraph {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateDesignInput extends DesignGraph {
  name: string;
  description?: string;
  files: Record<string, string>;
}

interface DesignState {
  designs: DesignMeta[];
  openTabIds: string[];
  activeDesignId: string | null;
  loading: boolean;
  loadDesigns: (projectPath: string) => Promise<void>;
  createDesign: (projectPath: string, input: CreateDesignInput) => Promise<DesignMeta | null>;
  deleteDesign: (projectPath: string, designId: string) => Promise<void>;
  updateGraph: (projectPath: string, designId: string, graph: DesignGraph) => Promise<void>;
  openTab: (designId: string) => void;
  closeTab: (designId: string) => void;
  setActive: (designId: string) => void;
  clearActive: () => void;
  reset: () => void;
}

export const useDesignStore = create<DesignState>((set, get) => ({
  designs: [],
  openTabIds: [],
  activeDesignId: null,
  loading: false,

  loadDesigns: async (projectPath) => {
    set({ loading: true });
    try {
      const res = await window.api.invoke('design:list', projectPath);
      const designs: DesignMeta[] = res?.success ? res.data : [];
      const ids = new Set(designs.map((d) => d.id));
      const openTabIds = get().openTabIds.filter((id) => ids.has(id));
      const active = get().activeDesignId;
      set({
        designs,
        openTabIds,
        activeDesignId: active && ids.has(active) ? active : (openTabIds[0] ?? null),
        loading: false,
      });
    } catch (err) {
      console.error('[useDesignStore] loadDesigns failed:', err);
      set({ loading: false });
    }
  },

  createDesign: async (projectPath, input) => {
    const res = await window.api.invoke('design:create', projectPath, input);
    if (!res?.success) {
      console.error('[useDesignStore] createDesign failed:', res?.error);
      return null;
    }
    const design: DesignMeta = res.data;
    set((s) => ({
      designs: [design, ...s.designs],
      openTabIds: [...s.openTabIds, design.id],
      activeDesignId: design.id,
    }));
    return design;
  },

  deleteDesign: async (projectPath, designId) => {
    const res = await window.api.invoke('design:delete', projectPath, designId);
    if (!res?.success) return;
    set((s) => {
      const openTabIds = s.openTabIds.filter((id) => id !== designId);
      return {
        designs: s.designs.filter((d) => d.id !== designId),
        openTabIds,
        activeDesignId:
          s.activeDesignId === designId ? (openTabIds[openTabIds.length - 1] ?? null) : s.activeDesignId,
      };
    });
  },

  updateGraph: async (projectPath, designId, graph) => {
    set((s) => ({
      designs: s.designs.map((d) => (d.id === designId ? { ...d, ...graph } : d)),
    }));
    await window.api.invoke('design:update', projectPath, designId, graph);
  },

  openTab: (designId) =>
    set((s) => ({
      openTabIds: s.openTabIds.includes(designId) ? s.openTabIds : [...s.openTabIds, designId],
      activeDesignId: designId,
    })),

  closeTab: (designId) =>
    set((s) => {
      const openTabIds = s.openTabIds.filter((id) => id !== designId);
      return {
        openTabIds,
        activeDesignId:
          s.activeDesignId === designId ? (openTabIds[openTabIds.length - 1] ?? null) : s.activeDesignId,
      };
    }),

  setActive: (designId) => set({ activeDesignId: designId }),

  clearActive: () => set({ activeDesignId: null }),

  reset: () => set({ designs: [], openTabIds: [], activeDesignId: null, loading: false }),
}));