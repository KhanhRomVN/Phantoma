import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ReconPanelTabType = 'zen' | 'agent-tools';

export interface ReconPanelTab {
  id: string;
  type: ReconPanelTabType;
  providerName?: string;
  providerUrl?: string;
  conversationId?: string | null;
}

export interface ReconTargetTabs {
  tabs: ReconPanelTab[];
  activeTabId: string;
  counter: number;
}

export const createDefaultTargetTabs = (): ReconTargetTabs => ({
  tabs: [{ id: 'zen-1', type: 'zen' }],
  activeTabId: 'zen-1',
  counter: 1,
});

interface ReconPanelState {
  byTarget: Record<string, ReconTargetTabs>;
  ensureTarget: (targetId: string) => void;
  addZenTab: (targetId: string) => void;
  openAgentTools: (targetId: string) => void;
  setActiveTab: (targetId: string, tabId: string) => void;
  closeTab: (targetId: string, tabId: string) => void;
  updateTab: (targetId: string, tabId: string, patch: Partial<Omit<ReconPanelTab, 'id' | 'type'>>) => void;
  removeTarget: (targetId: string) => void;
}

const mutate = (
  byTarget: Record<string, ReconTargetTabs>,
  targetId: string,
  fn: (t: ReconTargetTabs) => ReconTargetTabs,
) => ({
  byTarget: { ...byTarget, [targetId]: fn(byTarget[targetId] ?? createDefaultTargetTabs()) },
});

export const useReconPanelStore = create<ReconPanelState>()(
  persist(
    (set) => ({
      byTarget: {},
      ensureTarget: (targetId) =>
        set((s) => (s.byTarget[targetId] ? s : mutate(s.byTarget, targetId, (t) => t))),
      addZenTab: (targetId) =>
        set((s) =>
          mutate(s.byTarget, targetId, (t) => {
            const counter = t.counter + 1;
            const id = `zen-${counter}`;
            return { tabs: [...t.tabs, { id, type: 'zen' }], activeTabId: id, counter };
          }),
        ),
      openAgentTools: (targetId) =>
        set((s) =>
          mutate(s.byTarget, targetId, (t) => {
            const existing = t.tabs.find((x) => x.type === 'agent-tools');
            if (existing) return { ...t, activeTabId: existing.id };
            const counter = t.counter + 1;
            const id = `agent-tools-${counter}`;
            return { tabs: [...t.tabs, { id, type: 'agent-tools' }], activeTabId: id, counter };
          }),
        ),
      setActiveTab: (targetId, tabId) =>
        set((s) => mutate(s.byTarget, targetId, (t) => ({ ...t, activeTabId: tabId }))),
      closeTab: (targetId, tabId) =>
        set((s) =>
          mutate(s.byTarget, targetId, (t) => {
            const idx = t.tabs.findIndex((x) => x.id === tabId);
            if (idx === -1) return t;
            const tabs = t.tabs.filter((x) => x.id !== tabId);
            const activeTabId =
              t.activeTabId === tabId ? (tabs[Math.min(idx, tabs.length - 1)]?.id ?? '') : t.activeTabId;
            return { ...t, tabs, activeTabId };
          }),
        ),
      updateTab: (targetId, tabId, patch) =>
        set((s) =>
          mutate(s.byTarget, targetId, (t) => ({
            ...t,
            tabs: t.tabs.map((x) => (x.id === tabId ? { ...x, ...patch } : x)),
          })),
        ),
      removeTarget: (targetId) =>
        set((s) => {
          const { [targetId]: _removed, ...rest } = s.byTarget;
          return { byTarget: rest };
        }),
    }),
    { name: 'recon-panel-tabs' },
  ),
);