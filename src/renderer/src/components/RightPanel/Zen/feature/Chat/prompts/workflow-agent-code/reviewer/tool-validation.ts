import type { ToolFormat } from "../shared/types";
import { buildValidationSection } from "../shared/tool-catalog";
import { REVIEWER_TOOLS } from "./tools-reference";

export const buildReviewerToolValidation = (
  toolFormat: ToolFormat = "xml",
): string => buildValidationSection("reviewer", REVIEWER_TOOLS, toolFormat);