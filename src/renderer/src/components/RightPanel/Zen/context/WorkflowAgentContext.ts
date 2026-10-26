import { createContext, useContext, type ReactNode } from 'react';

const AGENT_MESSAGE_REGEX = /<agent-message from="([^"]+)">\n([\s\S]*?)\n<\/agent-message>/;

export const wrapAgentMessage = (from: string, content: string): string =>
  `<agent-message from="${from}">\n${content}\n</agent-message>`;

export const parseAgentMessage = (content: string): { from: string; body: string } | null => {
  const match = content.match(AGENT_MESSAGE_REGEX);
  return match ? { from: match[1], body: match[2] } : null;
};

export interface WorkflowAgentSync {
  agentId: string;
  agentType?: 'orchestrator' | 'planner' | 'executor' | 'reviewer';
  model: any;
  account: any;
  /** accountId -> các loại agent (orchestrator/planner/...) đang dùng account đó. */
  accountAgents?: Record<string, string[]>;
  setModel: (model: any) => void;
  setAccount: (account: any) => void;
  /** Messages sent to this agent via send_message, waiting to be delivered (oldest first). */
  inbox?: { from: string; content: string }[];
  /** Remove the oldest inbox item once it has been handed to the chat. */
  shiftInbox?: () => void;
  /** Called when the user types and sends a message in this Zen tab (mirrors it into the workflow conversation). */
  notifyUserMessage?: (content: string) => void;
  /** Lets the host module render a user-role message that came from another agent; return null for normal messages. */
  renderIncomingMessage?: (message: { id: string; content: string }) => ReactNode | null;
}

export const WorkflowAgentContext = createContext<WorkflowAgentSync | null>(null);

export const useWorkflowAgentSync = (): WorkflowAgentSync | null => useContext(WorkflowAgentContext);

export const AccountAgentsContext = createContext<Record<string, string[]> | undefined>(undefined);

export const useAccountAgents = (): Record<string, string[]> | undefined =>
  useContext(AccountAgentsContext);