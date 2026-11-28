/**
 * ------------------------------------------------------------------
 * Workflow Store
 * ------------------------------------------------------------------
 * Zustand store (có persist) quản lý workflow đa agent: cấu hình model/account
 * cho từng agent, danh sách agent, tin nhắn giữa các agent và inbox runtime
 * để chuyển tin nhắn vào tab Zen của agent đích.
 *
 * Main types:
 * - WorkflowAgentConfig : Cấu hình model + account của một agent
 * - WorkflowInboxItem   : Tin nhắn đang chờ giao cho agent
 *
 * Main constants:
 * - EMPTY_AGENT_CONFIG  : Cấu hình agent rỗng mặc định
 *
 * Main actions:
 * - setModel() / setAccount()  : Cập nhật cấu hình agent
 * - addAgent() / removeAgent() : Thêm/xóa agent
 * - addMessage()               : Ghi tin nhắn kèm snapshot người gửi/nhận
 * - adoptOrphanMessages()      : Gắn tin nhắn mồ côi vào conversation của Orchestrator
 * - enqueueInbox() / shiftInbox() : Quản lý hàng đợi inbox
 * - deliver()                  : Ghi tin nhắn và đẩy vào inbox agent đích
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Stores ──
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCodeStore } from '../../shared/stores/code.store';

// ── Types ──
import type { ParticipantSnapshot, WorkflowAgent, WorkflowMessage } from '../../shared/types/agents.types';
import { ORCHESTRATOR_AGENT, USER_ID } from '../../shared/types/agents.types';

// ─── Functions ───────────────────────────────────────────────────────────────
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

export const isAgentInCurrentWorkflow = (agent: WorkflowAgent): boolean => {
  if (agent.id === ORCHESTRATOR_AGENT.id) return true;
  const convId = getOrchestratorConversationId();
  return !agent.conversationId || !convId || agent.conversationId === convId;
};

export const getOrchestratorConversationId = (): string | null => {
  const s = useCodeStore.getState();
  const project = s.projects.find((p) => p.id === s.currentProjectId);
  const panel = project?.workspacePanels?.find(
    (p) => p.workflowAgentId === 'orchestrator' && p.sessionId === s.activeWorkspaceSessionId,
  );
  return panel?.agentConversationId ?? null;
};

// ─── Types ───────────────────────────────────────────────────────────────────
export interface WorkflowAgentConfig {
  model: any | null;
  account: any | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────
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

// ─── Store ───────────────────────────────────────────────────────────────────
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
          const conversationId = agent.conversationId ?? getOrchestratorConversationId();
          return { agents: [...s.agents, { ...agent, conversationId }] };
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
          s.messages.some((m) => m.conversationId === null) ||
          s.agents.some((a) => a.conversationId === null)
            ? {
                messages: s.messages.map((m) =>
                  m.conversationId === null ? { ...m, conversationId } : m,
                ),
                agents: s.agents.map((a) =>
                  a.conversationId === null ? { ...a, conversationId } : a,
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
