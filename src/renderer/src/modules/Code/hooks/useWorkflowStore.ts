import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ParticipantSnapshot, WorkflowAgent, WorkflowMessage } from '../types/agents';
import { ORCHESTRATOR_AGENT, USER_ID } from '../types/agents';
import { useCodeStore } from './useCodeStore';

const snapshotParticipant = (
  s: { agents: WorkflowAgent[]; configs: Record<string, WorkflowAgentConfig> },
  id: string,
): ParticipantSnapshot => {
  if (id === USER_ID) return { name: 'You' };
  const agent = s.agents.find((a) => a.id === id);
  const model = s.configs[id]?.model;
  return {
    name: agent?.name ?? id,
    type: agent?.type,
    color: agent?.color,
    providerId: model?.providerId ?? model?.provider_id,
    modelId: model?.modelId ?? model?.id,
  };
};

const getOrchestratorConversationId = (): string | null => {
  const s = useCodeStore.getState();
  const project = s.projects.find((p) => p.id === s.currentProjectId);
  const panel = project?.workspacePanels?.find(
    (p) => p.workflowAgentId === 'orchestrator' && p.sessionId === s.activeWorkspaceSessionId,
  );
  return panel?.agentConversationId ?? null;
};

export interface WorkflowAgentConfig {
  model: any | null;
  account: any | null;
}

export const EMPTY_AGENT_CONFIG: WorkflowAgentConfig = { model: null, account: null };

export interface WorkflowInboxItem {
  from: string;
  content: string;
}

interface WorkflowState {
  // Agent configurations (model + account)
  configs: Record<string, WorkflowAgentConfig>;
  // All created agents (orchestrator is always present)
  agents: WorkflowAgent[];
  // Messages exchanged between agents
  messages: WorkflowMessage[];

  // Config methods
  setModel: (agentId: string, model: any) => void;
  setAccount: (agentId: string, account: any) => void;

  // Agent methods
  addAgent: (agent: WorkflowAgent) => void;
  removeAgent: (agentId: string) => void;
  getAgent: (agentId: string) => WorkflowAgent | undefined;

  // Message methods
  addMessage: (message: Omit<WorkflowMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  /** Attach messages recorded before the Orchestrator conversation had an id to that conversation. */
  adoptOrphanMessages: (conversationId: string) => void;

  // Inbox (runtime-only): messages waiting to be delivered to an agent's Zen tab
  inbox: Record<string, WorkflowInboxItem[]>;
  enqueueInbox: (agentId: string, item: WorkflowInboxItem) => void;
  shiftInbox: (agentId: string) => void;
  /** Record a message in the workflow conversation and queue it for the target agent's Zen tab. */
  deliver: (from: string, to: string, content: string) => void;
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      configs: {},
      agents: [ORCHESTRATOR_AGENT],
      messages: [],

      setModel: (agentId, model) =>
        set((s) => ({
          configs: {
            ...s.configs,
            [agentId]: { ...(s.configs[agentId] ?? EMPTY_AGENT_CONFIG), model },
          },
        })),

      setAccount: (agentId, account) =>
        set((s) => ({
          configs: {
            ...s.configs,
            [agentId]: { ...(s.configs[agentId] ?? EMPTY_AGENT_CONFIG), account },
          },
        })),

      addAgent: (agent) =>
        set((s) => {
          const exists = s.agents.some((a) => a.id === agent.id);
          if (exists) return s;
          return { agents: [...s.agents, agent] };
        }),

      removeAgent: (agentId) =>
        set((s) => {
          const { [agentId]: _removedInbox, ...inbox } = s.inbox;
          return {
            agents: s.agents.filter((a) => a.id !== agentId),
            inbox,
          };
        }),

      getAgent: (agentId) => get().agents.find((a) => a.id === agentId),

      addMessage: (message) =>
        set((s) => ({
          messages: [
            ...s.messages,
            {
              ...message,
              conversationId: message.conversationId ?? getOrchestratorConversationId(),
              fromInfo: message.fromInfo ?? snapshotParticipant(s, message.from),
              toInfo: message.toInfo ?? snapshotParticipant(s, message.to),
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              timestamp: Date.now(),
            },
          ],
        })),

      clearMessages: () => set({ messages: [] }),

      adoptOrphanMessages: (conversationId) =>
        set((s) =>
          s.messages.some((m) => m.conversationId === null)
            ? {
                messages: s.messages.map((m) =>
                  m.conversationId === null ? { ...m, conversationId } : m,
                ),
              }
            : s,
        ),

      inbox: {},

      enqueueInbox: (agentId, item) =>
        set((s) => {
          return { inbox: { ...s.inbox, [agentId]: [...(s.inbox[agentId] ?? []), item] } };
        }),

      shiftInbox: (agentId) =>
        set((s) => {
          const rest = (s.inbox[agentId] ?? []).slice(1);
          return { inbox: { ...s.inbox, [agentId]: rest } };
        }),

      deliver: (from, to, content) => {
        const now = new Date();
        const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        get().addMessage({ from, to, content, time });
        get().enqueueInbox(to, { from, content });
      },
    }),
    {
      name: 'phantoma-agent-workflow',
      partialize: (s) =>
        ({
          configs: s.configs,
          agents: s.agents,
          messages: s.messages,
        }) as unknown as WorkflowState,
      merge: (persisted, current) => {
        const saved = (persisted as Partial<WorkflowState> | undefined) ?? {};
        const savedAgents = saved.agents ?? [];
        const agents = savedAgents.some((a) => a.id === ORCHESTRATOR_AGENT.id)
          ? savedAgents
          : [ORCHESTRATOR_AGENT, ...savedAgents];
        return {
          ...current,
          configs: saved.configs ?? current.configs,
          agents,
          messages: saved.messages ?? current.messages,
        };
      },
    },
  ),
);
