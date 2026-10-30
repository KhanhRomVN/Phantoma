import type { WorkflowAgentPromptConfig } from "../code/mode-config";
import { joinSections } from "../code/mode-config";
import { buildTesterToolValidation } from "./tool-validation";
import { buildTesterToolsReference } from "./tools-reference";
import { buildTesterExample } from "./example";
import { buildTesterIdentity } from "./identity";
import { buildTesterWorkflow } from "./workflow";
import {
  buildTesterConstraints,
  buildTesterCoreConstraints,
} from "./constraints";
import { buildTesterSystemContext } from "./system-context";

export { buildTesterIdentity } from "./identity";
export { buildTesterWorkflow, TEST_REPORT_FORMAT } from "./workflow";
export {
  buildTesterConstraints,
  buildTesterCoreConstraints,
} from "./constraints";
export { buildTesterSystemContext } from "./system-context";
export { buildTesterToolValidation } from "./tool-validation";
export {
  TESTER_TOOLS,
  HANDOFF_TOOL,
  HANDOFF_AGENT,
  buildTesterToolsReference,
} from "./tools-reference";
export { buildTesterExample } from "./example";

export const buildTesterPrompt = (
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

  const tools = buildTesterToolsReference(toolFormat);
  const identity = buildTesterIdentity(language);
  const workflow = buildTesterWorkflow(mode);
  const context = buildTesterSystemContext(systemInfo);

  if (promptLengthMode === "short") {
    return joinSections([
      tools,
      identity,
      workflow,
      buildTesterCoreConstraints(),
      context,
    ]);
  }

  const validation = buildTesterToolValidation(toolFormat);
  const constraints = buildTesterConstraints(toolFormat);

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
    buildTesterExample(toolFormat),
    identity,
    workflow,
    constraints,
    context,
  ]);
};