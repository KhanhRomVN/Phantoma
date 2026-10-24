import type { WorkflowAgentPromptConfig } from "../code/mode-config";
import { joinSections } from "../code/mode-config";
import { buildOrchestratorToolValidation } from "./tool-validation";
import { buildOrchestratorToolsReference } from "./tools-reference";
import { buildOrchestratorExample } from "./example";
import { buildOrchestratorIdentity } from "./identity";
import { buildOrchestratorWorkflow } from "./workflow";
import { buildOrchestratorConstraints } from "./constraints";
import { buildOrchestratorSystemContext } from "./system-context";

export { buildOrchestratorIdentity } from "./identity";
export {
  buildOrchestratorWorkflow,
  MAX_REWORK_ROUNDS,
  MESSAGE_FORMAT,
} from "./workflow";
export { buildOrchestratorConstraints } from "./constraints";
export { buildOrchestratorSystemContext } from "./system-context";
export { buildOrchestratorToolValidation } from "./tool-validation";
export {
  ORCHESTRATOR_TOOLS,
  SUB_AGENT_IDS,
  buildOrchestratorToolsReference,
} from "./tools-reference";
export type { OrchestratorToolName } from "./tools-reference";
export { buildOrchestratorExample } from "./example";

export const buildOrchestratorPrompt = (
  config: WorkflowAgentPromptConfig,
): string => {
  const {
    language,
    systemInfo,
    promptLengthMode = "long",
    toolFormat = "xml",
    mode = "balanced",
  } = config;

  if (promptLengthMode === "none") {
    return "";
  }

  const tools = buildOrchestratorToolsReference(toolFormat);
  const identity = buildOrchestratorIdentity(language, toolFormat);
  const workflow = buildOrchestratorWorkflow(mode);
  const context = buildOrchestratorSystemContext(systemInfo);

  if (promptLengthMode === "short") {
    return joinSections([tools, identity, workflow, context]);
  }

  const validation = buildOrchestratorToolValidation(toolFormat);
  const constraints = buildOrchestratorConstraints(mode, language, toolFormat);

  if (promptLengthMode === "medium") {
    return joinSections([
      validation,
      tools,
      identity,
      workflow,
      constraints,
      context,
    ]);
  }

  return joinSections([
    validation,
    tools,
    buildOrchestratorExample(toolFormat),
    identity,
    workflow,
    constraints,
    context,
  ]);
};