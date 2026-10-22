export type AgentId = 'orchestrator';

export const USER_ID = 'user';
export type ParticipantId = AgentId | typeof USER_ID;

export interface WorkflowAgent {
  id: AgentId;
  name: string;
  title: string;
  /** Tints @mentions and the fallback avatar letter. */
  color: string;
}

export interface WorkflowMessage {
  id: string;
  from: ParticipantId;
  to: ParticipantId;
  content: string;
  time: string;
}

/** Zen tabs currently linked to a workflow agent, keyed by agent id. `title` is the Zen conversation title. */
export type WorkflowLinks = Record<string, { title: string | null }>;

export const WORKFLOW_AGENTS: WorkflowAgent[] = [
  {
    id: 'orchestrator',
    name: 'Orchestrator',
    title: 'Team coordinator',
    color: '#A78BFA',
  },
];

export const getWorkflowAgent = (id: string): WorkflowAgent | undefined =>
  WORKFLOW_AGENTS.find((a) => a.id === id);