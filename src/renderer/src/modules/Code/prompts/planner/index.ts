import type { WorkflowAgentPromptConfig } from "../code/mode-config";
import { joinSections } from "../code/mode-config";
import { buildPlannerToolValidation } from "./tool-validation";
import { buildPlannerToolsReference } from "./tools-reference";
import { buildPlannerExample } from "./example";
import { buildPlannerIdentity } from "./identity";
import { buildPlannerWorkflow } from "./workflow";
import { buildPlannerConstraints } from "./constraints";
import { buildPlannerSystemContext } from "./system-context";

export { buildPlannerIdentity } from "./identity";
export { buildPlannerWorkflow, PLAN_FORMAT } from "./workflow";
export { buildPlannerConstraints } from "./constraints";
export { buildPlannerSystemContext } from "./system-context";
export { buildPlannerToolValidation } from "./tool-validation";
export { PLANNER_TOOLS, buildPlannerToolsReference } from "./tools-reference";
export { buildPlannerExample } from "./example";

export const buildPlannerPrompt = (config: WorkflowAgentPromptConfig): string => {
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

  const tools = buildPlannerToolsReference(toolFormat);
  const identity = buildPlannerIdentity(language, toolFormat);
  const workflow = buildPlannerWorkflow(mode);
  const context = buildPlannerSystemContext(systemInfo);

  if (promptLengthMode === "short") {
    return joinSections([tools, identity, workflow, context]);
  }

  const validation = buildPlannerToolValidation(toolFormat);
  const constraints = buildPlannerConstraints(mode, language, toolFormat);

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
    buildPlannerExample(toolFormat),
    identity,
    workflow,
    constraints,
    context,
  ]);
};