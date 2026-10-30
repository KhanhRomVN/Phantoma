import type { WorkflowAgentPromptConfig } from "../code/mode-config";
import { joinSections } from "../code/mode-config";
import { buildExecutorIdentity } from "./identity";
import { buildExecutorWorkflow } from "./workflow";
import { buildExecutorConstraints } from "./constraints";
import { buildExecutorSystemContext } from "./system-context";
import {
  EXECUTOR_TOOL_VALIDATION,
  EXECUTOR_TOOL_VALIDATION_JSON,
} from "./tool-validation";
import {
  EXECUTOR_TOOLS_REFERENCE,
  EXECUTOR_TOOLS_REFERENCE_JSON,
} from "./tools-reference";
import { buildExecutorExample } from "./example";

export { buildExecutorIdentity } from "./identity";
export { buildExecutorWorkflow, RESULT_FORMAT } from "./workflow";
export { buildExecutorConstraints } from "./constraints";
export { buildExecutorSystemContext } from "./system-context";
export type { SystemInfo } from "./system-context";
export {
  EXECUTOR_TOOL_VALIDATION,
  EXECUTOR_TOOL_VALIDATION_JSON,
} from "./tool-validation";
export {
  EXECUTOR_TOOLS_REFERENCE,
  EXECUTOR_TOOLS_REFERENCE_JSON,
} from "./tools-reference";
export { buildExecutorExample } from "./example";
export { buildAgentsMdSection } from "./agents-md";

export const buildExecutorPrompt = (
  config: WorkflowAgentPromptConfig,
): string => {
  const {
    language,
    systemInfo,
    toolFormat = "xml",
    mode = "balanced",
  } = config;
  const isJson = toolFormat === "json";

  return joinSections([
    isJson ? EXECUTOR_TOOL_VALIDATION_JSON : EXECUTOR_TOOL_VALIDATION,
    isJson ? EXECUTOR_TOOLS_REFERENCE_JSON : EXECUTOR_TOOLS_REFERENCE,
    buildExecutorExample(toolFormat),
    buildExecutorIdentity(language, mode, toolFormat),
    buildExecutorWorkflow(mode),
    buildExecutorConstraints(mode, language, toolFormat),
    buildExecutorSystemContext(systemInfo, mode),
  ]);
};