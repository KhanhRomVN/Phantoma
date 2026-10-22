import type { WorkflowAgentPromptConfig } from "../shared/types";
import { joinSections } from "../shared/types";
import { buildHandoffProtocol } from "../shared/handoff";
import { buildOrchestratorToolValidation } from "./tool-validation";
import { buildOrchestratorToolsReference } from "./tools-reference";
import { buildOrchestratorExample } from "./example";
import { buildOrchestratorIdentity } from "./identity";
import { buildOrchestratorWorkflow } from "./workflow";
import { buildOrchestratorProviderGuide } from "./providers";
import { buildOrchestratorConstraints } from "./constraints";
import { buildOrchestratorSystemContext } from "./system-context";

export { buildOrchestratorIdentity } from "./identity";
export { buildOrchestratorWorkflow, MAX_REWORK_ROUNDS } from "./workflow";
export { buildOrchestratorConstraints } from "./constraints";
export { buildOrchestratorSystemContext } from "./system-context";
export { buildOrchestratorToolValidation } from "./tool-validation";
export {
  ORCHESTRATOR_TOOLS,
  buildOrchestratorToolsReference,
} from "./tools-reference";
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
  const handoff = buildHandoffProtocol(toolFormat);
  const workflow = buildOrchestratorWorkflow(mode, toolFormat);
  const context = buildOrchestratorSystemContext(systemInfo);

  if (promptLengthMode === "short") {
    return joinSections([
      tools,
      identity,
      handoff,
      workflow,
      buildOrchestratorProviderGuide(),
      context,
    ]);
  }

  const validation = buildOrchestratorToolValidation(toolFormat);
  const constraints = buildOrchestratorConstraints(mode, language, toolFormat);

  if (promptLengthMode === "medium") {
    return joinSections([
      validation,
      tools,
      identity,
      handoff,
      workflow,
      buildOrchestratorProviderGuide(),
      constraints,
      context,
    ]);
  }

  return joinSections([
    validation,
    tools,
    buildOrchestratorExample(toolFormat),
    identity,
    handoff,
    workflow,
    buildOrchestratorProviderGuide(),
    constraints,
    context,
  ]);
};