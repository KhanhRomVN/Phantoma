import type {
  WorkflowAgentRole,
  WorkflowAgentPromptConfig,
} from "./shared/types";
import { buildOrchestratorPrompt } from "./orchestrator";
import { buildPlannerPrompt } from "./planner";
import { buildExecutorPrompt } from "./executor";
import { buildReviewerPrompt } from "./reviewer";

export { buildOrchestratorPrompt } from "./orchestrator";
export { buildPlannerPrompt } from "./planner";
export { buildExecutorPrompt } from "./executor";
export { buildReviewerPrompt } from "./reviewer";
export { buildHandoffProtocol } from "./shared/handoff";
export type {
  ToolFormat,
  WorkflowAgentRole,
  WorkflowAgentPromptConfig,
} from "./shared/types";

const ROLE_BUILDERS: Record<
  WorkflowAgentRole,
  (config: WorkflowAgentPromptConfig) => string
> = {
  orchestrator: buildOrchestratorPrompt,
  planner: buildPlannerPrompt,
  executor: buildExecutorPrompt,
  reviewer: buildReviewerPrompt,
};

export const WORKFLOW_AGENT_ROLES = Object.keys(
  ROLE_BUILDERS,
) as WorkflowAgentRole[];

export const buildWorkflowAgentPrompt = (
  role: WorkflowAgentRole,
  config: WorkflowAgentPromptConfig,
): string => ROLE_BUILDERS[role](config);