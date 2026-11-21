import { create } from 'zustand';

import type { EmulateAgentType } from '../prompts/orchestrator/tools-reference';

export const ORCHESTRATOR_ID = 'orchestrator';

export type EmulateAgentKind = 'orchestrator' | EmulateAgentType;

export const EMULATE_AGENT_COLORS: Record<EmulateAgentKind, string> = {
  orchestrator: '#A78BFA',
  emulate_planner: '#34D399',
  emulate_browser: '#38BDF8',
  emulate_cli: '#A3E635',
  emulate_analyzer: '#F59E0B',
};

export interface EmulateAgent {
  id: string;
  name: string;
  type: EmulateAgentKind;
  color: string;
}

export interface EmulateAgentConfig {
  model: any | null;
  account: any | null;
}

export interface EmulateInboxItem {
  from: string;
  content: string;
}

export interface EmulateTab {
  id: string;
  title: string;
  agentId?: string;
}

export const EMPTY_EMULATE_AGENT_CONFIG: EmulateAgentConfig = { model: null, account: null };

interface EmulateWorkflowState {
  tabs: EmulateTab[];
  activeTabId: string;
  agents: EmulateAgent[];
  configs: Record<string, EmulateAgentConfig>;
  inbox: Record<string, EmulateInboxItem[]>;

  addPlainTab: () => void;
  setActiveTab: (id: string) => void;
  closeTab: (id: string) => void;
  toggleOrchestrator: (tabId: string) => void;

  addAgent: (agent: EmulateAgent, activate?: boolean) => void;
  removeAgent: (agentId: string) => void;
  getAgent: (agentId: string) => EmulateAgent | undefined;

  setModel: (agentId: string, model: any) => void;
  setAccount: (agentId: string, account: any) => void;

  enqueueInbox: (agentId: string, item: EmulateInboxItem) => void;
  shiftInbox: (agentId: string) => void;
}

let plainTabCounter = 1;

const agentTabTitle = (agent: EmulateAgent): string =>
  `Zen - ${agent.type === 'orchestrator' ? 'Orchestrator' : agent.name}`;

const pickActive = (tabs: EmulateTab[], closedIndex: number): string =>
  tabs[Math.max(0, closedIndex - 1)]?.id ?? '';

// ASSUMED: tab Zen đầu tiên mặc định là Orchestrator
const INITIAL_ORCHESTRATOR: EmulateAgent = {
  id: ORCHESTRATOR_ID,
  name: 'Orchestrator',
  type: 'orchestrator',
  color: EMULATE_AGENT_COLORS.orchestrator,
};

export const useEmulateWorkflowStore = create<EmulateWorkflowState>((set, get) => ({
  tabs: [
    { id: 'zen-1', title: agentTabTitle(INITIAL_ORCHESTRATOR), agentId: ORCHESTRATOR_ID },
  ],
  activeTabId: 'zen-1',
  agents: [INITIAL_ORCHESTRATOR],
  configs: {},
  inbox: {},

  addPlainTab: () =>
    set((s) => {
      plainTabCounter += 1;
      const id = `zen-${plainTabCounter}`;
      return { tabs: [...s.tabs, { id, title: `Zen ${plainTabCounter}` }], activeTabId: id };
    }),

  setActiveTab: (id) => set({ activeTabId: id }),

  closeTab: (id) =>
    set((s) => {
      const index = s.tabs.findIndex((t) => t.id === id);
      if (index < 0 || s.tabs.length < 2) return s;
      const tab = s.tabs[index];
      const tabs = s.tabs.filter((t) => t.id !== id);
      const activeTabId = s.activeTabId === id ? pickActive(tabs, index) : s.activeTabId;
      if (!tab.agentId) return { tabs, activeTabId };
      const { [tab.agentId]: _inbox, ...inbox } = s.inbox;
      const { [tab.agentId]: _config, ...configs } = s.configs;
      return {
        tabs,
        activeTabId,
        inbox,
        configs,
        agents: s.agents.filter((a) => a.id !== tab.agentId),
      };
    }),

  toggleOrchestrator: (tabId) =>
    set((s) => {
      const tab = s.tabs.find((t) => t.id === tabId);
      if (!tab) return s;
      if (tab.agentId === ORCHESTRATOR_ID) {
        const { [ORCHESTRATOR_ID]: _inbox, ...inbox } = s.inbox;
        return {
          tabs: s.tabs.map((t) => (t.id === tabId ? { id: t.id, title: 'Zen' } : t)),
          agents: s.agents.filter((a) => a.id !== ORCHESTRATOR_ID),
          inbox,
        };
      }
      if (tab.agentId || s.agents.some((a) => a.id === ORCHESTRATOR_ID)) return s;
      const agent: EmulateAgent = {
        id: ORCHESTRATOR_ID,
        name: 'Orchestrator',
        type: 'orchestrator',
        color: EMULATE_AGENT_COLORS.orchestrator,
      };
      return {
        tabs: s.tabs.map((t) =>
          t.id === tabId ? { ...t, title: agentTabTitle(agent), agentId: ORCHESTRATOR_ID } : t,
        ),
        agents: [...s.agents, agent],
      };
    }),

  addAgent: (agent, activate = false) =>
    set((s) => {
      if (s.agents.some((a) => a.id === agent.id)) return s;
      return {
        agents: [...s.agents, agent],
        tabs: [...s.tabs, { id: agent.id, title: agentTabTitle(agent), agentId: agent.id }],
        activeTabId: activate ? agent.id : s.activeTabId,
      };
    }),

  removeAgent: (agentId) =>
    set((s) => {
      const index = s.tabs.findIndex((t) => t.agentId === agentId);
      const tabs = s.tabs.filter((t) => t.agentId !== agentId);
      const { [agentId]: _inbox, ...inbox } = s.inbox;
      const { [agentId]: _config, ...configs } = s.configs;
      return {
        tabs,
        inbox,
        configs,
        agents: s.agents.filter((a) => a.id !== agentId),
        activeTabId: s.activeTabId === agentId ? pickActive(tabs, index) : s.activeTabId,
      };
    }),

  getAgent: (agentId) => get().agents.find((a) => a.id === agentId),

  setModel: (agentId, model) =>
    set((s) => ({
      configs: {
        ...s.configs,
        [agentId]: { ...(s.configs[agentId] ?? EMPTY_EMULATE_AGENT_CONFIG), model },
      },
    })),

  setAccount: (agentId, account) =>
    set((s) => ({
      configs: {
        ...s.configs,
        [agentId]: { ...(s.configs[agentId] ?? EMPTY_EMULATE_AGENT_CONFIG), account },
      },
    })),

  enqueueInbox: (agentId, item) =>
    set((s) => ({ inbox: { ...s.inbox, [agentId]: [...(s.inbox[agentId] ?? []), item] } })),

  shiftInbox: (agentId) =>
    set((s) => ({ inbox: { ...s.inbox, [agentId]: (s.inbox[agentId] ?? []).slice(1) } })),
}));