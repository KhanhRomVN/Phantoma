import type { WorkflowAgentPromptConfig } from "../code/mode-config";
import { joinSections } from "../code/mode-config";
import { buildReviewerToolValidation } from "./tool-validation";
import { buildReviewerToolsReference } from "./tools-reference";
import { buildReviewerExample } from "./example";
import { buildReviewerIdentity } from "./identity";
import { buildReviewerWorkflow } from "./workflow";
import {
  buildReviewerConstraints,
  buildReviewerCoreConstraints,
} from "./constraints";
import { buildReviewerSystemContext } from "./system-context";

export { buildReviewerIdentity } from "./identity";
export { buildReviewerWorkflow, REVIEW_FORMAT } from "./workflow";
export { buildReviewerConstraints } from "./constraints";
export { buildReviewerSystemContext } from "./system-context";
export { buildReviewerToolValidation } from "./tool-validation";
export {
  REVIEWER_TOOLS,
  HANDOFF_TOOL,
  HANDOFF_AGENT,
  buildReviewerToolsReference,
} from "./tools-reference";
export { buildReviewerExample } from "./example";

export const buildReviewerPrompt = (
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

  const tools = buildReviewerToolsReference(toolFormat);
  const identity = buildReviewerIdentity(language);
  const workflow = buildReviewerWorkflow(mode);
  const context = buildReviewerSystemContext(systemInfo);

  if (promptLengthMode === "short") {
    return joinSections([
      tools,
      identity,
      workflow,
      buildReviewerCoreConstraints(),
      context,
    ]);
  }

  const validation = buildReviewerToolValidation(toolFormat);
  const constraints = buildReviewerConstraints(toolFormat);

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
    buildReviewerExample(toolFormat),
    identity,
    workflow,
    constraints,
    context,
  ]);
};