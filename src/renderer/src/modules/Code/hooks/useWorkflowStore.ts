import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorkflowAgent, WorkflowMessage } from '../types/agents';
import { ORCHESTRATOR_AGENT } from '../types/agents';

export interface WorkflowAgentConfig {
  model: any | null;
  account: any | null;
}

export const EMPTY_AGENT_CONFIG: WorkflowAgentConfig = { model: null, account: null };

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
        set((s) => ({
          agents: s.agents.filter((a) => a.id !== agentId),
        })),
        
      getAgent: (agentId) => get().agents.find((a) => a.id === agentId),
      
      addMessage: (message) =>
        set((s) => ({
          messages: [
            ...s.messages,
            {
              ...message,
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              timestamp: Date.now(),
            },
          ],
        })),
        
      clearMessages: () => set({ messages: [] }),
    }),
    { name: 'phantoma-agent-workflow' },
  ),
);