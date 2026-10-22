import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WorkflowAgentConfig {
  model: any | null;
  account: any | null;
}

export const EMPTY_AGENT_CONFIG: WorkflowAgentConfig = { model: null, account: null };

interface WorkflowState {
  configs: Record<string, WorkflowAgentConfig>;
  setModel: (agentId: string, model: any) => void;
  setAccount: (agentId: string, account: any) => void;
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set) => ({
      configs: {},
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
    }),
    { name: 'phantoma-agent-workflow' },
  ),
);