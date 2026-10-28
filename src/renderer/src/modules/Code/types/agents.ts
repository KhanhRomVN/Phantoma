export type AgentId = string; // Dynamic agent IDs (snake_case from agent_name)

export const USER_ID = 'user';
export type ParticipantId = AgentId | typeof USER_ID;

export type AgentType =
  | 'orchestrator'
  | 'executor'
  | 'planner'
  | 'reviewer'
  | 'recon_planner'
  | 'recon_web'
  | 'recon_local'
  | 'recon_verifier'
  | 'recon_synthesizer';

export interface WorkflowAgent {
  id: AgentId;
  name: string;
  title: string;
  type: AgentType;
  /** Tints @mentions and the fallback avatar letter. */
  color: string;
}

/** Who a participant was when a message was recorded; keeps history readable after the agent or its Zen tab is gone. */
export interface ParticipantSnapshot {
  name: string;
  type?: AgentType;
  color?: string;
  providerId?: string;
  modelId?: string;
}

export interface WorkflowMessage {
  id: string;
  from: ParticipantId;
  to: ParticipantId;
  content: string;
  time: string;
  timestamp: number;
  /** Conversation of the Orchestrator Zen tab this message belongs to. */
  conversationId?: string | null;
  fromInfo?: ParticipantSnapshot;
  toInfo?: ParticipantSnapshot;
}

/** Zen tabs currently linked to a workflow agent, keyed by agent id. `title` is the Zen conversation title. */
export type WorkflowLinks = Record<string, { title: string | null }>;

// Default orchestrator agent
export const ORCHESTRATOR_AGENT: WorkflowAgent = {
  id: 'orchestrator',
  name: 'Orchestrator',
  title: 'Team coordinator',
  type: 'orchestrator',
  color: '#A78BFA',
};

// Agent type colors
export const AGENT_TYPE_COLORS: Record<AgentType, string> = {
  orchestrator: '#A78BFA', // purple
  executor: '#60A5FA',     // blue
  planner: '#34D399',      // green
  reviewer: '#F59E0B',     // amber
  recon_planner: '#22D3EE',     // cyan
  recon_web: '#38BDF8',         // sky
  recon_local: '#A3E635',       // lime
  recon_verifier: '#FB923C',    // orange
  recon_synthesizer: '#F472B6', // pink
};