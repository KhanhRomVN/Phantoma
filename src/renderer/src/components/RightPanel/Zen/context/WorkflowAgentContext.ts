import { createContext, useContext } from 'react';

export interface WorkflowAgentSync {
  agentId: string;
  model: any;
  account: any;
  setModel: (model: any) => void;
  setAccount: (account: any) => void;
}

export const WorkflowAgentContext = createContext<WorkflowAgentSync | null>(null);

export const useWorkflowAgentSync = (): WorkflowAgentSync | null => useContext(WorkflowAgentContext);