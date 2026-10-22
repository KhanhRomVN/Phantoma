import type { ToolFormat } from "../shared/types";
import { buildValidationSection } from "../shared/tool-catalog";
import { EXECUTOR_TOOLS } from "./tools-reference";

export const buildExecutorToolValidation = (
  toolFormat: ToolFormat = "xml",
): string => buildValidationSection("executor", EXECUTOR_TOOLS, toolFormat);