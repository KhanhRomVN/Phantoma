import type { WorkflowAgentId } from '../types/workflow_agent.types';

export const CODE_WORKFLOW_AGENT_IDS: WorkflowAgentId[] = [
  'orchestrator',
  'planner',
  'executor',
  'reviewer',
  'tester',
];

export const RECON_WORKFLOW_AGENT_IDS: WorkflowAgentId[] = [
  'recon_planner',
  'recon_web',
  'recon_local',
  'recon_verifier',
  'recon_synthesizer',
];