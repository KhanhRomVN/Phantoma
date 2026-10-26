import type { WorkflowAgentPromptConfig } from "../code/mode-config";
import { joinSections } from "../code/mode-config";
import { buildPlannerToolValidation } from "./tool-validation";
import { buildPlannerToolsReference } from "./tools-reference";
import { buildPlannerExample } from "./example";
import { buildPlannerIdentity } from "./identity";
import { buildPlannerWorkflow } from "./workflow";
import {
  buildPlannerConstraints,
  buildPlannerCoreRules,
} from "./constraints";
import { buildPlannerSystemContext } from "./system-context";
import { buildPlannerMessaging } from "./messaging";

export { buildPlannerIdentity } from "./identity";
export { buildPlannerWorkflow, PLAN_FORMAT } from "./workflow";
export {
  buildPlannerConstraints,
  buildPlannerCoreRules,
} from "./constraints";
export { buildPlannerSystemContext } from "./system-context";
export { buildPlannerToolValidation } from "./tool-validation";
export { PLANNER_TOOLS, buildPlannerToolsReference } from "./tools-reference";
export { buildPlannerExample } from "./example";
export { buildPlannerMessaging } from "./messaging";

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
    return joinSections([
      identity,
      buildPlannerCoreRules(language),
      workflow,
      tools,
      context,
    ]);
  }

  const validation = buildPlannerToolValidation(toolFormat);
  const constraints = buildPlannerConstraints(mode, language, toolFormat);
  const messaging = buildPlannerMessaging(toolFormat);

  if (promptLengthMode === "medium") {
    return joinSections([
      identity,
      workflow,
      constraints,
      messaging,
      validation,
      tools,
      context,
    ]);
  }

  return joinSections([
    identity,
    workflow,
    constraints,
    messaging,
    validation,
    tools,
    buildPlannerExample(toolFormat),
    context,
  ]);
};