import type { WorkflowAgentPromptConfig } from "../code/mode-config";
import { joinSections } from "../code/mode-config";
import { buildOrchestratorToolValidation } from "./tool-validation";
import { buildOrchestratorToolsReference } from "./tools-reference";
import { buildOrchestratorExample } from "./example";
import { buildOrchestratorIdentity } from "./identity";
import { buildOrchestratorWorkflow } from "./workflow";
import {
  buildOrchestratorConstraints,
  buildOrchestratorCoreConstraints,
} from "./constraints";
import { buildOrchestratorSystemContext } from "./system-context";

export { buildOrchestratorIdentity } from "./identity";
export {
  buildOrchestratorWorkflow,
  MAX_REWORK_ROUNDS,
  MESSAGE_FORMAT,
} from "./workflow";
export {
  buildOrchestratorConstraints,
  buildOrchestratorCoreConstraints,
} from "./constraints";
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

  const identity = buildOrchestratorIdentity(language, toolFormat);
  const workflow = buildOrchestratorWorkflow(mode);
  const tools = buildOrchestratorToolsReference(toolFormat);
  const context = buildOrchestratorSystemContext(systemInfo);

  if (promptLengthMode === "short") {
    return joinSections([
      identity,
      workflow,
      tools,
      buildOrchestratorCoreConstraints(language, toolFormat),
      context,
    ]);
  }

  const validation = buildOrchestratorToolValidation(toolFormat);
  const constraints = buildOrchestratorConstraints(mode, language, toolFormat);

  if (promptLengthMode === "medium") {
    return joinSections([
      identity,
      workflow,
      validation,
      tools,
      constraints,
      context,
    ]);
  }

  return joinSections([
    identity,
    workflow,
    validation,
    tools,
    buildOrchestratorExample(toolFormat, mode),
    constraints,
    context,
  ]);
};