import type { WorkflowAgentPromptConfig } from "../shared/types";
import { joinSections } from "../shared/types";
import { buildHandoffProtocol } from "../shared/handoff";
import { buildExecutorToolValidation } from "./tool-validation";
import { buildExecutorToolsReference } from "./tools-reference";
import { buildExecutorExample } from "./example";
import { buildExecutorIdentity } from "./identity";
import { buildExecutorWorkflow } from "./workflow";
import { buildExecutorConstraints } from "./constraints";
import { buildExecutorSystemContext } from "./system-context";

export { buildExecutorIdentity } from "./identity";
export { buildExecutorWorkflow, RESULT_FORMAT } from "./workflow";
export { buildExecutorConstraints } from "./constraints";
export { buildExecutorSystemContext } from "./system-context";
export { buildExecutorToolValidation } from "./tool-validation";
export {
  EXECUTOR_TOOLS,
  buildExecutorToolsReference,
} from "./tools-reference";
export { buildExecutorExample } from "./example";

export const buildExecutorPrompt = (
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

  const tools = buildExecutorToolsReference(toolFormat);
  const identity = buildExecutorIdentity(language);
  const handoff = buildHandoffProtocol(toolFormat);
  const workflow = buildExecutorWorkflow(mode);
  const context = buildExecutorSystemContext(systemInfo, mode);

  if (promptLengthMode === "short") {
    return joinSections([tools, identity, handoff, workflow, context]);
  }

  const validation = buildExecutorToolValidation(toolFormat);
  const constraints = buildExecutorConstraints(mode, language, toolFormat);

  if (promptLengthMode === "medium") {
    return joinSections([
      validation,
      tools,
      identity,
      handoff,
      workflow,
      constraints,
      context,
    ]);
  }

  return joinSections([
    validation,
    tools,
    buildExecutorExample(toolFormat),
    identity,
    handoff,
    workflow,
    constraints,
    context,
  ]);
};