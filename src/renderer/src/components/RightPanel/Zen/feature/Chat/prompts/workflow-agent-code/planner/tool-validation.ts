import type { ToolFormat } from "../shared/types";
import { buildValidationSection } from "../shared/tool-catalog";
import { PLANNER_TOOLS } from "./tools-reference";

export const buildPlannerToolValidation = (
  toolFormat: ToolFormat = "xml",
): string => buildValidationSection("planner", PLANNER_TOOLS, toolFormat);